#!/usr/bin/env bash
# lint-i18n.sh — Detect raw string literals in JSX/TSX component files
# Constitution VIII: All user-facing strings must be extractable for i18n
# QG-9: CI lint pass that flags raw string literals in UI components
#
# Exit code:
#   0 = no violations found
#   1 = violations found (BLOCKING — Spec 014)
#
# This script scans for JSX text content and hardcoded string props
# that should use the translations module or next-intl instead.

set -euo pipefail

VIOLATIONS=0
SCAN_DIRS=(
  "packages/shared-ui/src"
  "apps/web/src/components"
  "apps/web/src/app"
)

# Patterns that are acceptable (not user-facing):
# - aria-label, aria-*, data-*, role, className, htmlFor, id, name, type, key props
# - Import/export statements
# - Test files (.test.tsx, .stories.tsx)
# - Message definition files (*-messages.ts)
# - Console.log, console.error, etc.
# - Comment lines
# - Empty strings
# - Single-character strings (punctuation, etc.)

echo "=== i18n lint: checking for raw string literals ==="

for dir in "${SCAN_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    continue
  fi

  # Find TSX/JSX files (skip tests, stories, and message definition files)
  while IFS= read -r -d '' file; do
    # Look for JSX text content: >Some text< (multi-word strings between tags)
    # This catches: <h1>Welcome Home</h1>, <p>Click here to continue</p>, etc.
    # Pattern: 2+ words starting with a capital letter between > and <
    RAW_STRINGS=$(grep -nE '>[[:space:]]*[A-Z][a-z]+([[:space:]]+[a-z]+)+[[:space:]]*<' "$file" 2>/dev/null || true)

    if [ -n "$RAW_STRINGS" ]; then
      echo ""
      echo "ERROR: Raw string literals in $file:"
      echo "$RAW_STRINGS" | head -5
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done < <(find "$dir" -name "*.tsx" -not -name "*.test.tsx" -not -name "*.stories.tsx" -not -name "*-messages.ts" -print0)
done

echo ""
if [ "$VIOLATIONS" -gt 0 ]; then
  echo "✗ i18n lint: found $VIOLATIONS file(s) with raw string literals"
  echo "  These strings MUST be extracted to translation files (apps/web/messages/*.json)"
  echo "  or message modules (*-messages.ts). See Constitution VIII and QG-9."
  echo ""
  echo "  How to fix:"
  echo "  1. Add the string to apps/web/messages/en.json under the appropriate namespace"
  echo "  2. Add translations to es.json and ar.json"
  echo "  3. Use useTranslations() hook or pass translated strings via props"
  exit 1
else
  echo "✓ i18n lint: no raw string violations detected"
  exit 0
fi
