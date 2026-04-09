# Quickstart: Azure Nightly Publish Workflow

**Feature**: 020-azure-nightly-publish

## Prerequisites

1. **Azure subscription** with capacity for an additional resource group
2. **Existing staging deployment** with shared ACR (`rg-acroyoga-stg` containing the Azure Container Registry)
3. **GitHub repository admin access** to create the "nightly" environment and its secrets
4. **Azure CLI** (`az`) installed and authenticated
5. **Bicep CLI** (included with Azure CLI)

## Step 1: Provision Nightly Infrastructure

### 1a. Create the nightly resource group

```bash
az group create \
  --name rg-acroyoga-nightly \
  --location eastus2 \
  --tags environment=nightly project=acroyoga-community managedBy=bicep
```

### 1b. Deploy nightly infrastructure via Bicep

```bash
az deployment group create \
  --resource-group rg-acroyoga-nightly \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.nightly.json \
  --parameters \
    dbAdminPassword="<secure-password>" \
    stripeSecretKey="<stripe-secret>" \
    stripeWebhookSecret="<stripe-webhook>" \
    stripeClientId="<stripe-client-id>" \
    nextAuthSecret="<nextauth-secret>"
```

### 1c. Grant nightly identity ACR pull access on shared registry

```bash
NIGHTLY_PRINCIPAL=$(az identity show \
  --name id-acroyoga-nightly \
  --resource-group rg-acroyoga-nightly \
  --query principalId -o tsv)

ACR_ID=$(az acr show \
  --name acracroyogai6t2epo2hhajo \
  --resource-group rg-acroyoga-stg \
  --query id -o tsv)

az role assignment create \
  --assignee-object-id "$NIGHTLY_PRINCIPAL" \
  --assignee-principal-type ServicePrincipal \
  --role "AcrPull" \
  --scope "$ACR_ID"
```

## Step 2: Configure GitHub Environment

1. Go to **Settings → Environments → New environment** → name it `nightly`
2. Add the following secrets:

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | Client ID of `id-acroyoga-staging` (staging identity — for ACR push) |
| `AZURE_CLIENT_ID_NIGHTLY` | Client ID of `id-acroyoga-nightly` |
| `AZURE_TENANT_ID` | Your Azure Entra tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |
| `AZURE_CONTAINER_REGISTRY` | Shared ACR login server (e.g., `acracroyogai6t2epo2hhajo.azurecr.io`) |

3. No protection rules or required reviewers needed (nightly is non-user-facing)

## Step 3: Add the Nightly Workflow

The workflow file goes to `.github/workflows/nightly.yml`. See the contract in `contracts/nightly-workflow.yml` for the full specification.

## Step 4: Verify

### Manual trigger test

1. Go to **Actions → Nightly Build & Deploy → Run workflow**
2. Select the `main` branch
3. Monitor the three jobs: `validate` → `build-and-push` → `deploy-nightly`
4. Verify the nightly environment is reachable:

```bash
APP_URL=$(az containerapp show \
  --name ca-acroyoga-web-nightly \
  --resource-group rg-acroyoga-nightly \
  --query properties.configuration.ingress.fqdn -o tsv)

curl -sf "https://${APP_URL}/api/health"
# Expected: {"status":"healthy",...}
```

### Verify image tags in ACR

```bash
az acr repository show-tags \
  --name acracroyogai6t2epo2hhajo \
  --repository acroyoga-web \
  --orderby time_desc \
  --top 10
# Should show nightly-YYYYMMDD and nightly-sha-XXXXXXX tags
```

### Wait for scheduled run

The workflow triggers automatically at midnight UTC (±15 minutes). After the first scheduled run, verify the workflow ran and check the nightly environment.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| OIDC login fails in build-and-push | Staging identity missing main-branch FIC | Verify `addMainBranchFic: true` in staging Bicep deployment |
| OIDC login fails in deploy-nightly | Nightly identity missing environment FIC | Verify `githubOrg` and `githubRepo` params in nightly Bicep deployment |
| ACR push fails | Staging identity missing AcrPush role | Check role assignments on shared ACR |
| Container app can't pull image | Nightly identity missing AcrPull on shared ACR | Run step 1c above |
| Deploy fails with "container app not found" | Nightly infrastructure not provisioned | Run step 1b above |
| Smoke test fails after deploy | App still starting or DB migration running | Increase `--retry` count in curl; check app logs |
