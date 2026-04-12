# Quickstart: Azure Nightly Publish Workflow

**Feature**: 020-azure-nightly-publish

This guide covers the one-time manual Azure setup. The GitHub Actions workflow handles everything else (Bicep infrastructure deployment, container build, app deployment).

## Prerequisites

1. **Azure CLI** (`az`) installed and authenticated (`az login`)
2. **Existing staging deployment** with a shared ACR in `rg-acroyoga-stg`
3. **GitHub repository admin access** to create an environment

## Step 1: Create Azure Resources (one-time, ~5 minutes)

Run the entire block below as a single script. It creates:
- A resource group (`rg-acroyoga-nightly`)
- A user-assigned managed identity with a GitHub Actions OIDC federated credential
- Role assignments: **Owner** on the nightly RG, **AcrPush** + **AcrPull** on the shared ACR

```bash
# ── Variables ──
RG_NIGHTLY="rg-acroyoga-nightly"
RG_STAGING="rg-acroyoga-stg"
IDENTITY_NAME="id-acroyoga-nightly"
LOCATION="eastus2"
GH_REPO="microsoft/CommunityManagement-Sample-Spec-Kit"

# ── 1. Resource group ──
az group create --name "$RG_NIGHTLY" --location "$LOCATION" \
  --tags environment=nightly project=acroyoga-community managedBy=bicep

# ── 2. Managed identity ──
az identity create --name "$IDENTITY_NAME" --resource-group "$RG_NIGHTLY" --location "$LOCATION"

# ── 3. Federated identity credential (OIDC) ──
#    Subject: environment:nightly — matches all jobs with `environment: nightly`
az identity federated-credential create \
  --name "github-actions-env-nightly" \
  --identity-name "$IDENTITY_NAME" \
  --resource-group "$RG_NIGHTLY" \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:${GH_REPO}:environment:nightly" \
  --audiences "api://AzureADTokenExchange"

# ── 4. Role assignments ──
PRINCIPAL_ID=$(az identity show --name "$IDENTITY_NAME" --resource-group "$RG_NIGHTLY" --query principalId -o tsv)
RG_ID=$(az group show --name "$RG_NIGHTLY" --query id -o tsv)
ACR_ID=$(az acr list --resource-group "$RG_STAGING" --query "[0].id" -o tsv)

# Owner on nightly RG (needed for Bicep to create resources and role assignments)
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role Owner --scope "$RG_ID"

# AcrPush on shared ACR (needed for Docker image push)
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role AcrPush --scope "$ACR_ID"

# AcrPull on shared ACR (needed for Container App to pull images)
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role AcrPull --scope "$ACR_ID"

# ── 5. Print values for GitHub secrets ──
echo ""
echo "=== Add these as GitHub environment secrets (nightly) ==="
echo "AZURE_CLIENT_ID_NIGHTLY : $(az identity show --name "$IDENTITY_NAME" --resource-group "$RG_NIGHTLY" --query clientId -o tsv)"
echo "AZURE_TENANT_ID         : $(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID   : $(az account show --query id -o tsv)"
echo "AZURE_CONTAINER_REGISTRY: $(az acr list --resource-group "$RG_STAGING" --query "[0].loginServer" -o tsv)"
echo "DB_ADMIN_PASSWORD       : (generate one, e.g.: openssl rand -base64 24)"
```

## Step 2: Create GitHub Environment (~2 minutes)

1. Go to **Settings → Environments → New environment** → name it **`nightly`**
2. No protection rules or required reviewers (nightly is non-user-facing)
3. Add **5 secrets** using the values printed by step 1:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID_NIGHTLY` | Client ID of `id-acroyoga-nightly` |
| `AZURE_TENANT_ID` | Your Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |
| `AZURE_CONTAINER_REGISTRY` | Shared ACR login server (e.g. `acracroyoga....azurecr.io`) |
| `DB_ADMIN_PASSWORD` | A strong password for the nightly Postgres admin user |

## Step 3: Trigger & Verify

### First run (manual)

1. Go to **Actions → Nightly Build & Deploy → Run workflow** (select `main` branch)
2. The first run deploys all infrastructure via Bicep (~15–20 min). Subsequent runs are ~5 min.
3. Three jobs run in sequence: **validate** → **build-and-push** → **deploy**

### Verify

```bash
APP_URL=$(az containerapp show \
  --name ca-acroyoga-web-nightly \
  --resource-group rg-acroyoga-nightly \
  --query properties.configuration.ingress.fqdn -o tsv)

curl -sf "https://${APP_URL}/api/health"
# Expected: {"status":"healthy",...}
```

### Automatic trigger

The workflow runs automatically at **midnight UTC** daily. GitHub's built-in notifications alert on failures.

## What the Workflow Deploys

The `deploy` job runs `az deployment group create` with `infra/main.bicep` + `infra/main.parameters.nightly.json`. This creates/updates in `rg-acroyoga-nightly`:

| Resource | Notes |
|----------|-------|
| Managed identity | Idempotent — already exists from step 1 |
| PostgreSQL Flexible Server | `Standard_B1ms`, 32 GB |
| Storage account | Blob storage for uploads |
| Key Vault | Secrets for app config |
| Log Analytics + App Insights | Basic monitoring (no alert rules) |
| Container App Environment | Consumption workload |
| Container App | `ca-acroyoga-web-nightly`, scales 0–2 |

**Not deployed** (cost savings): Front Door, Container Registry (uses shared ACR), monitoring alerts, DB Wake custom role.

**Mock values** (no real accounts needed): Stripe keys (`sk_test_nightly_mock_...`), Entra IDs (`00000000-...`). The app starts and serves pages; payment and auth features return errors, which is expected for nightly.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| OIDC login fails | FIC subject mismatch | Verify FIC subject is `repo:microsoft/CommunityManagement-Sample-Spec-Kit:environment:nightly` |
| ACR push denied | Missing AcrPush role | Re-run the `az role assignment create --role AcrPush` command |
| Bicep deploy fails on role assignment | Identity needs Owner, not Contributor | Re-run the `az role assignment create --role Owner` command |
| Container app can't pull image | Missing AcrPull role | Re-run the `az role assignment create --role AcrPull` command |
| Smoke test fails | App still starting or DB migrating | Increase `--retry` count; check `az containerapp logs show` |
| First deploy takes 15+ min | Normal — PostgreSQL provisioning is slow | Subsequent deploys are ~5 min |
