#!/bin/sh
set -e

# Run database migrations with retries to handle transient cold-start failures
# (e.g. Managed Identity IMDS delays, PostgreSQL not yet accepting connections).
# Each attempt is capped at 60 s via timeout(1); 3 attempts with 10 s backoff
# comfortably fit within the startup probe window (30 s initial delay + 60 × 5 s).
MAX_RETRIES=3
RETRY=0
while [ "$RETRY" -lt "$MAX_RETRIES" ]; do
  if MIGRATIONS_DIR=/app/migrations timeout 60 node /app/migrate.cjs; then
    break
  fi
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -eq "$MAX_RETRIES" ]; then
    echo "DB migrations failed after $MAX_RETRIES attempts, exiting"
    exit 1
  fi
  echo "Migration attempt $RETRY failed, retrying in 10s..."
  sleep 10
done

# Start the Next.js server
exec node apps/web/server.js
