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
const pageManifest = resolve(__dirname, "../.next/server/app/page/build-manifest.json");
const indexHtml = resolve(__dirname, "../.next/server/app/index.html");

let chunkFiles = [];
if (existsSync(pageManifest)) {
  const manifest = JSON.parse(readFileSync(pageManifest, "utf-8"));
  chunkFiles = [
    ...(manifest.polyfillFiles ?? []),
    ...(manifest.rootMainFiles ?? []),
  ];
} else if (existsSync(indexHtml)) {
  const html = readFileSync(indexHtml, "utf-8");
  const chunkRe = /src="\/_next\/static\/chunks\/([^"]+)"/g;
  let match;
  while ((match = chunkRe.exec(html)) !== null) {
    chunkFiles.push(`static/chunks/${match[1]}`);
  }
} else {
  console.error("Build output not found. Run `npm run build` first.");
  process.exit(1);
}

let totalGz = 0;
for (const chunkFile of chunkFiles) {
  const chunkPath = resolve(__dirname, "../.next", chunkFile);
  if (existsSync(chunkPath)) {
    const gz = execSync(`gzip -c "${chunkPath}" | wc -c`, { encoding: "utf-8" });
    totalGz += parseInt(gz.trim(), 10);
  }
}

const totalKB = Math.ceil(totalGz / 1024);
console.log(`Initial JS bundle size (gzipped): ${totalKB}KB / ${maxKB}KB budget`);

if (chunkFiles.length === 0 || totalGz === 0) {
  console.error("FAIL: Bundle size check could not resolve initial JS chunks.");
  process.exit(1);
}

if (totalKB > maxKB) {
  console.error(`FAIL: Bundle size ${totalKB}KB exceeds ${maxKB}KB budget`);
  process.exit(1);
}

console.log("PASS: Bundle size within budget");
