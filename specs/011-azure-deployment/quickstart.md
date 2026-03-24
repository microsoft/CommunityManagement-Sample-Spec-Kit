# Quickstart: Azure Production Deployment

**Spec**: 011 | **Date**: 2026-03-22

---

## Prerequisites

- **Azure subscription** with Contributor role (or Owner for RBAC assignments)
- **Azure CLI** (`az`) v2.60+ — `az --version`
- **Azure Developer CLI** (`azd`) v1.10+ — `azd version`
- **Docker** (for local image builds / testing only — CI builds in GitHub Actions)
- **Node.js 22+** (for local development)
- **GitHub repository** with Actions enabled and these repository secrets:
  - `AZURE_CREDENTIALS` (service principal JSON for azd)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CLIENT_ID`
  - `NEXTAUTH_SECRET`
  - `DB_ADMIN_PASSWORD`

## First-Time Setup (Single Command)

```bash
# 1. Login to Azure
az login
azd auth login

# 2. Initialise azd environment (creates .azure/ directory)
azd init

# 3. Provision infrastructure + deploy application
azd up --environment staging
```

This single command:
1. Creates the resource group `rg-acroyoga-staging`
2. Provisions all Bicep-defined resources (Container Registry, PostgreSQL, Key Vault, Container Apps, Front Door, Monitoring)
3. Builds the Docker image and pushes to ACR
4. Populates Key Vault with secrets
5. Deploys the container to Container Apps
6. Runs database migrations (via init container)
7. Configures Front Door routing

**Expected duration**: 10–15 minutes for first deployment.

## Subsequent Deployments

```bash
# Deploy latest code to staging
azd deploy --environment staging

# Deploy to production (same image promotion)
azd deploy --environment production
```

## Environment Management

```bash
# List environments
azd env list

# Create production environment
azd env new production
azd env set AZURE_LOCATION eastus2

# Switch between environments
azd env select staging
azd env select production

# View deployed resources
azd show
```

## Running Locally with Docker

```bash
# Build the container image locally (for testing)
docker build -t acroyoga-web:local .

# Run with local PostgreSQL
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host.docker.internal:5432/acroyoga" \
  -e NEXTAUTH_SECRET="local-dev-secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e NODE_ENV=production \
  -e HOSTNAME=0.0.0.0 \
  acroyoga-web:local
```

## Verifying Deployment

```bash
# 1. Check health endpoint
curl https://<app-url>/api/health
# Expected: { "status": "healthy", "version": "<git-sha>" }

# 2. Check readiness (includes dependency checks)
curl https://<app-url>/api/ready
# Expected: { "status": "ready", "checks": { "database": "ok", "storage": "ok" } }

# 3. Check Front Door origin health
az afd origin show --resource-group rg-acroyoga-staging \
  --profile-name afd-acroyoga --origin-group-name default \
  --origin-name web --query "healthProbeSettings"

# 4. View application logs
az containerapp logs show --name ca-acroyoga-web-staging \
  --resource-group rg-acroyoga-staging --follow

# 5. View Application Insights metrics
az monitor app-insights metrics show \
  --app appi-acroyoga-staging --resource-group rg-acroyoga-staging \
  --metric requests/count --interval PT1H
```

## CI/CD Pipeline

### Automatic Deployment (on merge to main)

```
Push to main → ci.yml passes → deploy.yml triggers:
  1. Build container image → push to ACR
  2. Deploy to staging → run smoke tests
  3. Manual approval → promote to production
```

### Manual Deployment

```bash
# Trigger production deployment from GitHub Actions
gh workflow run deploy.yml -f environment=production -f image-tag=sha-abc1234
```

## Key Vault Secret Management

```bash
# View secrets (names only — values are hidden)
az keyvault secret list --vault-name kv-acroyoga-staging --query "[].name"

# Rotate a secret (e.g., database password)
az keyvault secret set --vault-name kv-acroyoga-staging \
  --name database-url \
  --value "postgresql://admin:NEW_PASSWORD@psql-acroyoga-staging.postgres.database.azure.com:6432/acroyoga?sslmode=require"

# The application picks up the new secret on next Container App revision update
azd deploy --environment staging
```

## Monitoring & Troubleshooting

```bash
# View live container logs
az containerapp logs show --name ca-acroyoga-web-staging \
  --resource-group rg-acroyoga-staging --follow

# View active revisions
az containerapp revision list --name ca-acroyoga-web-staging \
  --resource-group rg-acroyoga-staging -o table

# Rollback to previous revision
az containerapp revision activate --name ca-acroyoga-web-staging \
  --resource-group rg-acroyoga-staging --revision <previous-revision-name>
az containerapp ingress traffic set --name ca-acroyoga-web-staging \
  --resource-group rg-acroyoga-staging \
  --revision-weight <previous-revision-name>=100

# Query Application Insights for errors
az monitor app-insights query --app appi-acroyoga-staging \
  --resource-group rg-acroyoga-staging \
  --analytics-query "requests | where success == false | top 10 by timestamp desc"
```

## Teardown

```bash
# Remove all resources for an environment
azd down --environment staging --purge --force

# This deletes the resource group and all contained resources.
# Key Vault soft-delete retains secrets for 90 days (purge protection).
```

## Key Files

| File | Purpose |
|------|---------|
| `azure.yaml` | azd project configuration |
| `infra/main.bicep` | Infrastructure orchestrator |
| `infra/main.parameters.json` | Default Bicep parameters |
| `Dockerfile` | Multi-stage container build |
| `.github/workflows/deploy.yml` | CI/CD deployment pipeline |
| `apps/web/src/app/api/health/route.ts` | Liveness probe endpoint |
| `apps/web/src/app/api/ready/route.ts` | Readiness probe endpoint |
| `apps/web/src/instrumentation.ts` | Application Insights setup |
