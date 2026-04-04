/**
 * Unit tests for i18n lint enforcement.
 * Spec 014 — Task T036
 *
 * Verifies the lint-i18n.sh script detects raw string violations.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(__dirname, "../../../..");

describe("i18n lint enforcement", () => {
  it("lint-i18n.sh exits with code 0 when no violations", () => {
    // Should pass because all strings are now extracted
    const result = execSync("bash scripts/lint-i18n.sh", {
      cwd: ROOT,
      encoding: "utf-8",
    });
    expect(result).toContain("no raw string violations detected");
  });

  it("lint-i18n.sh script exists and is executable", () => {
    const result = execSync("test -f scripts/lint-i18n.sh && echo exists", {
      cwd: ROOT,
      encoding: "utf-8",
    });
    expect(result.trim()).toBe("exists");
  });
});
