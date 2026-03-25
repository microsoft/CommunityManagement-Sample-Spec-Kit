# Stage 1: Build
FROM acracroyogai6t2epo2hhajo.azurecr.io/node:22-alpine AS builder
WORKDIR /app

# Install dependencies (package.jsons first for layer caching)
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared-ui/package.json ./packages/shared-ui/
COPY packages/tokens/package.json ./packages/tokens/
RUN npm ci --force

# Copy source and build
COPY . .
RUN npm run tokens:build -w @acroyoga/tokens
RUN npm run build -w @acroyoga/web

# Compile the database migration runner into a single CJS bundle so it can
# run in the production image without tsx or the full TypeScript source tree.
RUN npx --yes esbuild apps/web/src/db/migrate.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=migrate.cjs \
  --external:pg \
  --external:@azure/identity

# Stage 2: Production runner
FROM acracroyogai6t2epo2hhajo.azurecr.io/node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output, static assets, and public directory
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Migration runner (compiled CJS bundle) and SQL migration files
COPY --from=builder /app/migrate.cjs /app/migrate.cjs
COPY --from=builder /app/apps/web/src/db/migrations /app/migrations

# start.sh: run DB migrations (idempotent) then start the Next.js server
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

USER nextjs
EXPOSE 3000

CMD ["/app/start.sh"]
