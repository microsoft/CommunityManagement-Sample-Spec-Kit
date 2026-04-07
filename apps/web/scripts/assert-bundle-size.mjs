#!/usr/bin/env node
/**
 * Assert that the initial JS bundle size (gzipped) does not exceed a threshold.
 * Usage: node scripts/assert-bundle-size.mjs [maxKB]
 * Default threshold: 200 KB (Constitution VI, FR-013)
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const maxKB = parseInt(process.argv[2] ?? "200", 10);
const indexHtml = resolve(__dirname, "../.next/server/app/index.html");

if (!existsSync(indexHtml)) {
  console.error("Build output not found. Run `npm run build` first.");
  process.exit(1);
}

const html = readFileSync(indexHtml, "utf-8");
const chunkRe = /src="\/_next\/static\/chunks\/([^"]+)"/g;
let totalGz = 0;
let match;

while ((match = chunkRe.exec(html)) !== null) {
  const chunkPath = resolve(__dirname, "../.next/static/chunks", match[1]);
  if (existsSync(chunkPath)) {
    const gz = execSync(`gzip -c "${chunkPath}" | wc -c`, { encoding: "utf-8" });
    totalGz += parseInt(gz.trim(), 10);
  }
}

const totalKB = Math.ceil(totalGz / 1024);
console.log(`Initial JS bundle size (gzipped): ${totalKB}KB / ${maxKB}KB budget`);

if (totalKB > maxKB) {
  console.error(`FAIL: Bundle size ${totalKB}KB exceeds ${maxKB}KB budget`);
  process.exit(1);
}

console.log("PASS: Bundle size within budget");
