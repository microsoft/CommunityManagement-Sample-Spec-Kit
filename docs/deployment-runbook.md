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
Push to main → ci-full.yml passes → deploy.yml triggers:
  1. Build container image → push to ACR
  2. Deploy to staging → run smoke tests (readiness + health + home page)
  3. Manual approval → promote to production
```

### Self-Healing Deployment (`deploy-and-heal.yml`)

For staging and nightly environments, the self-healing pipeline automates
failure recovery (Constitution XV):

```
Trigger deploy-and-heal.yml (manual, scheduled, or nightly failure):
  1. Build & push container image to ACR
  2. Record baseline (known-good) revision
  3. Deploy new revision to Container App
  4. Run smoke tests (readiness, health, home page) via composite action
     ├── ✅ All pass → deployment successful, exit
     └── ❌ Any fail → collect structured diagnostics
  5. Classify error (runtime | dependency | config | credential | infra)
  6. Create GitHub issue with diagnostics (labels: deploy-fix-auto, copilot)
  7. Copilot agent picks up issue, diagnoses, implements fix, opens PR
  8. PR goes through Tier 1 → Tier 2 CI → auto-merge
  9. Exponential backoff (60s → 120s → 240s), then rebuild & redeploy (go to step 3)
  10. After 3 iterations → rollback to baseline revision → create 'needs-human-review' issue
```

**Automatic rollback**: When all self-heal iterations are exhausted, the
pipeline automatically activates the baseline revision that was running before
the deploy began, shifts 100% traffic to it, and deactivates the broken
revision. This ensures the environment is restored to a working state before
escalating to human review.

**Nightly integration**: The `deploy-and-heal.yml` workflow has a `workflow_run`
trigger that fires when `Nightly Build & Deploy` completes with failure. This
means nightly deploy failures automatically enter the self-healing loop without
manual intervention.

**Error categories:**
| Category | Auto-fixable | Examples |
|----------|:---:|---------|
| `runtime` | ✅ | Crash loops, health check failures, startup errors |
| `dependency` | ✅ | Missing modules, import errors |
| `config` | ✅ | Wrong env vars in code, misconfigured routes |
| `credential` | ❌ | Expired secrets, missing OIDC, RBAC errors, Key Vault access denied |
| `infra` | ❌ | Bicep errors, resource quota, networking |

**Manual trigger:**
```bash
gh workflow run deploy-and-heal.yml \
  -f environment=staging \
  -f max-heal-iterations=3
```

**With a specific image tag:**
```bash
gh workflow run deploy-and-heal.yml \
  -f environment=nightly \
  -f image-tag=nightly-20260414
```

### When Human Review Is Escalated

When the self-healing pipeline creates an issue with the `needs-human-review`
label, a human must:

1. **Review the issue** — read the error category, logs, and smoke test results
2. **Check the rollback** — verify the baseline revision is active and healthy
3. **Investigate root cause** — use the diagnostics to identify the failure
4. **Apply a fix** — either manually fix or re-assign to an agent with guidance
5. **Redeploy** — trigger `deploy-and-heal.yml` manually after the fix merges

### Diagnostics JSON Schema

The `deploy-diagnostics` action produces a JSON artifact with this structure:

```json
{
  "timestamp": "2026-04-14T16:00:00Z",
  "appName": "ca-acroyoga-web-staging",
  "resourceGroup": "rg-acroyoga-stg",
  "revision": { /* az containerapp revision show output */ },
  "containerLogs": [ /* az containerapp logs show output */ ],
  "systemLogs": [ /* az containerapp logs show --type system output */ ],
  "deploymentOperations": [ /* az deployment group list — failed ops */ ],
  "appConfig": {
    "ingress": { /* ingress config */ },
    "activeRevisions": "Single",
    "latestRevision": "ca-acroyoga-web-staging--h1-abc123",
    "latestReady": "ca-acroyoga-web-staging--previous"
  },
  "smokeTestResults": {
    "readiness": "pass|fail",
    "health": "pass|fail",
    "homepage": "pass|fail",
    "readyResponse": { /* /api/ready response body */ },
    "healthResponse": { /* /api/health response body */ }
  }
}
```

The `classify-error` action reads this JSON and outputs an `error-category`
(`runtime`, `dependency`, `config`, `credential`, `infra`, or `unknown`) and
a human-readable `summary`.

### PR Lifecycle

```
PR opened → ci-fast.yml (Tier 1: typecheck + lint + affected tests)
  ↓ passes
'ready-for-merge' label applied (auto for agent PRs, manual for human PRs)
  ↓
ci-full.yml (Tier 2: full test suite, build, bundle size, Storybook, E2E)
  ↓ passes
Auto-merge (agent PRs) or manual merge (human PRs)
```

### Manual Deployment

```bash
gh workflow run deploy.yml -f environment=production -f image-tag=sha-abc1234
```

## GitHub Secrets Required

| Secret | Description | Used by |
|--------|-------------|---------|
| `AZURE_CLIENT_ID` | App registration client ID for staging OIDC login | `deploy.yml`, `deploy-and-heal.yml` (staging) |
| `AZURE_CLIENT_ID_NIGHTLY` | App registration client ID for nightly/canary OIDC login | `nightly.yml`, `deploy-and-heal.yml` (nightly/canary) |
| `AZURE_TENANT_ID` | Azure AD tenant ID | All deploy workflows |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | All deploy workflows |
| `AZURE_CONTAINER_REGISTRY` | ACR login server (e.g. `acracroyoga.azurecr.io`) | All deploy workflows |
| `DB_ADMIN_PASSWORD` | PostgreSQL admin password | Bicep deployments |

### OIDC Identity Setup

Each environment needs an Azure AD App Registration with federated credentials
for GitHub Actions OIDC. The nightly identity is shared by nightly and canary.

```bash
# Create app registration for nightly/canary
az ad app create --display-name "github-actions-nightly"
# Note the appId → store as AZURE_CLIENT_ID_NIGHTLY

# Add federated credential for the nightly GitHub Environment
az ad app federated-credential create --id <app-object-id> --parameters '{
  "name": "github-actions-nightly",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:microsoft/CommunityManagement-Sample-Spec-Kit:environment:nightly",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Add federated credential for the canary GitHub Environment
az ad app federated-credential create --id <app-object-id> --parameters '{
  "name": "github-actions-canary",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:microsoft/CommunityManagement-Sample-Spec-Kit:environment:canary",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Grant Owner role on the nightly resource group
az role assignment create \
  --assignee <app-id> \
  --role Owner \
  --scope /subscriptions/<sub-id>/resourceGroups/rg-acroyoga-nightly

# Grant AcrPush on the container registry
az role assignment create \
  --assignee <app-id> \
  --role AcrPush \
  --scope /subscriptions/<sub-id>/resourceGroups/<acr-rg>/providers/Microsoft.ContainerRegistry/registries/<acr-name>
```

## GitHub Environments

| Environment | Protection Rules | Used by |
|-------------|-----------------|---------|
| `nightly` | None — auto-deploy on schedule | `nightly.yml`, `deploy-and-heal.yml` (default) |
| `staging` | None (auto-deploy on merge) | `deploy.yml` |
| `production` | Required reviewers (1+), deployment branch: `main` | `deploy.yml` |
| `canary` | None — used for autonomous pipeline testing with traffic splitting | `deploy-and-heal.yml` |

### Creating GitHub Environments

Environments must be created in **Settings → Environments** before the workflows
can reference them. Each environment needs access to the repository secrets above.

### GitHub Labels Required

The self-healing pipeline creates issues with these labels (auto-created on
first run if missing):

| Label | Purpose |
|-------|---------|
| `deploy-fix-auto` | Marks auto-created deployment fix issues |
| `copilot` | Assigns issue to Copilot agent for autonomous fix |
| `needs-human-review` | Escalation — agent cannot fix autonomously |

### Canary Environment

The canary environment uses `activeRevisionsMode: "Multiple"` for traffic
splitting between old and new revisions. Deploy via the self-healing pipeline:

```bash
# Initial deployment (provisions infrastructure via Bicep)
gh workflow run deploy-and-heal.yml \
  -f environment=canary \
  -f deploy-infrastructure=true

# Subsequent deployments (update revision only)
gh workflow run deploy-and-heal.yml \
  -f environment=canary

# Deploy a specific image
gh workflow run deploy-and-heal.yml \
  -f environment=canary \
  -f image-tag=sha-abc1234
```

Canary uses the same cost-optimised settings as nightly (`minReplicas: 0`,
no Front Door, no monitoring alerts). Cold-start takes 5–10 minutes.

Parameters file: `infra/main.parameters.canary.json`

## Teardown

```bash
# Remove all resources for an environment
azd down --environment staging --purge --force
```

Key Vault soft-delete retains secrets for 90 days (purge protection enabled).
