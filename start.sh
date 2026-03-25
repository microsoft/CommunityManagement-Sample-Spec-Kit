#!/bin/sh
set -e
# Run database migrations (idempotent — safe on every container start)
MIGRATIONS_DIR=/app/migrations node /app/migrate.cjs
# Start the Next.js server
exec node apps/web/server.js
