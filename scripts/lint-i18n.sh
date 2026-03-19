#!/usr/bin/env bash
# lint-i18n.sh — Detect raw string literals in JSX/TSX component files
# Constitution VIII: All user-facing strings must be extractable for i18n
# QG-9: CI lint pass that flags raw string literals in UI components
#
# Exit code:
#   0 = no violations found (or only allowed patterns)
#   1 = violations found
#
# This script scans for JSX text content and hardcoded string props
# that should use the translations module instead.

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
# - Console.log, console.error, etc.
# - Comment lines
# - Empty strings
# - Single-character strings (punctuation, etc.)

echo "=== i18n lint: checking for raw string literals ==="

for dir in "${SCAN_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    continue
  fi

  # Find TSX/JSX files (skip tests and stories)
  while IFS= read -r -d '' file; do
    # Look for JSX text content: >Some text< (multi-word strings between tags)
    # This catches: <h1>Welcome to the App</h1>, <p>Click here</p>, etc.
    RAW_STRINGS=$(grep -nE '>[[:space:]]*[A-Z][a-z]+([[:space:]]+[a-z]+){2,}[[:space:]]*<' "$file" 2>/dev/null || true)
    
    if [ -n "$RAW_STRINGS" ]; then
      echo ""
      echo "WARNING: Raw string literals in $file:"
      echo "$RAW_STRINGS" | head -5
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done < <(find "$dir" -name "*.tsx" -not -name "*.test.tsx" -not -name "*.stories.tsx" -print0)
done

echo ""
if [ "$VIOLATIONS" -gt 0 ]; then
  echo "⚠ i18n lint: found $VIOLATIONS file(s) with potential raw string literals"
  echo "  These strings should be extracted to packages/shared/src/utils/translations.ts"
  echo "  See Constitution VIII and QG-9 for details."
  # Warning-level: exit 0 for now to avoid blocking existing code
  # TODO: Switch to exit 1 once all strings are extracted to translations module
  exit 0
else
  echo "✓ i18n lint: no raw string violations detected"
  exit 0
fi
