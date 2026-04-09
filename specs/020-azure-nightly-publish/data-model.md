# Data Model: Azure Nightly Publish Workflow

**Feature**: 020-azure-nightly-publish  
**Date**: 2025-07-09

This feature does not introduce traditional application data entities (database tables, models). Instead, it introduces **infrastructure entities** and **CI/CD configuration entities** that form the data model for the nightly build and deployment system.

## Infrastructure Entities

### 1. Nightly Resource Group

**Azure Resource**: `Microsoft.Resources/resourceGroups`

| Property | Value | Notes |
|----------|-------|-------|
| name | `rg-acroyoga-nightly` | Follows existing convention: `rg-acroyoga-{env}` |
| location | `eastus2` | Same region as staging/production |
| tags.environment | `nightly` | |
| tags.project | `acroyoga-community` | |
| tags.managedBy | `bicep` | |

**Relationships**: Contains all nightly Azure resources. Isolated from `rg-acroyoga-stg` and `rg-acroyoga-prod`.

### 2. Nightly Managed Identity

**Azure Resource**: `Microsoft.ManagedIdentity/userAssignedIdentities`

| Property | Value | Notes |
|----------|-------|-------|
| name | `id-acroyoga-nightly` | Pattern: `id-acroyoga-{env}` |
| federatedCredentials[0].name | `github-actions-env-nightly` | OIDC for deploy job |
| federatedCredentials[0].subject | `repo:{org}/{repo}:environment:nightly` | GitHub environment binding |
| federatedCredentials[0].issuer | `https://token.actions.githubusercontent.com` | GitHub OIDC issuer |
| federatedCredentials[0].audiences | `['api://AzureADTokenExchange']` | Standard Entra audience |

**Relationships**: Used by Container App (pull image, access Key Vault, auth to PostgreSQL). Referenced by deploy job via OIDC.

**Validation**: Must have AcrPull role on shared ACR (cross-RG assignment needed).

### 3. Nightly Container App Environment

**Azure Resource**: `Microsoft.App/managedEnvironments`

| Property | Value | Notes |
|----------|-------|-------|
| name | `cae-acroyoga-nightly` | Pattern: `cae-acroyoga-{env}` |
| workloadProfiles | `[{ name: 'Consumption', type: 'Consumption' }]` | Consumption plan |
| appLogsConfiguration | Log Analytics destination | Shared monitoring workspace |

### 4. Nightly Container App

**Azure Resource**: `Microsoft.App/containerApps`

| Property | Value | Notes |
|----------|-------|-------|
| name | `ca-acroyoga-web-nightly` | Pattern: `ca-acroyoga-web-{env}` |
| identity.type | `UserAssigned` | Constitution XIV |
| configuration.ingress.external | `true` | Public access for smoke tests |
| configuration.ingress.targetPort | `3000` | Standard Next.js port |
| template.scale.minReplicas | `0` | Cold start acceptable |
| template.scale.maxReplicas | `2` | Minimal scaling for nightly |
| template.containers[0].resources.cpu | `0.5` | Minimal compute |
| template.containers[0].resources.memory | `1Gi` | Minimal memory |

**Relationships**: Lives in nightly Container App Environment. Pulls image from shared ACR. References Key Vault secrets. Connected to nightly PostgreSQL.

### 5. Nightly Database

**Azure Resource**: `Microsoft.DBforPostgreSQL/flexibleServers`

| Property | Value | Notes |
|----------|-------|-------|
| name | `psql-acroyoga-nightly-{unique}` | Pattern from database module |
| sku.name | `Standard_B1ms` | Minimal burstable tier |
| storage.storageSizeGB | `32` | Minimum storage |
| database | `acroyoga` | Standard database name |

**Validation**: Managed Identity authentication enabled (Constitution XIV).

### 6. Nightly Key Vault

**Azure Resource**: `Microsoft.KeyVault/vaults`

| Property | Value | Notes |
|----------|-------|-------|
| name | `kv-acroyoga-nightly-{unique}` | Pattern from key-vault module |
| secrets | database-url, nextauth-secret, nextauth-url, stripe-*, entra-*, appinsights | Same secret set as staging/production |

## CI/CD Configuration Entities

### 7. GitHub Environment: nightly

| Property | Value | Notes |
|----------|-------|-------|
| name | `nightly` | Separate from `staging` and `production` |
| secrets.AZURE_CLIENT_ID_NIGHTLY | `{nightly-identity-client-id}` | From `id-acroyoga-nightly` |
| secrets.AZURE_TENANT_ID | `{shared-tenant-id}` | Same tenant for all envs |
| secrets.AZURE_SUBSCRIPTION_ID | `{shared-subscription-id}` | Same subscription |
| secrets.AZURE_CONTAINER_REGISTRY | `{shared-acr-login-server}` | Shared ACR |
| protection_rules | None (optional) | No approval gates for nightly |

### 8. Container Image Tags

| Tag Pattern | Example | Purpose |
|-------------|---------|---------|
| `nightly-YYYYMMDD` | `nightly-20250709` | Date-based identification |
| `nightly-sha-{short_sha}` | `nightly-sha-a1b2c3d` | Commit traceability |

**Validation rules**:
- Date tag uses UTC date at build time
- Short SHA is first 7 characters of `GITHUB_SHA`
- Date tag is overwritten on same-day re-runs
- SHA tag is unique per commit
- Neither conflicts with staging/production tags (which use `sha-{full_sha}` format)

### 9. Nightly Workflow Definition

| Property | Value |
|----------|-------|
| File | `.github/workflows/nightly.yml` |
| Triggers | `schedule: cron '0 0 * * *'`, `workflow_dispatch` |
| Concurrency group | `nightly-build` |
| cancel-in-progress | `false` |
| Jobs | `validate` → `build-and-push` → `deploy-nightly` |

**State transitions** (workflow run):

```
[Triggered] → [Validating] → [Building] → [Deploying] → [Smoke Testing] → [Complete ✅]
                   ↓               ↓             ↓              ↓
               [Failed ❌]     [Failed ❌]   [Failed ❌]    [Failed ❌]
```

- Validation failure → no build, no deploy (FR-013)
- Build failure → no deploy
- Deploy failure → smoke tests skipped
- Smoke test failure → workflow marked failed, nightly env has new (potentially broken) image

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Repository                                           │
│                                                             │
│  ┌─────────────────┐     ┌──────────────────────┐          │
│  │ nightly.yml     │────▶│ GitHub Env: nightly   │          │
│  │ (workflow)       │     │ (secrets, OIDC)       │          │
│  └────────┬────────┘     └──────────┬───────────┘          │
│           │                          │                       │
└───────────┼──────────────────────────┼───────────────────────┘
            │ triggers                 │ OIDC auth
            ▼                          ▼
┌───────────────────────────────────────────────────────────────┐
│ Shared ACR (rg-acroyoga-stg)                                 │
│  ┌─────────────────────────────────────┐                     │
│  │ acroyoga-web:nightly-20250709       │                     │
│  │ acroyoga-web:nightly-sha-a1b2c3d    │                     │
│  │ acroyoga-web:sha-{full}  (staging)  │                     │
│  │ acroyoga-web:sha-{full}  (prod)     │                     │
│  └─────────────────────────────────────┘                     │
└───────────────────────────────────────────────────────────────┘
            │ image pull
            ▼
┌───────────────────────────────────────────────────────────────┐
│ rg-acroyoga-nightly                                          │
│                                                               │
│  ┌──────────────────┐    ┌─────────────────────────┐         │
│  │ id-acroyoga-     │───▶│ ca-acroyoga-web-nightly │         │
│  │ nightly (MI)     │    │ (Container App)          │         │
│  └──────┬───────────┘    └────────┬────────────────┘         │
│         │                         │                           │
│         ▼                         ▼                           │
│  ┌──────────────┐    ┌──────────────────┐   ┌────────────┐  │
│  │ Key Vault    │    │ PostgreSQL       │   │ Storage    │  │
│  │ (secrets)    │    │ (nightly DB)     │   │ (blobs)    │  │
│  └──────────────┘    └──────────────────┘   └────────────┘  │
│                                                               │
│  ┌──────────────────────────────┐                            │
│  │ Log Analytics + App Insights │                            │
│  │ (monitoring)                 │                            │
│  └──────────────────────────────┘                            │
│                                                               │
│  [NO Front Door — out of scope]                              │
│  [NO Monitoring Alerts — cost optimization]                   │
└───────────────────────────────────────────────────────────────┘
```
