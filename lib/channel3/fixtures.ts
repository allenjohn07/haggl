import { LIVE_SETS } from "@/data/fixtures/live";
import { SAMPLE_SETS, type FixtureSet } from "@/data/fixtures/sample";

// Picks the fixture set closest to a query. Recorded live sets win over the hand-written samples.
const sets = (): FixtureSet[] => (LIVE_SETS.length ? LIVE_SETS : SAMPLE_SETS);

// Extra words per suggestion so near-miss queries ("earbuds", "coffee maker") land somewhere sensible.
const EXTRA: Record<string, string> = {
  "noise cancelling headphones": "headphone earbud headset earphone audio music anc bluetooth",
  "espresso machine": "espresso coffee latte cappuccino barista grinder",
  "running shoes": "shoe sneaker runner run jogging trainer marathon trail",
  "mechanical keyboard": "keyboard keycap typing switch gaming",
  "air fryer": "fryer fry airfryer oven kitchen cooking",
  "standing desk": "desk office workstation sit stand chair",
};

const STOP = new Set(["the", "and", "for", "with", "best", "cheap", "new", "good", "under"]);

function words(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w));
}

const same = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));

export function fixtureSet(text: string): FixtureSet {
  const q = words(text);
  let best = sets()[0];
  let bestScore = 0;
  for (const set of sets()) {
    const hay = words([set.query, EXTRA[set.query] ?? "", ...set.products.map((p) => p.title)].join(" "));
    const score = q.filter((w) => hay.some((h) => same(w, h))).length;
    if (score > bestScore) [best, bestScore] = [set, score];
  }
  return best;
}

export function fixtureSetFor(productId: string, title: string): FixtureSet {
  return sets().find((s) => s.products.some((p) => p.id === productId)) ?? fixtureSet(title);
}
