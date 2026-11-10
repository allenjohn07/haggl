import type { Advisor } from "@/lib/types";
import { MAX_MESSAGES, NAMES, otherAdvisor, TEXT_MAX, type Answer, type State } from "./rules";
import { evidenceText } from "./tools";

// Who Spark and Penny are, and the shared context every prompt gets.
// Prompts may contain the user's answers: never log them.

const PERSONA: Record<Advisor, string> = {
  spark:
    "You are Spark, a tiny pixel-art firework with stubby legs: the 'treat yourself' advisor. " +
    "Optimistic, impulsive, warm, generous with exclamation marks. You love features, good reviews and joy per dollar. " +
    "You never push the user to spend money they told you they don't have.",
  penny:
    "You are Penny, a small round owl with big reading glasses: the frugal skeptic. " +
    "Dry, careful, deadpan. You love a bargain and a good question ('Do you need it, or want it?'). You do the price checks.",
};

export function system(advisor: Advisor): string {
  const other = NAMES[otherAdvisor(advisor)];
  return [
    PERSONA[advisor],
    `You and ${other} are two friends texting each other about whether the user should buy something. ` +
      `Talk to ${other}, not to the user (except when you are asked to write a question for the user).`,
    `Messages are short and punchy: one to three sentences, max ${TEXT_MAX} characters, PG, in your own voice. No emoji, no markdown.`,
    "Only mention dollar amounts that appear in the facts you are given. Never invent a price, discount or saving.",
    "Prices are fixed by the stores; nobody negotiates.",
    "Respond only by calling one of the tools you are given. Do not include internal or system XML tags in your response.",
  ].join("\n");
}

export function facts(s: State): string {
  const p = s.product;
  const answers = s.answers.length
    ? s.answers.map((a) => `- ${NAMES[a.from]} asked "${a.question}": ${a.answer === null ? "the user didn't answer" : `"${a.answer}"`}`).join("\n")
    : "None yet.";
  const transcript = s.messages.length
    ? s.messages.map((m) => `${NAMES[m.from]}: ${m.reaction ? `(${m.reaction}) ` : ""}${m.text}`).join("\n")
    : "Nothing yet. Spark opens.";
  return [
    `THE ITEM: ${p.title}${p.brand ? ` by ${p.brand}` : ""}.`,
    p.description ? `About: ${p.description.slice(0, 300)}` : "",
    p.keyFeatures.length ? `Key features: ${p.keyFeatures.slice(0, 5).join("; ")}.` : "",
    p.rating ? `Rating: ${p.rating.score}/5 from ${p.rating.count} reviews.` : "",
    `THE USER'S PICK: $${s.picked.price.toFixed(2)} at ${s.picked.merchant} [productId ${p.id}, offerId ${s.picked.offerId}].`,
    `LOOKUPS SO FAR:\n${evidenceText(s)}`,
    `THE USER'S ANSWERS:\n${answers}`,
    `THE CHAT SO FAR:\n${transcript}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// `fresh` is an answer that arrived right before this message.
export function turnBrief(s: State, fresh?: Answer): string {
  const n = s.messages.length + 1;
  const last = s.messages.at(-1);
  const lines = [`This is message ${n} of ${MAX_MESSAGES}.`];
  if (last) lines.push(`Include a short "reaction" (max 60 characters) to ${NAMES[last.from]}'s last message, like "Bold claim. Checking."`);
  else lines.push('This is the first message, so "reaction" is an empty string.');
  if (fresh) {
    lines.push(fresh.answer === null ? "The user didn't answer the last question. Mention that, in character." : `React to the user's answer ("${fresh.answer}").`);
  }
  if (n >= MAX_MESSAGES - 1) lines.push("The debate is wrapping up: land your final position.");
  return lines.join("\n");
}
