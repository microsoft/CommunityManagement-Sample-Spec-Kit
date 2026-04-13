# Contract: Nightly Workflow Interface

**Date**: 2025-07-14 | **Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

> This contract defines the external interface of the nightly workflow —
> its triggers, expected behaviour, outputs, and error signalling conventions.
> It serves as the specification that the implementation must satisfy.

## Workflow Triggers

### Schedule

```yaml
schedule:
  - cron: "0 0 * * *"  # Midnight UTC daily
```

### Manual

```yaml
workflow_dispatch: {}  # No input parameters
```

## Concurrency

```yaml
concurrency:
  group: nightly-build
  cancel-in-progress: false
```

**Behaviour**: Only one nightly run executes at a time. New triggers queue behind an in-progress run. The in-progress run is never cancelled — it runs to completion or timeout.

## Job Contracts

### Job 1: `validate`

| Property | Contract |
|----------|----------|
| **Timeout** | 45 minutes max |
| **Preconditions** | None (first job) |
| **Postconditions** | All CI quality gates pass: typecheck, lint, build, bundle size, 5 test suites, E2E, i18n lint, Storybook a11y |
| **Failure signal** | `::error title=BUILD: {step name}::` annotation for each failing step |
| **Outputs** | None |

### Job 2: `build-and-push`

| Property | Contract |
|----------|----------|
| **Timeout** | 30 minutes max |
| **Preconditions** | `validate` succeeded |
| **Postconditions** | Container image pushed to ACR with two tags |
| **Failure signal** | `::error title=BUILD: Docker build::` or `::error title=AUTHENTICATION: ACR login::` |
| **Outputs** | `image-tag-date` (string), `image-tag-sha` (string) |

**Image tag format**:
- Date tag: `nightly-YYYYMMDD` (e.g., `nightly-20250714`)
- SHA tag: `nightly-sha-XXXXXXX` (7-char commit SHA prefix)

### Job 3: `deploy`

| Property | Contract |
|----------|----------|
| **Timeout** | 30 minutes max |
| **Preconditions** | `build-and-push` succeeded; Azure nightly environment accessible |
| **Postconditions** | Infrastructure deployed, container running, health + readiness checks pass |
| **Failure signal** | Category-specific `::error::` annotations (see Error Annotation Contract below) |
| **Outputs** | None |

## Error Annotation Contract

Every failure-prone step MUST emit a structured annotation using this format:

```
::error title={CATEGORY}: {Step Name}::{Descriptive message with actionable context}
```

### Mandatory Annotations

| Step | Category | Context Variables |
|------|----------|-------------------|
| Start PostgreSQL server | `INFRASTRUCTURE` | Server name, current state |
| PG readiness poll timeout | `TIMEOUT` | Server name, last observed state, attempts |
| Bicep validate | `DEPLOYMENT` | Error message from `az deployment group validate` |
| Bicep deploy | `DEPLOYMENT` | Error message from `az deployment group create` |
| Readiness check timeout | `TIMEOUT` | Endpoint URL, retry count, elapsed time |
| Smoke test — health | `SMOKE_TEST` | Endpoint URL, response body (truncated) |
| Smoke test — home page | `SMOKE_TEST` | Endpoint URL, HTTP status code |
| ACR login failure | `AUTHENTICATION` | Registry name, error message |
| Docker build failure | `BUILD` | Exit code |
| Docker push failure | `BUILD` | Registry name, tag, error message |

### Warning Annotations

```
::warning title={CATEGORY}: {Step Name}::{Informational message}
```

Used for:
- Cache miss on Docker build (not a failure, but worth noting)
- PG server was already running (informational skip)

### Notice Annotations

```
::notice title={Step Name}::{Timing or status information}
```

Used for:
- Readiness check succeeded with elapsed time
- PG server started successfully with elapsed time
- Docker build completed with cache hit/miss status

## Bicep Module Contracts

### `database.bicep` — Post-Cleanup Parameters

```bicep
param environmentName string
param location string = resourceGroup().location
@secure() param adminLogin string
@secure() param adminPassword string
param skuName string = 'Standard_B1ms'
param storageSizeGB int = 32
param managedIdentityPrincipalId string
// REMOVED: param managedIdentityClientId string (unused)
param deployDbWakeRole bool = true
```

### `front-door.bicep` — Post-Cleanup Parameters

```bicep
param originHostname string
// REMOVED: param customDomainHostname string = '' (unused)
param wafPolicyName string = 'wafacroyoga'
```

## Docker Build Contract

### Build Context

```yaml
context: .
file: ./Dockerfile
platforms: linux/amd64
```

### Cache Configuration

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

### Tags

```yaml
tags: |
  {REGISTRY}/acroyoga-web:{date-tag}
  {REGISTRY}/acroyoga-web:{sha-tag}
```

## Readiness Check Contract

```bash
curl --retry 50 --retry-delay 15 --retry-all-errors \
  --connect-timeout 10 --max-time 30 --retry-max-time 900 \
  -sf "https://{APP_URL}/api/ready"
```

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `--retry` | 50 | Max 50 attempts |
| `--retry-delay` | 15 | 15s between retries (linear) |
| `--retry-all-errors` | — | Retry on all failures including HTTP errors |
| `--connect-timeout` | 10 | 10s TCP connection timeout |
| `--max-time` | 30 | 30s max per individual attempt |
| `--retry-max-time` | 900 | 15 min total retry budget |

**Worst-case timeline**: Container cold-start from zero replicas can take up to 10 minutes (IMDS token acquisition: 3–5s, startup probe: up to 330s, database migration: up to 200s). The 15-minute retry budget accommodates this with margin.

## PostgreSQL Wake Contract

```bash
# Poll parameters
MAX_ATTEMPTS=30
POLL_INTERVAL=10  # seconds
MAX_WAIT=300      # 5 minutes total
```

**State machine**:
```
check state → Stopped → start server → poll until Ready (max 5 min)
check state → Ready → skip (emit ::notice::)
check state → Starting/Updating → poll until Ready (max 5 min)
poll timeout → emit ::error:: + exit 1
```
