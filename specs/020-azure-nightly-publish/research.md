# Research: Azure Nightly Publish Workflow

**Feature**: 020-azure-nightly-publish  
**Date**: 2025-07-09  
**Status**: Complete

## R-001: GitHub Actions Cron Schedule Syntax

**Decision**: Use `cron: '0 0 * * *'` for midnight UTC daily.

**Rationale**: Standard POSIX cron expression; explicit and widely understood. GitHub Actions cron schedules have a known imprecision of ±5–15 minutes due to shared runner infrastructure. The spec (Assumptions section) explicitly acknowledges and accepts this imprecision.

**Alternatives considered**:
- `@daily` / `@midnight` — less explicit, not supported in GitHub Actions cron syntax
- Earlier/later schedule — midnight UTC is specified in FR-002

## R-002: Concurrency Controls

**Decision**: Use workflow-level `concurrency` block with `cancel-in-progress: false` (queue, don't cancel).

**Rationale**: For nightly builds, it's preferable to let a running validation+deploy complete rather than cancel it mid-deploy. If a manual trigger fires while a scheduled run is in progress, the manual run queues. This prevents partial deployments. The spec (edge case) says "the later run waits or is cancelled based on the configured concurrency policy" — queuing is safer.

**Alternatives considered**:
- `cancel-in-progress: true` — risks cancelling a deploy mid-flight, leaving nightly in a bad state
- No concurrency controls — could cause overlapping ACR pushes with the same date tag, race conditions on the container app revision

**YAML pattern**:
```yaml
concurrency:
  group: nightly-build
  cancel-in-progress: false
```

## R-003: Workflow Trigger Strategy (schedule + workflow_dispatch)

**Decision**: Combine `schedule` and `workflow_dispatch` in a single workflow file with no inputs on `workflow_dispatch`.

**Rationale**: A single workflow file can use both triggers. The nightly pipeline runs the same steps regardless of trigger source — no conditional logic needed. The `github.event_name` context distinguishes triggers if needed for logging, but all steps execute identically.

**Alternatives considered**:
- Separate workflows for schedule vs. manual — violates DRY; both run identical pipelines
- `workflow_dispatch` with optional `skip-tests` input — spec requires full validation on every run (FR-013); no skip option appropriate

**Caveats**:
- `inputs` are only available for `workflow_dispatch` events; when triggered via `schedule`, `inputs.*` is null. Since we have no inputs, this is a non-issue.

## R-004: Image Tagging Strategy

**Decision**: Tag each nightly image with both `nightly-YYYYMMDD` (date) and `nightly-sha-{short_sha}` (commit). Use UTC date at build time per spec assumption.

**Rationale**: Date tag provides human-readable identification; commit tag provides exact source traceability. Same-day re-runs overwrite the date tag (acceptable per spec edge case) while commit tags remain unique. Tags use a `nightly-` prefix that clearly distinguishes them from staging (`sha-{full_sha}`) and production tags.

**Alternatives considered**:
- Full SHA in tag — unnecessarily long; 7-char short SHA is standard and sufficient
- `nightly-latest` floating tag — adds complexity, not required by spec
- Build number tag — GitHub Actions `run_number` is less useful than commit SHA for traceability

**Generation pattern**:
```bash
DATE_TAG="nightly-$(date -u +'%Y%m%d')"
SHA_TAG="nightly-sha-${GITHUB_SHA:0:7}"
```

## R-005: Workflow Job Structure

**Decision**: Three-job structure: `validate` → `build-and-push` → `deploy-nightly`.

**Rationale**: Mirrors the proven pattern in `deploy.yml`. Separating validation from build allows clear failure identification (FR-013, SC-006). Separating build-and-push from deploy follows the existing OIDC credential separation: the build job uses the staging identity (which has the main-branch federated identity credential and ACR push rights), while the deploy job uses the nightly identity (with the `environment:nightly` FIC).

**Alternatives considered**:
- Two-job (validate → build-push-deploy combined) — would require the nightly identity to have ACR push access on the shared ACR via cross-resource-group RBAC, adding complexity
- Single job — poor failure identification; no clear gate between validation and deployment
- Reusable workflow calling CI — adds indirection; CI workflow is on push/PR triggers with different semantics

## R-006: OIDC Authentication Architecture

**Decision**: Build-and-push job uses the staging managed identity (main-branch FIC, ACR push access). Deploy job uses `environment: nightly` with the nightly managed identity (environment FIC, Container Apps deploy access).

**Rationale**: The existing `managed-identity.bicep` auto-creates FICs based on `environmentName`. Deploying the nightly infrastructure with `environmentName=nightly` creates identity `id-acroyoga-nightly` with FIC subject `repo:{org}/{repo}:environment:nightly`. The staging identity already has a main-branch FIC (`repo:{org}/{repo}:ref:refs/heads/main`) and ACR push roles on the shared registry. This approach requires zero changes to the managed-identity module and follows the exact pattern of `deploy.yml`.

**Alternatives considered**:
- Nightly identity for everything — requires cross-RG role assignment on the shared ACR; more complex IaC
- Shared identity for all environments — violates isolation principle (FR-011); single point of failure

**GitHub environment secrets needed for "nightly"**:
- `AZURE_CLIENT_ID` — staging identity client ID (for build-and-push, same as staging)
- `AZURE_CLIENT_ID_NIGHTLY` — nightly identity client ID (for deploy job)
- `AZURE_TENANT_ID` — shared across all environments
- `AZURE_SUBSCRIPTION_ID` — shared across all environments
- `AZURE_CONTAINER_REGISTRY` — shared ACR login server

## R-007: Bicep Infrastructure for Nightly Environment

**Decision**: Reuse existing `main.bicep` with two new conditional parameters (`deployFrontDoor` and `deployContainerRegistry`) to make optional modules skippable. Deploy nightly to `rg-acroyoga-nightly` with both set to `false`.

**Rationale**: The nightly environment needs the same application stack as staging/production (the app requires database, storage, key vault, monitoring). However, Front Door (CDN) is explicitly out of scope, and the container registry is shared across all environments. Making these modules conditional via boolean parameters keeps a single Bicep file (DRY) while allowing per-environment customization.

**Module analysis for nightly**:

| Module | Required | Rationale |
|--------|----------|-----------|
| Managed Identity | ✅ Yes | OIDC FIC + app auth (Constitution XIV) |
| Container Registry | ❌ Skip | Shared with staging; nightly uses existing ACR |
| Monitoring | ✅ Yes | Log Analytics required by Container Apps environment |
| Database | ✅ Yes | App requires PostgreSQL to start and serve requests |
| Storage | ✅ Yes | App references blob storage endpoint |
| Key Vault | ✅ Yes | App secrets (nextauth, stripe, entra, etc.) |
| Container Apps | ✅ Yes | Core deployment target |
| Front Door | ❌ Skip | Not user-facing; out of scope per spec |
| Monitoring Alerts | ❌ Skip | Cost optimization; nightly failures visible in GitHub Actions |

**Alternatives considered**:
- Separate `main-nightly.bicep` — duplicates most of main.bicep; harder to maintain
- Deploy full stack including Front Door — unnecessary cost and complexity; violates spec scope
- Minimal deployment (container app only, no database) — app won't start without database; smoke tests would fail

**Nightly-specific parameters**:
```
environmentName: 'nightly'
deployFrontDoor: false
deployContainerRegistry: false
containerRegistryLoginServer: '<shared-acr>.azurecr.io'  # passed explicitly when own ACR not deployed
minReplicas: 0
maxReplicas: 2
cpuCores: '0.5'
memorySize: '1Gi'
dbSkuName: 'Standard_B1ms'
dbStorageSizeGB: 32
```

## R-008: Smoke Test Strategy

**Decision**: Reuse the exact smoke test pattern from `deploy.yml` staging deployment: health endpoint check (`/api/health`), readiness wait (`/api/ready`), and home page load.

**Rationale**: The existing deploy workflow's smoke tests (lines 84–101 of `deploy.yml`) verify the same aspects specified in FR-009 and SC-005. Replicating these steps ensures consistency and avoids inventing new test patterns. The health endpoint returns `{"status":"healthy"}`, the readiness endpoint confirms the app is accepting traffic, and the home page load confirms the full rendering pipeline works.

**Alternatives considered**:
- Playwright-based smoke tests against the nightly URL — overkill for deployment verification; E2E tests already run in the validate job
- Custom smoke test script — unnecessary complexity; existing curl-based pattern is proven

## R-009: Environment-Name Parameterisation in main.bicep

**Decision**: The existing `environmentName` parameter already supports arbitrary environment names. Passing `environmentName='nightly'` creates correctly named resources (`id-acroyoga-nightly`, `cae-acroyoga-nightly`, `ca-acroyoga-web-nightly`, etc.) with no code changes needed in any module except the Front Door and ACR conditionality.

**Rationale**: All Bicep modules use `environmentName` in resource names via interpolation (e.g., `var appName = 'ca-acroyoga-web-${environmentName}'`). The existing parameter description says "staging or production" but this is a documentation constraint, not a code constraint. Adding "nightly" requires only updating the description.

**Alternatives considered**:
- Adding an `@allowed` decorator to restrict environment names — would break nightly; current code correctly avoids this restriction
- Hardcoding nightly-specific resource names — breaks the parameterised pattern; not DRY
