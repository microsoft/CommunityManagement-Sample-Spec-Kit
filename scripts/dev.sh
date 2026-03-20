#!/usr/bin/env bash
# Dev server launcher - sets up nvm Node v24 and starts Next.js + tokens watch
export PATH="/home/mike/.nvm/versions/node/v24.14.0/bin:${PATH}"
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"
cd "$(dirname "$0")/.." || exit 1
exec npm run dev
