import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the server rules that protect prices and the user's money. No network: fetch is stubbed.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
