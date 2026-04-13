# Data Model: Optimised Deployment Pipeline

**Date**: 2025-07-14 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

> This feature has no database entities. The "data model" describes the pipeline
> entity structure — the jobs, their relationships, and the configuration
> parameters that govern their behaviour.

## Pipeline Entity Model

### Entity: Workflow (`nightly.yml`)

| Property | Type | Value | Spec Ref |
|----------|------|-------|----------|
| `name` | string | `"Nightly Build & Deploy"` | FR-017 |
| `schedule` | cron | `"0 0 * * *"` (midnight UTC) | FR-017 |
| `workflow_dispatch` | trigger | enabled | FR-017 |
| `concurrency.group` | string | `"nightly-build"` | FR-016 |
| `concurrency.cancel-in-progress` | bool | `false` | FR-016 |

### Entity: Job — `validate`

| Property | Type | Value | Spec Ref |
|----------|------|-------|----------|
| `timeout-minutes` | int | `45` | FR-001 |
| `runs-on` | string | `ubuntu-latest` | FR-015 |
| `permissions.contents` | string | `read` | — |
| Node.js version | string | `24` | FR-015 |
| npm cache | string | `npm` (via setup-node) | R-007 |

**Steps**: checkout → setup-node (cache: npm) → npm ci → tokens build → typecheck → lint → build web → bundle size check → test suites ×5 → Playwright install + E2E → i18n lint → Storybook build + a11y

**Error annotations**: Each test suite step wraps failures with `::error title=BUILD: {step}::` annotation.

### Entity: Job — `build-and-push`

| Property | Type | Value | Spec Ref |
|----------|------|-------|----------|
| `timeout-minutes` | int | `30` | FR-001 |
| `needs` | array | `[validate]` | — |
| `environment` | string | `nightly` | FR-017 |
| `permissions.id-token` | string | `write` | FR-014 |
| `permissions.contents` | string | `read` | — |

**Outputs**:
- `image-tag-date`: `nightly-YYYYMMDD`
- `image-tag-sha`: `nightly-sha-XXXXXXX`

**Steps**: checkout → Azure login (OIDC) → ACR login (with retry) → generate image tags → setup Docker buildx → build and push (with GHA cache) 

**Docker caching config**:
- Cache backend: `type=gha,mode=max`
- Cache key: derived from `Dockerfile` + `package-lock.json` content hash
- Fallback: full build on cache miss (FR-010)

### Entity: Job — `deploy`

| Property | Type | Value | Spec Ref |
|----------|------|-------|----------|
| `timeout-minutes` | int | `30` | FR-001 |
| `needs` | array | `[build-and-push]` | — |
| `environment` | string | `nightly` | FR-017 |
| `permissions.id-token` | string | `write` | FR-014 |
| `permissions.contents` | string | `read` | — |

**Environment variables**:
- `IMAGE_TAG`: from `build-and-push` outputs
- `RESOURCE_GROUP`: `rg-acroyoga-nightly`
- `APP_NAME`: `ca-acroyoga-web-nightly`

**Steps**: checkout → Azure login (OIDC) → Start PG if stopped (with retry + polling) → Validate Bicep → Deploy Bicep (with retry) → Wait for readiness (curl with annotations) → Smoke test health → Smoke test home page

### Entity: Infrastructure Wake-Up Sequence

| Step | Command | Max Wait | Retry | Annotation Category |
|------|---------|----------|-------|-------------------|
| List stopped PG servers | `az postgres flexible-server list` | — | 3 attempts | INFRASTRUCTURE |
| Start PG server | `az postgres flexible-server start` | — | 1 attempt | INFRASTRUCTURE |
| Poll PG readiness | `az postgres flexible-server show` | 5 min (30 × 10s) | built-in | TIMEOUT |

**State transitions**:
```
Stopped → Starting → Ready (success)
Stopped → Starting → [timeout after 5 min] → FAIL with ::error::
Already Ready → skip (no action needed)
```

### Entity: Error Annotation

| Field | Format | Example |
|-------|--------|---------|
| Level | `::error::` or `::warning::` | `::error::` |
| Title | `{CATEGORY}: {Step Name}` | `TIMEOUT: Wait for readiness` |
| Body | Actionable context | `Readiness check failed after 50 retries (750s). Endpoint: https://app.azurecontainerapps.io/api/ready` |

### Entity: Docker Layer Cache

| Property | Value |
|----------|-------|
| Backend | `type=gha` (GitHub Actions cache) |
| Mode | `max` (cache all layers including intermediate) |
| Max size | 10 GB (GitHub Actions cache limit per repo) |
| Scope | `buildkit-nightly` |
| Fallback | Full build on cache miss |

## Relationships

```
Workflow
  ├── validate (Job)
  │   └── [no dependencies]
  ├── build-and-push (Job)
  │   ├── needs: validate
  │   └── uses: Docker Layer Cache
  └── deploy (Job)
      ├── needs: build-and-push
      ├── triggers: Infrastructure Wake-Up Sequence
      ├── runs: Bicep Validation + Deployment
      └── runs: Readiness Check + Smoke Tests
```

## Bicep Parameter Changes

### `infra/modules/database.bicep` — Remove unused param

| Change | Parameter | Reason |
|--------|-----------|--------|
| REMOVE | `managedIdentityClientId` (line 25) | Declared but never referenced in module body |

**Caller impact**: Remove `managedIdentityClientId: identity.outputs.clientId` from `infra/main.bicep` line 151.

### `infra/modules/front-door.bicep` — Remove unused param

| Change | Parameter | Reason |
|--------|-----------|--------|
| REMOVE | `customDomainHostname` (line 5) | Declared but never referenced in module body |

**Caller impact**: None — `infra/main.bicep` doesn't pass this parameter to the front-door module.
