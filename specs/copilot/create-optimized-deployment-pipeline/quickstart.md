# Quickstart: Optimised Deployment Pipeline

**Date**: 2025-07-14 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This feature modifies the existing `nightly.yml` workflow and cleans up two Bicep modules. There are no new files to create — all changes are in-place modifications.

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `.github/workflows/nightly.yml` | **Major** | Harden with timeouts, caching, annotations, retries |
| `infra/modules/database.bicep` | **Minor** | Remove unused `managedIdentityClientId` param |
| `infra/modules/front-door.bicep` | **Minor** | Remove unused `customDomainHostname` param |
| `infra/main.bicep` | **Minor** | Remove `managedIdentityClientId` from database module call |

## Implementation Order

### Step 1: Bicep Cleanup (Low Risk)

Remove unused parameters from Bicep modules first — these are independent, low-risk changes.

1. **`infra/modules/database.bicep`**: Delete the `managedIdentityClientId` parameter declaration (line 25) and its `@description` decorator (line 24)
2. **`infra/main.bicep`**: Remove `managedIdentityClientId: identity.outputs.clientId` from the database module invocation (line 151)
3. **`infra/modules/front-door.bicep`**: Delete the `customDomainHostname` parameter declaration (line 5) and its `@description` decorator (line 4)

### Step 2: Nightly Workflow — Job Timeouts

Add `timeout-minutes` to all three jobs:

```yaml
validate:
  timeout-minutes: 45
  # ... existing config

build-and-push:
  timeout-minutes: 30
  # ... existing config

deploy:
  timeout-minutes: 30
  # ... existing config
```

### Step 3: Nightly Workflow — Docker Layer Caching

Replace the plain `docker build` + `docker push` in the `build-and-push` job with:

1. Add `docker/setup-buildx-action` step after checkout
2. Replace the build/push step with `docker/build-push-action` using:
   - `push: true`
   - `tags:` with both date and SHA tags
   - `cache-from: type=gha`
   - `cache-to: type=gha,mode=max`

### Step 4: Nightly Workflow — Structured Annotations

Add `::error::` annotations to every failure-prone step. Pattern:

```bash
- name: Step Name
  run: |
    if ! command 2>&1; then
      echo "::error title=CATEGORY: Step Name::Message with context"
      exit 1
    fi
```

Key steps to annotate:
- PostgreSQL wake (INFRASTRUCTURE / TIMEOUT)
- Bicep validate (DEPLOYMENT)
- Bicep deploy (DEPLOYMENT)
- Readiness check (TIMEOUT)
- Smoke tests (SMOKE_TEST)
- Docker build/push (BUILD)
- ACR login (AUTHENTICATION)

### Step 5: Nightly Workflow — Retry Wrappers

Add retry logic to:
- ACR login: 3 attempts with 10s backoff
- Bicep deployment: 2 attempts with 60s backoff
- `az containerapp show`: 3 attempts with 5s backoff

### Step 6: Nightly Workflow — Bicep Pre-Validation

Add a new step before the Bicep deployment:

```bash
- name: Validate infrastructure (Bicep)
  run: |
    az deployment group validate \
      --resource-group ${{ env.RESOURCE_GROUP }} \
      --template-file infra/main.bicep \
      --parameters infra/main.parameters.nightly.json \
      --parameters [same params as deploy step]
```

### Step 7: Readiness Check Enhancement

Enhance the existing curl readiness check with:
- Timing instrumentation (`$SECONDS`)
- Structured `::error::` on timeout
- `::notice::` on success with elapsed time

## Verification

After implementation, verify by:

1. **Syntax check**: `yamllint .github/workflows/nightly.yml` or GitHub's workflow validator
2. **Bicep lint**: Run `az bicep build --file infra/main.bicep` to verify no warnings from removed params
3. **Trigger test**: Run `workflow_dispatch` to execute the nightly pipeline manually
4. **Cache verification**: Check the second run for Docker cache hits in the build-and-push job logs

## Key Constraints

- **DO NOT** modify `.github/workflows/ci.yml` (FR-018)
- **DO NOT** modify `.github/workflows/deploy.yml` (FR-018)
- **DO NOT** disable cost-saving configs (`minReplicas:0`, PG auto-stop)
- **PRESERVE** all existing nightly capabilities: triggers, tags, environment, smoke tests (FR-017)
- **USE** `azure/login@v3` for OIDC (FR-013, FR-014)
- **USE** `actions/checkout@v5` and `actions/setup-node@v5` (FR-013)
