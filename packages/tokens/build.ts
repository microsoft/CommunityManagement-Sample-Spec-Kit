import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import sd from "./config.ts";
import { validateContrast } from "./transforms/wcag-contrast.ts";

// Load token sources for WCAG validation
const tokenFiles: string[] = [];
for await (const f of glob("src/**/*.tokens.json")) {
  tokenFiles.push(f);
}
const tokenSources = tokenFiles.map((f) =>
  JSON.parse(readFileSync(f, "utf-8")) as Record<string, unknown>,
);

// Validate WCAG contrast
const results = validateContrast(tokenSources);
const failures = results.filter((r) => !r.pass);

// Build all platforms
await sd.buildAllPlatforms();
console.log("✓ Token build complete");

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} WCAG contrast failure(s) found`);
  process.exit(1);
}
