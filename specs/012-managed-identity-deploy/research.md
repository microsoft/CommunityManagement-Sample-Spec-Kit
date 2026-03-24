# Research: 012-managed-identity-deploy

**Date**: 2026-03-23 | **Spec**: `specs/012-managed-identity-deploy/spec.md`

## R-001: Devcontainer Configuration for Codespaces (Constitution XIII)

**Decision**: Use a `.devcontainer/devcontainer.json` with `mcr.microsoft.com/devcontainers/javascript-node:22` base image plus Dev Container Features for Azure CLI, GitHub CLI, and PostgreSQL client.

**Rationale**: Dev Container Features are the idiomatic way to compose tooling on top of a base image. The `javascript-node:22` base provides Node.js 22 and npm. Features are declarative, cacheable, and maintained by the community. This avoids a custom Dockerfile for the devcontainer.

**Alternatives considered**:
- Custom devcontainer Dockerfile — rejected: higher maintenance, no benefit for our tooling needs
- `ubuntu` base + manual Node.js install — rejected: `javascript-node` base already optimised for this stack
- Codespace prebuilds — noted as a future optimisation but not required for initial setup

**Key constraints**:
- `postCreateCommand` should run `npm ci --force` to install all workspace dependencies
- `forwardPorts: [3000]` for the Next.js dev server
- Include `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode` as default extensions

---

## R-002: Constitution Sync (.specify/memory/constitution.md)

**Decision**: Wholesale file copy from `specs/constitution.md` to `.specify/memory/constitution.md`. No merge, no diff — full replacement.

**Rationale**: The `.specify/memory/` copy exists solely for spec-generation tooling to reference. It must be byte-identical to the authoritative source. The current copy is at v1.3.0; the authoritative source is at v1.5.0. A simple file copy is the safest and most deterministic approach.

**Alternatives considered**:
- Git-based merge/patch — rejected: unnecessary complexity for a governance file that should be an exact copy
- Symlink — rejected: symlinks may not resolve correctly in all Git clients and CI environments
- Automated sync hook — noted as future improvement; manual sync is sufficient for now

---

## R-003: Docker Image Rebuild with @azure/identity

**Decision**: Use `az acr build` to build the image remotely on ACR, using a temporary build context directory to avoid Windows path issues.

**Rationale**: ACR build eliminates the need for local Docker Desktop, runs in Linux natively (avoiding WSL path issues), and pushes directly to the registry. Previous successful builds used `$env:TEMP\acr-build-ctx2` as a staging directory to work around Windows path length and encoding issues with `az acr build`.

**Alternatives considered**:
- Local `docker build` + `docker push` — rejected: requires Docker Desktop on Windows, WSL path issues (Constitution XIII moved to Codespaces)
- GitHub Actions CI build — viable long-term but not yet configured; ACR build is immediate

**Key constraints**:
- Build context must be copied to a temp directory to avoid Windows path issues
- Tag: `acroyoga-web:latest` (and optionally a git SHA tag)
- Registry: `acracroyogai6t2epo2hhajo.azurecr.io`

---

## R-004: Bicep Deployment with Managed Identity Changes

**Decision**: Use `az deployment group create` targeting `infra/main.bicep` with the existing parameter file and overrides for `imageTag`.

**Rationale**: All Bicep modules have already been modified locally. The deployment applies these changes to Azure. Key changes: database.bicep adds Entra admin, storage.bicep removes connection string output (uses role assignment), container-apps.bicep adds `AZURE_CLIENT_ID`, `AZURE_STORAGE_ACCOUNT_URL`, `PGHOST`, `PGDATABASE` env vars, key-vault.bicep removes storage connection string secret.

**Alternatives considered**:
- Terraform — rejected: project already uses Bicep; migration adds no value
- ARM templates — rejected: Bicep is the preferred authoring format and already in use
- Incremental change via `az containerapp update` — rejected: full Bicep deploy ensures all resources are consistent

**Key constraints**:
- `ContainerAppSecretInUse` error possible if old revisions reference removed secrets → must deactivate old revisions first via `az containerapp revision deactivate`
- Deployment targets: `rg-acroyoga-stg`, subscription `ea77caf3-375b-4f1e-b3b0-03e58569567e`
- Parameter overrides: `imageTag=latest`, `environmentName=staging`, `location=uksouth`

---

## R-005: Endpoint Verification Strategy

**Decision**: Use `curl` (or `Invoke-WebRequest`) to health-check three endpoints after deployment: container app `/api/health`, container app `/api/ready`, and Front Door `/api/health`.

**Rationale**: These endpoints already exist in the application. `/api/health` is a liveness check (app is running). `/api/ready` is a readiness check (confirms database and storage connectivity via Managed Identity). Front Door health check confirms CDN routing.

**Alternatives considered**:
- Azure Monitor alerts — useful for ongoing monitoring but not immediate post-deploy verification
- Playwright E2E — too heavy for a deployment smoke test; reserved for feature testing

**Endpoints**:
- Container App health: `https://ca-acroyoga-web-staging.salmontree-d5cceffd.uksouth.azurecontainerapps.io/api/health`
- Container App ready: `https://ca-acroyoga-web-staging.salmontree-d5cceffd.uksouth.azurecontainerapps.io/api/ready`
- Front Door health: `https://acro-i6t2epo2hhajo-gcdgg7b8cgdndebz.b01.azurefd.net/api/health`

---

## R-006: Git Workflow for Publishing Changes

**Decision**: Commit all changes on the `012-managed-identity-deploy` feature branch, then merge to main and push. Use atomic commits grouped by logical change (infra, app code, devcontainer, governance).

**Rationale**: Feature branch workflow aligns with project's existing branching strategy. Logical grouping of commits improves reviewability and bisectability.

**Alternatives considered**:
- Single squash commit — rejected: loses granularity for a multi-concern change
- Direct to main — rejected: bypasses CI checks on the branch

---

## R-007: ContainerAppSecretInUse Error Handling

**Decision**: Before Bicep redeployment, list all active revisions. If deployment fails with `ContainerAppSecretInUse`, deactivate all non-latest revisions referencing removed secrets, then retry deployment.

**Rationale**: Azure Container Apps prevents removing secrets that are still referenced by active revisions. The storage connection string secret was removed from the Bicep template. Old revisions referencing it must be deactivated first.

**Commands**:
```bash
# List revisions
az containerapp revision list -n ca-acroyoga-web-staging -g rg-acroyoga-stg -o table

# Deactivate a specific old revision
az containerapp revision deactivate -n ca-acroyoga-web-staging -g rg-acroyoga-stg --revision <revision-name>

# Retry deployment
az deployment group create ...
```
