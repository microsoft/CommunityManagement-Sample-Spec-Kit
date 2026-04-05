/**
 * Unit tests for translation key completeness validator.
 * Spec 014 — Task T002
 *
 * Verifies all keys in en.json exist in every other locale file.
 * Reports missing keys per locale.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const MESSAGES_DIR = join(__dirname, "../../messages");

/** Recursively collect all dot-path keys from a nested JSON object */
function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadJsonFile(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
}

describe("translation key completeness", () => {
  it("en.json file exists and is valid JSON", () => {
    const enPath = join(MESSAGES_DIR, "en.json");
    const en = loadJsonFile(enPath);
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });

  it("every non-default locale file has all keys from en.json", () => {
    const enPath = join(MESSAGES_DIR, "en.json");
    const en = loadJsonFile(enPath);
    const enKeys = collectKeys(en);

    const localeFiles = readdirSync(MESSAGES_DIR)
      .filter((f) => f.endsWith(".json") && f !== "en.json");

    // Must have at least one non-default locale to test
    expect(localeFiles.length).toBeGreaterThan(0);

    for (const file of localeFiles) {
      const locale = basename(file, ".json");
      const localeData = loadJsonFile(join(MESSAGES_DIR, file));
      const localeKeys = collectKeys(localeData);
      const missingKeys = enKeys.filter((k) => !localeKeys.includes(k));

      expect(
        missingKeys,
        `Locale "${locale}" is missing ${missingKeys.length} key(s): ${missingKeys.slice(0, 5).join(", ")}${missingKeys.length > 5 ? "…" : ""}`,
      ).toHaveLength(0);
    }
  });

  it("no extra keys exist in locale files that are not in en.json", () => {
    const enPath = join(MESSAGES_DIR, "en.json");
    const en = loadJsonFile(enPath);
    const enKeys = collectKeys(en);

    const localeFiles = readdirSync(MESSAGES_DIR)
      .filter((f) => f.endsWith(".json") && f !== "en.json");

    for (const file of localeFiles) {
      const locale = basename(file, ".json");
      const localeData = loadJsonFile(join(MESSAGES_DIR, file));
      const localeKeys = collectKeys(localeData);
      const extraKeys = localeKeys.filter((k) => !enKeys.includes(k));

      expect(
        extraKeys,
        `Locale "${locale}" has ${extraKeys.length} extra key(s) not in en.json: ${extraKeys.slice(0, 5).join(", ")}`,
      ).toHaveLength(0);
    }
  });
});
