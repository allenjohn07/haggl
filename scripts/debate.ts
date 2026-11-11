// Runs one full debate in-process (no HTTP) and checks the rules.
//   npx tsx scripts/debate.ts [query] [--fast]
// AI_MODE=live uses Claude (needs ANTHROPIC_API_KEY); default is mock. --fast skips the pacing delays.
import { searchProducts } from "@/lib/channel3";
import { bestOffer, getOffer } from "@/lib/products";
import { runDebate } from "@/lib/debate/run";
import { answerAsk, createDebate } from "@/lib/debate/store";

const args = process.argv.slice(2);
const fast = args.includes("--fast");
const query = args.filter((a) => a !== "--fast").join(" ") || "noise cancelling headphones";

async function main() {
  const products = await searchProducts(query);
  const product = products[0];
  if (!product) throw new Error(`no products for "${query}"`);
  const picked = bestOffer(product);
  console.log(`query "${query}" -> ${product.title} at $${picked.price} (${picked.merchant}), AI_MODE=${process.env.AI_MODE ?? "mock"}\n`);

  const debate = createDebate(product.id, picked.offerId);
  const failures: string[] = [];
  let messages = 0;
  let asks = 0;
  const amounts: { text: string; at: number }[] = [];
  const allowed: number[] = [picked.price];
  let verdictOk = false;
  const openers = new Set<string>();

  for await (const e of runDebate(debate, product, picked, { signal: new AbortController().signal, pace: fast ? 0 : 1 })) {
    if (e.event === "ping") continue;
    console.log(`${e.event.padEnd(8)} ${JSON.stringify(e.data)}`);
    if (e.event === "evidence") allowed.push(...e.data.items.map((i) => i.price).filter((p): p is number => p !== undefined));
    if (e.event === "message") {
      messages++;
      amounts.push({ text: `${e.data.text} ${e.data.reaction ?? ""}`, at: messages });
      if (e.data.text.length > 200) failures.push(`message ${messages} is ${e.data.text.length} chars (max 200)`);
      const first = e.data.reaction?.toLowerCase().match(/[a-z]+/)?.[0];
      if (first && openers.has(first)) failures.push(`message ${messages} reaction starts like an earlier one ("${first}")`);
      if (first) openers.add(first);
    }
    if (e.event === "ask") {
      asks++;
      const { askId, options, question } = e.data;
      if (question.length > 70 || options.some((o) => o.length > 24)) failures.push(`ask ${asks} is too long`);
      setTimeout(() => answerAsk(debate.debateId, askId, options[0]), fast ? 50 : 800);
    }
    if (e.event === "answer" && e.data.answer) allowed.push(...[...e.data.answer.matchAll(/\$(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])));
    if (e.event === "verdict") {
      const offer = getOffer(e.data.productId, e.data.offerId);
      verdictOk = !!offer && offer.price === e.data.price;
      if (!verdictOk) failures.push("verdict price does not match the stored offer");
      if (e.data.headline.length > 50 || e.data.reasons.some((r) => r.length > 80)) failures.push("verdict headline or a reason is too long");
    }
  }

  // Same rule as lib/debate/rules: an amount must be within $1 of a known price or a gap from the pick.
  // Cost per use at the picked price (daily and weekly for a year) is given to the advisors as a fact.
  const perUse = [picked.price / 365, picked.price / 52].map((x) => Math.round(x * 100) / 100);
  const known = [...allowed, ...allowed.map((p) => Math.abs(picked.price - p)), ...perUse];
  for (const m of amounts) {
    for (const [, n] of m.text.matchAll(/\$\s?(\d[\d,]*(?:\.\d{1,2})?)/g)) {
      const v = Number(n.replace(/,/g, ""));
      if (!known.some((k) => Math.abs(k - v) <= 1)) failures.push(`message ${m.at} has an unbacked $${v}`);
    }
  }
  if (messages > 8) failures.push(`${messages} messages (max 8)`);
  if (asks < 2) failures.push(`${asks} asks (need 2)`);
  if (!verdictOk && !failures.length) failures.push("no verdict");

  console.log(`\n${messages} messages, ${asks} asks, verdict ${verdictOk ? "ok" : "MISSING/BAD"}`);
  if (failures.length) {
    console.error(`FAIL\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
