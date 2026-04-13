#!/bin/sh
set -e

# Run database migrations with retries to handle transient cold-start failures
# (e.g. Managed Identity IMDS delays, PostgreSQL not yet accepting connections).
MAX_RETRIES=3
RETRY_DELAY=10
MIGRATION_TIMEOUT=60
RETRY=0
while [ "$RETRY" -lt "$MAX_RETRIES" ]; do
  if MIGRATIONS_DIR=/app/migrations timeout "$MIGRATION_TIMEOUT" node /app/migrate.cjs; then
    break
  fi
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -eq "$MAX_RETRIES" ]; then
    echo "DB migrations failed after $MAX_RETRIES attempts, exiting"
    exit 1
  fi
  echo "Migration attempt $RETRY failed, retrying in ${RETRY_DELAY}s..."
  sleep "$RETRY_DELAY"
done

# Start the Next.js server
exec node apps/web/server.js
