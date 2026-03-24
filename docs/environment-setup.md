# Environment Setup Guide

Developer onboarding guide for the AcroYoga Community Platform Azure deployment.

## Required CLI Tools

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Azure CLI (`az`) | v2.60+ | [Install guide](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) |
| Azure Developer CLI (`azd`) | v1.10+ | [Install guide](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/install-azd) |
| Docker | Latest | [Install guide](https://docs.docker.com/get-docker/) |
| Node.js | 22+ | [Install guide](https://nodejs.org/) |
| npm | Bundled with Node.js | |

## Azure Subscription Setup

1. Ensure you have an Azure subscription with **Contributor** role (or **Owner** for RBAC assignments)
2. Login to Azure:
   ```bash
   az login
   azd auth login
   ```

## GitHub Secrets Configuration

Configure the following secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret | How to generate |
|--------|----------------|
| `AZURE_CREDENTIALS` | `az ad sp create-for-rbac --name "acroyoga-deploy" --role contributor --scopes /subscriptions/{subscription-id} --sdk-auth` |
| `AZURE_CONTAINER_REGISTRY` | Your ACR login server, e.g. `acracroyoga.azurecr.io` |

## GitHub Environments

Create two environments in GitHub (Settings > Environments):

1. **staging** — no protection rules
2. **production** — required reviewers (1+), restrict to `main` branch

## Local Docker Testing

```bash
# Build the container image locally
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

## Verification Steps

```bash
# 1. Health endpoint
curl http://localhost:3000/api/health
# Expected: { "status": "healthy", "version": "local" }

# 2. Readiness endpoint
curl http://localhost:3000/api/ready
# Expected: { "status": "ready", "checks": { "database": "ok", "storage": "ok" } }
```

## Key Files

| File | Purpose |
|------|---------|
| `azure.yaml` | azd project configuration |
| `Dockerfile` | Multi-stage container build |
| `infra/main.bicep` | Infrastructure orchestrator |
| `infra/main.parameters.json` | Default Bicep parameters |
| `.github/workflows/ci.yml` | CI pipeline (extended with Docker build test) |
| `.github/workflows/deploy.yml` | CD pipeline (staging → production) |
| `.azure/staging/.env` | Staging environment config |
| `.azure/production/.env` | Production environment config |
