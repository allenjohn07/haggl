// Records live Channel3 results for the suggestion queries as fixtures.
//   npx tsx --env-file=.env.local scripts/record-fixtures.ts           prints what it would write
//   npx tsx --env-file=.env.local scripts/record-fixtures.ts --write   writes data/fixtures/live.ts
// Review the output before committing it: the repo is public. Uses about 6 search calls of credit.
import { writeFileSync } from "node:fs";
import { c3Search } from "@/lib/channel3/client";
import { SUGGESTIONS } from "@/data/fixtures/suggestions";
import type { FixtureSet } from "@/data/fixtures/sample";

async function main() {
  if (!process.env.CHANNEL3_API_KEY) throw new Error("Set CHANNEL3_API_KEY (e.g. --env-file=.env.local)");
  const sets: FixtureSet[] = [];
  for (const query of SUGGESTIONS) {
    const products = (await c3Search(query, 12)).map((r) => r.product).slice(0, 6);
    console.error(`${query}: ${products.length} products`);
    if (products.length) sets.push({ query, products });
  }
  const file =
    `// Recorded Channel3 results (${new Date().toISOString().slice(0, 10)}) from scripts/record-fixtures.ts.\n` +
    `// When non-empty, mock mode serves these instead of sample.ts.\n` +
    `import type { FixtureSet } from "./sample";\n\n` +
    `export const LIVE_SETS: FixtureSet[] = ${JSON.stringify(sets, null, 2)};\n`;

  if (process.argv.includes("--write")) {
    writeFileSync("data/fixtures/live.ts", file);
    console.error("Wrote data/fixtures/live.ts");
  } else {
    console.log(file);
    console.error("Dry run. Pass --write to save it to data/fixtures/live.ts.");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "failed");
  process.exit(1);
});
