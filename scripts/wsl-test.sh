#!/bin/bash
export FNM_PATH="/home/mike/.local/share/fnm"
export PATH="$FNM_PATH:$PATH"
eval "$(fnm env --shell bash)"

echo "Node: $(node --version)"
echo "npm: $(npm -v)"

REPO_DIR="/mnt/c/_code/CommunityManagement-Sample-Spec-Kit/CommunityManagement-Sample-Spec-Kit"
cd "$REPO_DIR"
echo "Working dir: $(pwd)"

# Clean install to get Linux native binaries
echo "--- Clean npm install (Linux binaries) ---"
rm -rf node_modules apps/web/node_modules packages/*/node_modules
npm install 2>&1 | tail -10

echo "--- npm run build ---"
npm run build 2>&1 | tail -15

echo "--- npm run test ---"
npm run test 2>&1 | tail -30

echo "--- DONE ---"
