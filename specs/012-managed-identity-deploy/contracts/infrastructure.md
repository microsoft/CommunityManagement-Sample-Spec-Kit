# Infrastructure Contract: 012-managed-identity-deploy

**Date**: 2026-03-23 | **Spec**: `specs/012-managed-identity-deploy/spec.md`

## Devcontainer Contract

**File**: `.devcontainer/devcontainer.json`

The devcontainer MUST provide the following environment:

| Requirement | Value |
|-------------|-------|
| Node.js version | 22.x |
| Package manager | npm (from Node.js base image) |
| Azure CLI | Latest via `ghcr.io/devcontainers/features/azure-cli` |
| GitHub CLI | Latest via `ghcr.io/devcontainers/features/github-cli` |
| PostgreSQL client | Latest via `ghcr.io/devcontainers/features/postgresql` |
| Post-create action | `npm ci --force` |
| Forwarded ports | 3000 (Next.js dev server) |

---

## Bicep Deployment Contract

**Entry point**: `infra/main.bicep`
**Parameters**: `infra/main.parameters.json` + CLI overrides

### Required Parameter Overrides

| Parameter | Value | Notes |
|-----------|-------|-------|
| `environmentName` | `staging` | Determines resource naming |
| `location` | `uksouth` | Azure region |
| `imageTag` | `latest` | Container image tag |
| `dbAdminLogin` | (secret) | From parameter file |
| `dbAdminPassword` | (secret) | From parameter file |

### Expected Deployment Outputs

| Output | Source Module | Description |
|--------|-------------|-------------|
| Container App FQDN | `container-apps` | Publicly accessible hostname |
| ACR Login Server | `container-registry` | Registry URL for image push |
| Key Vault Name | `key-vault` | Vault name for secret references |

---

## Endpoint Verification Contract

All endpoints MUST return HTTP 200 within 2 minutes of deployment completion.

| Endpoint | URL | Success Criteria |
|----------|-----|-----------------|
| Container App Health | `https://ca-acroyoga-web-staging.salmontree-d5cceffd.uksouth.azurecontainerapps.io/api/health` | HTTP 200 |
| Container App Ready | `https://ca-acroyoga-web-staging.salmontree-d5cceffd.uksouth.azurecontainerapps.io/api/ready` | HTTP 200 (confirms MI auth to DB + Storage) |
| Front Door Health | `https://acro-i6t2epo2hhajo-gcdgg7b8cgdndebz.b01.azurefd.net/api/health` | HTTP 200 (confirms CDN routing) |

---

## Container Image Contract

| Field | Value |
|-------|-------|
| Registry | `acracroyogai6t2epo2hhajo.azurecr.io` |
| Image | `acroyoga-web` |
| Tag | `latest` |
| Base | `node:22-alpine` |
| Required dependency | `@azure/identity ^4.6.0` must be in installed packages |
| Build method | `az acr build` (remote build on ACR) |

---

## Error Recovery Contract

| Error | Recovery Action |
|-------|----------------|
| `ContainerAppSecretInUse` | Deactivate old revisions referencing removed secrets, then retry deployment |
| ACR build transient failure | Retry build once before reporting failure |
| Health endpoint non-200 | Wait 60s and retry; if still failing, check container logs |
| Ready endpoint non-200 but Health is 200 | MI auth failure — check role assignments, env vars, database Entra admin config |
