# Research: Azure Production Deployment

**Spec**: 011 | **Date**: 2026-03-22

---

## R-1: Compute Platform — Azure Container Apps vs App Service

**Decision**: Azure Container Apps (Consumption plan with dedicated workload profile for production).

**Rationale**: The spec requires scale-to-zero (FR-003, FR-018), auto-scaling based on HTTP and custom metrics (FR-003), and zero-downtime deployments (FR-009). Container Apps provides native KEDA-based autoscaling, revision-based traffic splitting for zero-downtime rollouts, and true scale-to-zero on the Consumption plan. Next.js standalone output runs as a standard Node.js container, which Container Apps handles natively.

**Configuration**:
- Consumption workload profile (scale-to-zero enabled)
- Min replicas: 0 (idle), Max replicas: 10
- Scale rule: HTTP concurrent requests (threshold: 20 per instance)
- Ingress: external, port 3000, transport HTTP/1.1
- Revision mode: multiple (for blue-green traffic splitting)
- Health probes: liveness on `/api/health`, readiness on `/api/ready`

**Cost estimate (low traffic)**:
- Scale-to-zero during idle: ~$0/mo compute
- Active hours (8h/day × 30 days × 1 vCPU, 2GB): ~$15–25/mo
- Container Apps Environment (Log Analytics): ~$5/mo
- Total compute: ~$20–30/mo

**Alternatives considered**:
- **Azure App Service (B1/P1v3)**: No scale-to-zero on Basic/Standard tiers. Premium v3 supports scale down to 1 but not zero. Monthly cost ~$50-100 even idle. Simpler deployment model (zip deploy) but doesn't meet FR-018 cost target.
- **Azure Kubernetes Service (AKS)**: Full Kubernetes. Overkill for a single web app. Minimum cost ~$70/mo for the control plane + node pool. Scale-to-zero requires KEDA + Virtual Nodes, adding complexity.
- **Azure Functions (Flex Consumption)**: Could host Next.js via custom handler but Next.js App Router is not designed for serverless function splits. Cold start penalty for the full Node.js runtime. Better for microservices than a monolithic Next.js app.
- **Azure Container Instances**: No auto-scaling, no revision management, no built-in ingress. Manual orchestration required.

---

## R-2: Next.js Containerisation Strategy

**Decision**: Multi-stage Dockerfile using Next.js standalone output mode. Build in CI, not locally.

**Rationale**: Next.js `output: 'standalone'` produces a self-contained Node.js server with only production dependencies (~50MB vs ~500MB full node_modules). This is the recommended approach for containerising Next.js. The monorepo build order (tokens → shared-ui → web) must be preserved in the Docker build.

**Multi-stage build**:
```
Stage 1 (deps):     Install all npm dependencies (full node_modules for build)
Stage 2 (builder):  Build tokens → build web (standalone output)
Stage 3 (runner):   Copy standalone output + static + public → slim Node.js image
```

**Key configuration**:
- `next.config.js`: Add `output: 'standalone'` (currently missing — must be added)
- Base image: `node:22-alpine` (matches engines requirement, small footprint)
- Final image size target: <150MB
- `NEXT_SHARP_PATH` set for optimised image processing in standalone mode
- `HOSTNAME=0.0.0.0` to bind to all interfaces in container

**Alternatives considered**:
- **Buildpacks (Cloud Native Buildpacks)**: Auto-detect Node.js and build. Less control over multi-stage optimisation and monorepo build order. Would need custom buildpack for the tokens→web build chain.
- **Distroless base image**: Smaller attack surface but no shell for debugging. Alpine is a good compromise — small (~5MB base) with shell available.
- **Bun runtime**: Faster startup but Next.js 16 officially supports Node.js. Bun compatibility with next-auth, pg, and sharp is not guaranteed.

---

## R-3: Database — PostgreSQL Flexible Server Configuration

**Decision**: Azure Database for PostgreSQL Flexible Server, Burstable B1ms (1 vCPU, 2GB RAM), with built-in PgBouncer connection pooling.

**Rationale**: The application uses the `pg` driver natively. PostgreSQL Flexible Server provides managed backups, high availability, and built-in PgBouncer (FR-013). The Burstable tier supports scale-down during low traffic. PgBouncer runs as a sidecar — no application code changes needed; just change the connection port from 5432 to 6432.

**Configuration**:
- SKU: `Standard_B1ms` (1 vCPU, 2GB RAM) — ~$25/mo
- Storage: 32GB (auto-grow enabled) — ~$5/mo
- PgBouncer: enabled, transaction mode, port 6432
- SSL: required (enforce in connection string)
- Backup retention: 7 days (geo-redundant disabled for cost)
- High availability: disabled initially (single zone) — can enable later
- PostgreSQL version: 16

**Connection string pattern**:
```
postgresql://{user}:{password}@{server}.postgres.database.azure.com:6432/{db}?sslmode=require&pgbouncer=true
```

**PgBouncer benefits**:
- Connection pooling reduces connection overhead from Container Apps (multiple replicas)
- Transaction mode: connections returned to pool after each transaction (ideal for web apps)
- No application-side connection pooler needed (no pgbouncer container, no `@neondatabase/serverless`)

**Alternatives considered**:
- **Azure Cosmos DB for PostgreSQL**: Distributed PostgreSQL (Citus). Overkill for current scale. Minimum cost ~$100/mo. Justified only at >1M rows or complex sharding needs.
- **Neon Serverless Postgres**: Scale-to-zero database. Great for dev but not Azure-native. Adds external dependency and latency. No managed PgBouncer integration.
- **Azure SQL Database**: Not PostgreSQL. Application uses pg driver and PostgreSQL-specific features (e.g., `gen_random_uuid()`, `FOR UPDATE`). Migration would require rewriting queries.
- **Self-managed PostgreSQL on VM**: Full control but no managed backups, patching, or HA. Operational burden not justified at this scale.

**Migration strategy**: Existing `db:migrate` script (apps/web/src/db/migrate.ts) runs unchanged against Flexible Server. Migrations are raw SQL files — PostgreSQL-compatible by design.

---

## R-4: CDN and Edge — Azure Front Door

**Decision**: Azure Front Door Standard tier with WAF policy and custom domain.

**Rationale**: FR-004 requires a global CDN for static assets. Front Door provides global edge PoPs, intelligent routing, WAF protection (OWASP rules), and custom domain with managed TLS certificates (FR-015). Standard tier is sufficient — Premium adds private link (not needed for Container Apps external ingress).

**Configuration**:
- Tier: Standard
- Origin: Container Apps FQDN
- Caching rules:
  - `/_next/static/*` → cache 30 days (immutable hashes in filenames)
  - `/api/*` → no cache (dynamic)
  - `/` and pages → cache 60s with stale-while-revalidate (ISR-compatible)
  - Media (Blob Storage) → cache 7 days
- WAF: Managed rule set (OWASP 3.2 + bot protection)
- Custom domain: Managed TLS certificate (auto-renewal)
- Health probe: `/api/health` every 30s

**Cost estimate**:
- Base: ~$35/mo (Standard tier)
- Data transfer: ~$0.01/GB after 5GB free
- WAF: included in Standard
- Total CDN: ~$35–40/mo

**Alternatives considered**:
- **Azure CDN (classic)**: Being deprecated in favour of Front Door. No WAF integration. No intelligent routing.
- **Cloudflare**: Excellent CDN but adds an external dependency outside Azure. Complicates managed identity and private networking. Would work as a future optimisation.
- **Vercel Edge Network**: Tight Next.js integration but locks into Vercel hosting. Not compatible with Container Apps deployment.
- **No CDN (Container Apps ingress only)**: Works but serves all traffic from a single Azure region. Higher latency for global users. No WAF protection.

---

## R-5: Secrets Management — Azure Key Vault

**Decision**: Azure Key Vault with user-assigned managed identity. Container Apps references secrets directly from Key Vault (no application-level SDK).

**Rationale**: FR-005 requires centralised, audited secrets management. Container Apps has native Key Vault reference support — secrets are injected as environment variables at container start. The application code sees standard `process.env` variables with no SDK dependency. Managed identity eliminates credential management for Key Vault access.

**Secrets to store**:
| Secret Name | Purpose |
|-------------|---------|
| `database-url` | PostgreSQL connection string (with PgBouncer port) |
| `nextauth-secret` | NextAuth session encryption key |
| `nextauth-url` | Application URL for NextAuth callbacks |
| `stripe-secret-key` | Stripe API secret key |
| `stripe-webhook-secret` | Stripe webhook signing secret |
| `stripe-client-id` | Stripe Connect client ID |
| `azure-storage-connection-string` | Blob Storage connection string |
| `applicationinsights-connection-string` | App Insights instrumentation |

**Secret rotation**: Key Vault supports versioning. Updating a secret creates a new version. Container Apps can be configured to pick up new versions on restart or revision update — no redeployment needed (FR-005 AC-2).

**Alternatives considered**:
- **Azure App Configuration**: Good for non-secret config but not a secrets vault. Often used alongside Key Vault, not instead of it.
- **Docker secrets / environment variables baked into image**: Violates FR-005 and Constitution III. Secrets would be visible in `docker inspect` and container logs.
- **HashiCorp Vault**: Feature-rich but adds operational complexity. Azure-native Key Vault is simpler and integrated with managed identity.
- **GitHub Secrets (only)**: Useful for CI but secrets are baked into the deployment at build time. No runtime rotation without redeployment.

---

## R-6: IaC Approach — Bicep vs Terraform

**Decision**: Bicep with Azure Developer CLI (azd) orchestration.

**Rationale**: The project is Azure-only. Bicep is Azure-native, first-party, requires no state file management, and has excellent VS Code tooling. azd provides a CLI experience that wraps provisioning + deployment into a single `azd up` command (FR-001, SC-001). azd uses Bicep natively and handles parameter injection, environment management, and deployment orchestration.

**azd project structure**:
```yaml
# azure.yaml
name: acroyoga-community
metadata:
  template: acroyoga-community
services:
  web:
    project: ./apps/web
    host: containerapp
    docker:
      path: ./Dockerfile
      context: .
```

**Bicep module structure**: One module per resource type (separation of concerns). `main.bicep` orchestrates all modules with parameters for environment-specific config.

**Alternatives considered**:
- **Terraform (azurerm provider)**: Multi-cloud capable but adds state management complexity (Azure Storage backend). The team is Azure-only — Bicep's declarative syntax and direct ARM integration is simpler. Terraform would be justified if multi-cloud was planned.
- **Pulumi**: Code-based IaC in TypeScript. Appealing for a TypeScript team but adds a runtime dependency and state management. Bicep is simpler for Azure-only.
- **ARM templates (JSON)**: Bicep compiles to ARM. No reason to write ARM directly — Bicep is strictly better (readable, modular, type-safe).
- **Azure Portal (manual)**: Violates FR-002 (infrastructure as code). Not reproducible or version-controlled.

---

## R-7: CI/CD Pipeline Strategy

**Decision**: GitHub Actions with two workflows: `ci.yml` (existing, extended) and `deploy.yml` (new). Image promotion from staging to production (same image, not rebuilt).

**Rationale**: FR-008 and FR-014 require automated CI/CD with image promotion. The existing `ci.yml` runs on every PR. The new `deploy.yml` triggers on pushes to `main` (deploy to staging) and manual dispatch (promote to production).

**Pipeline flow**:
```
PR → ci.yml: typecheck → lint → build → bundle check → test → storybook
Merge to main → deploy.yml:
  1. Build container image (tag: git SHA)
  2. Push to ACR
  3. Deploy to staging (azd deploy --environment staging)
  4. Run smoke tests against staging
  5. Manual approval gate
  6. Promote to production (update Container Apps revision with same image tag)
```

**Image tagging strategy**: `ghcr.io` or ACR with tags `sha-<git-sha>` and `latest-staging` / `latest-production`. The same SHA-tagged image is used for both environments — only environment variables (from Key Vault) differ.

**Alternatives considered**:
- **Azure DevOps Pipelines**: Feature-rich but the team already uses GitHub Actions. No reason to add a second CI system.
- **azd pipeline config**: azd can generate GitHub Actions workflows. However, custom workflows give more control over the staging→production promotion and approval gates.
- **GitOps (Flux/ArgoCD)**: Kubernetes-native. Overkill for Container Apps which has its own revision management.
- **Single workflow (ci + deploy combined)**: Simpler but conflates PR validation with deployment. Separation allows CI to run on PRs without deploying.

---

## R-8: Observability — Azure Monitor + Application Insights

**Decision**: Application Insights with OpenTelemetry-based Node.js SDK, integrated via Next.js `instrumentation.ts` hook. Azure Monitor dashboards for operational metrics.

**Rationale**: FR-011 and FR-012 require centralised logging, distributed tracing, and alerting. Application Insights provides auto-instrumentation for Node.js (HTTP, pg, fetch), custom metrics, and distributed tracing. Next.js 16 supports an `instrumentation.ts` file that runs once on server startup — ideal for SDK initialisation.

**Implementation**:
```typescript
// apps/web/src/instrumentation.ts
export async function register() {
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    const { useAzureMonitor } = await import('@azure/monitor-opentelemetry');
    useAzureMonitor();
  }
}
```

**Alerts** (FR-012):
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| HTTP 5xx rate | >5% over 5min | Sev 2 | Email + webhook |
| Response time p95 | >2s over 5min | Sev 3 | Email |
| Container restart count | >3 in 10min | Sev 2 | Email + webhook |
| Database connection failures | >0 in 5min | Sev 1 | Email + webhook + PagerDuty |

**Alternatives considered**:
- **Datadog**: Excellent observability platform but external dependency and additional cost (~$15+/mo per host). Azure-native monitoring is included in the platform cost.
- **Grafana + Prometheus**: Self-hosted. Operational burden for a small team. Azure Managed Grafana is an option but adds ~$30/mo.
- **Console logging only**: No distributed tracing, no dashboards, no alerting. Insufficient for production.
- **Sentry**: Great for error tracking but doesn't provide infrastructure metrics or distributed tracing. Could complement App Insights but not replace it.

---

## R-9: Database Migration Strategy in CI/CD

**Decision**: Run migrations as a Container Apps init container (job) before the new revision receives traffic.

**Rationale**: FR-007 requires migrations to complete before new application code serves traffic. Container Apps supports init containers that run before the main container starts. The migration job uses the same container image, running `npm run db:migrate` against the production database.

**Flow**:
```
1. New container image pushed to ACR
2. Container Apps creates new revision
3. Init container runs: node apps/web/src/db/migrate.ts
4. If migration succeeds → main container starts → health check passes → traffic shifts
5. If migration fails → revision marked unhealthy → traffic stays on previous revision
```

**Alternatives considered**:
- **Separate migration job (Container Apps Job)**: Requires a separate resource and coordination. Init container is simpler and atomic with the deployment.
- **Migration in application startup**: Risk of race condition if multiple replicas start simultaneously. Init container runs once before any replica starts.
- **GitHub Actions step (run migration from CI)**: Requires CI to have database network access (firewall rules, GitHub runner in VNET). Init container runs inside the Container Apps environment with native network access.
- **Flyway / Liquibase**: Dedicated migration tools. The project already has a working tsx-based migration runner. No reason to add a new tool.

---

## R-10: Zero-Downtime Deployment Strategy

**Decision**: Container Apps multi-revision mode with gradual traffic shifting. New revision starts alongside old; traffic shifts after health check passes.

**Rationale**: FR-009 requires zero-downtime deployments. Container Apps in multi-revision mode can run two revisions simultaneously. The deployment creates a new revision with 0% traffic, waits for health checks, then shifts 100% traffic. The old revision is deactivated (not deleted) for instant rollback.

**Deployment steps**:
```
1. Create new revision (0% traffic)
2. Wait for init container (migrations) to succeed
3. Wait for readiness probe to pass on new revision
4. Shift traffic: 0% old → 100% new (instant or gradual)
5. Deactivate old revision (keeps configuration for rollback)
```

**Rollback**: If the new revision fails health checks, traffic remains on the old revision. Manual rollback: reactivate previous revision and shift traffic back.

**Database compatibility**: Migrations must be backward-compatible (additive only). Drop columns or rename operations should be split across two deployments: (1) add new column + migrate data, (2) remove old column after traffic fully shifted.

**Alternatives considered**:
- **Blue-green with two Container Apps**: Two separate apps with Front Door switching between them. More complex, higher cost (two apps running during switch). Container Apps revision management achieves the same result natively.
- **Canary deployment (10% → 50% → 100%)**: Supported by Container Apps traffic splitting. Adds deployment time. Useful for high-risk changes but overkill for standard deployments.
- **Rolling update (Kubernetes-style)**: Container Apps handles this internally within a single revision. Multi-revision mode gives more control.
