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

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
