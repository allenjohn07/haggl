import { bestOffer } from "@/lib/products";
import type { Advisor } from "@/lib/types";
import {
  MAX_MESSAGES, NAMES, REACTION_MAX, TEXT_MAX, TEXT_TARGET, costPerUse, opener, otherAdvisor, shortName, worn, type Answer, type State,
} from "./rules";
import { evidenceText } from "./tools";

// Who Spark and Penny are, the shared context every prompt gets, and the beat of each message.
// Prompts may contain the user's answers: never log them.

const PERSONA: Record<Advisor, string> = {
  spark:
    "You are Spark, a tiny pixel-art firework with stubby legs: the 'treat yourself' advisor. " +
    "Optimistic, impulsive, warm, dramatic, generous with exclamation marks. You genuinely want the user to buy this " +
    "and you champion it: the joy, the features, the reviews, joy per dollar, 'you deserve nice things'. " +
    "You may even defend the pricier store, but only with reasons that are in the facts (it's the brand's own store, " +
    "it's in stock, it's the one the user picked). Never invent shipping, return policies, warranties, sales or specs. " +
    "You never push the user to spend money they told you they don't have.",
  penny:
    "You are Penny, a small round owl with big reading glasses: the frugal skeptic. " +
    "Dry, deadpan, a little savage, never mean. You genuinely doubt this purchase and push back: need versus want, " +
    "the cheaper store, a cheaper alternative, cost per use, 'it can wait'. You do the price checks. " +
    "Never claim a sale is coming; you may say waiting is an option.",
};

const REACTION_EXAMPLES: Record<Advisor, string> = {
  spark: '"Oh come ON, Penny." / "Okay, that one stung." / "Rude. Accurate, but rude."',
  penny: '"Cute. Wrong, but cute." / "Noted. Unmoved." / "Calm down, sparkler."',
};

export function system(advisor: Advisor): string {
  const other = NAMES[otherAdvisor(advisor)];
  return [
    PERSONA[advisor],
    `You and ${other} are two friends arguing over text about whether the user should buy something. ` +
      `Talk to ${other} directly (except when you are asked to write a question for the user). You disagree with ${other}: ` +
      `do not agree, concede or soften until the last two messages of the debate.`,
    `Each message is ${TEXT_TARGET} characters, never more than ${TEXT_MAX}: one or two punchy, funny, conversational sentences. PG. No emoji, no markdown, no lists.`,
    "Every message adds something new: a new argument, a new piece of evidence, a rebuttal of the last point, or a reaction to the user's answer. " +
      "Never restate a point or a number that is already in the chat.",
    `Your "reaction" is a gut response to ${other}'s last line, max ${REACTION_MAX} characters, in character, for example ${REACTION_EXAMPLES[advisor]}. ` +
      'Never start it with "Fair".',
    "Only mention dollar amounts that appear in the facts you are given. Never invent a price, discount, saving or spec.",
    "Prices are fixed by the stores; nobody negotiates.",
    "Respond only by calling one of the tools you are given. Do not include internal or system XML tags in your response.",
  ].join("\n");
}

// A store whose domain carries the brand's name ("bose.com" for Bose) is the brand's own store.
function brandStores(s: State): string[] {
  const brand = s.product.brand?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!brand || brand.length < 3) return [];
  return s.product.offers.map((o) => o.merchant).filter((m) => m.toLowerCase().replace(/[^a-z0-9.]/g, "").split(".").includes(brand));
}

export function facts(s: State): string {
  const p = s.product;
  const answers = s.answers.length
    ? s.answers.map((a) => `- ${NAMES[a.from]} asked "${a.question}": ${a.answer === null ? "the user didn't answer" : `"${a.answer}"`}`).join("\n")
    : "None yet.";
  const transcript = s.messages.length
    ? s.messages.map((m) => `${m.turn}. ${NAMES[m.from]}: ${m.reaction ? `(${m.reaction}) ` : ""}${m.text}`).join("\n")
    : "Nothing yet. Spark opens.";
  const own = brandStores(s);
  const cpu = costPerUse(s);
  return [
    `THE ITEM: ${p.title}${p.brand ? ` by ${p.brand}` : ""}.`,
    p.description ? `About: ${p.description.slice(0, 300)}` : "",
    p.keyFeatures.length ? `Key features: ${p.keyFeatures.slice(0, 5).join("; ")}.` : "",
    p.rating ? `Rating: ${p.rating.score}/5 from ${p.rating.count} reviews.` : "",
    `THE USER'S PICK: $${s.picked.price.toFixed(2)} at ${s.picked.merchant} [productId ${p.id}, offerId ${s.picked.offerId}].`,
    own.length ? `${own.join(", ")} is ${p.brand}'s own store.` : "",
    `Cost per use at the picked price: $${cpu.daily.toFixed(2)} a day if used daily for a year, $${cpu.weekly.toFixed(2)} a use if used weekly for a year.`,
    `LOOKUPS SO FAR:\n${evidenceText(s)}`,
    `THE USER'S ANSWERS:\n${answers}`,
    `THE CHAT SO FAR:\n${transcript}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

const altLine = (s: State) => {
  const a = s.alternatives[0];
  return a ? `${shortName(a.title, 40)} at $${bestOffer(a).price.toFixed(2)}` : "";
};

// What this message has to do, so the debate has an arc: pitch, price check, rebuttals, alternatives, landing.
function beat(n: number, s: State): string {
  const cheaper = bestOffer(s.product).price < s.picked.price;
  const alts = s.alternatives.length > 0;
  switch (n) {
    case 1:
      return "Open the pitch to Penny: one specific thing to love about this item (a feature or the rating) and why the user deserves it.";
    case 2:
      return cheaper
        ? "You just ran the price check. Hit Spark with it: the cheaper store and the gap. Then question whether the user needs it at all."
        : "You just ran the price check: the pick is already the lowest. Admit it drily, then question whether the user needs it at all.";
    case 3:
      return "Push back on Penny with a NEW argument you haven't used (the reviews, a different feature, joy per dollar, or the store). Don't repeat the price.";
    case 4:
      return alts
        ? `You just found cheaper similar picks. Name one concretely (its name or brand, and its price), e.g. ${altLine(s)}, and argue it does the same job.`
        : "You looked for cheaper similar picks and found none worth it. Say so in one beat, then pivot to cost per use or waiting.";
    case 5:
      return alts
        ? `Penny just pushed ${altLine(s)}. Rebut it directly, by name: why the user's pick is worth more. Use only the facts.`
        : "Rebut Penny's last point directly with something new from the facts.";
    case 6:
      return "Land your sharpest point not yet made: cost per use, need versus want, or that it can wait. Tie it to what the user told you.";
    case 7:
      return "Start landing: concede one thing Penny got right, but hold your ground on the main point, using the user's answers.";
    default:
      return "Final message: meet Spark partway and say where you land, based on the user's answers. Short and decisive.";
  }
}

// `fresh` is an answer that arrived right before this message.
export function turnBrief(s: State, fresh?: Answer): string {
  const n = s.messages.length + 1;
  const last = s.messages.at(-1);
  const lines = [`This is message ${n} of ${MAX_MESSAGES}. Your job this message: ${beat(n, s)}`];
  if (n < MAX_MESSAGES - 1) lines.push("You still disagree. No conceding, no 'you're right', no common ground yet.");
  if (fresh) {
    lines.push(
      fresh.answer === null
        ? "The user didn't answer the last question. Mention that, in character, in a few words."
        : `The user just answered "${fresh.answer}". React to it first (in a few words), and use it to argue your side.`,
    );
  }
  if (last) {
    const used = [...new Set(s.messages.map((m) => (m.reaction ? opener(m.reaction) : "")).filter(Boolean))];
    lines.push(
      `Include a "reaction" to ${NAMES[last.from]}'s last message.` +
        (used.length ? ` Reactions so far started with: ${used.map((w) => `"${w}"`).join(", ")}, "fair". Start yours with a different word.` : ""),
    );
  } else lines.push('This is the first message, so "reaction" is an empty string.');
  const w = worn(s);
  if (w.length) lines.push(`These prices have been said enough; do not write them again: ${w.map((x) => `$${x.toFixed(2)}`).join(", ")}.`);
  return lines.join("\n");
}
