# Deployment Runbook

Comprehensive operational guide for the AcroYoga Community Platform Azure deployment.

## Prerequisites

- Azure CLI (`az`) v2.60+
- Azure Developer CLI (`azd`) v1.10+
- Docker (for local testing)
- GitHub repository access with Actions enabled

## First-Time Setup

```bash
# 1. Login to Azure
az login
azd auth login

# 2. Initialise azd environment
azd init

# 3. Provision infrastructure + deploy
azd up --environment staging
```

Expected duration: 10–15 minutes for first deployment.

## Subsequent Deploys

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
```

## Secret Rotation

Secrets are stored in Azure Key Vault. To rotate:

```bash
# 1. Update the secret in Key Vault
az keyvault secret set --vault-name kv-acroyoga-staging \
  --name database-url \
  --value "postgresql://admin:NEW_PASSWORD@psql-acroyoga-staging.postgres.database.azure.com:6432/acroyoga?sslmode=require"

# 2. Deploy a new revision to pick up the updated secret
azd deploy --environment staging
```

Container Apps retrieves new secret versions on each revision update.

## Monitoring & Troubleshooting

```bash
# View live container logs
az containerapp logs show --name ca-acroyoga-web-staging \
  --resource-group rg-acroyoga-staging --follow

# View active revisions
az containerapp revision list --name ca-acroyoga-web-staging \
  --resource-group rg-acroyoga-staging -o table

# Query Application Insights for errors
az monitor app-insights query --app appi-acroyoga-staging \
  --resource-group rg-acroyoga-staging \
  --analytics-query "requests | where success == false | top 10 by timestamp desc"
```

## Rollback Procedure

```bash
# 1. Identify the previous working revision
az containerapp revision list --name ca-acroyoga-web-production \
  --resource-group rg-acroyoga-production -o table

# 2. Reactivate the previous revision
az containerapp revision activate --name ca-acroyoga-web-production \
  --resource-group rg-acroyoga-production \
  --revision <previous-revision>

# 3. Shift traffic to previous revision
az containerapp ingress traffic set --name ca-acroyoga-web-production \
  --resource-group rg-acroyoga-production \
  --revision-weight <previous-revision>=100

# 4. Deactivate the broken revision
az containerapp revision deactivate --name ca-acroyoga-web-production \
  --resource-group rg-acroyoga-production \
  --revision <broken-revision>
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
gh workflow run deploy.yml -f environment=production -f image-tag=sha-abc1234
```

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON |
| `AZURE_CONTAINER_REGISTRY` | ACR login server (e.g. `acracroyoga.azurecr.io`) |

## GitHub Environments

| Environment | Protection Rules |
|-------------|-----------------|
| `staging` | None (auto-deploy on merge) |
| `production` | Required reviewers (1+), deployment branch: `main` |

## Teardown

```bash
# Remove all resources for an environment
azd down --environment staging --purge --force
```

Key Vault soft-delete retains secrets for 90 days (purge protection enabled).
