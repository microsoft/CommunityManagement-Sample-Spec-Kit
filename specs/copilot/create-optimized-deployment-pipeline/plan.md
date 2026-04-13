# Implementation Plan: Optimised Deployment Pipeline

**Branch**: `copilot/create-optimized-deployment-pipeline` | **Date**: 2025-07-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-optimized-deployment-pipeline/spec.md`

## Summary

Harden and optimise the existing nightly build & deploy pipeline (`nightly.yml`) to be highly reliable, addressing all 7 historical failure modes with defence-in-depth layers. The work centres on: job-level timeouts preventing indefinite hangs, Docker layer caching via `docker/build-push-action` with GitHub Actions cache backend, structured `::error::` / `::warning::` annotations for fast failure diagnosis, retry wrappers for flaky infrastructure operations (Azure CLI, Bicep deployments), hardened curl readiness checks tuned for cold-start from `minReplicas:0`, npm cache restoration via `actions/setup-node`, and cleanup of unused Bicep parameters. All 7 root causes are already fixed on main — this spec adds defence-in-depth.

## Technical Context

**Language/Version**: YAML (GitHub Actions), Bicep (Azure IaC), Bash (step scripts)
**Primary Dependencies**: GitHub Actions (`actions/checkout@v5`, `actions/setup-node@v5`, `azure/login@v3`, `docker/setup-buildx-action`, `docker/build-push-action`, `actions/cache`), Azure CLI, Docker buildx
**Storage**: N/A (pipeline consumes existing PostgreSQL Flexible Server infrastructure)
**Testing**: Validated by successful nightly pipeline execution; no unit tests for workflow files
**Target Platform**: GitHub Actions `ubuntu-latest` runners → Azure Container Apps (nightly environment)
**Project Type**: CI/CD pipeline (workflow file modification)
**Performance Goals**: Total pipeline ≤ 45 min wall-clock (SC-001); Docker build ≥ 30% faster on cache-hit (SC-004)
**Constraints**: Must preserve all existing nightly.yml capabilities (FR-017); must NOT modify ci.yml or deploy.yml (FR-018); cold-start time up to 10 min worst-case
**Scale/Scope**: 3 jobs (validate, build-and-push, deploy); 1 primary workflow file + 2 Bicep modules with unused param cleanup

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicable? | Status | Notes |
|-----------|:-----------:|:------:|-------|
| I. API-First | ❌ | N/A | No application APIs modified |
| II. Test-First | ✅ | ✅ PASS | Pipeline validates all CI quality gates before build/deploy |
| III. Privacy | ❌ | N/A | No PII handling changes |
| IV. Server-Side Authority | ❌ | N/A | No application logic changes |
| V. UX Consistency | ❌ | N/A | No UI changes |
| VI. Performance Budget | ✅ | ✅ PASS | Bundle size check preserved; Docker caching improves pipeline performance |
| VII. Simplicity | ✅ | ✅ PASS | All changes use native GitHub Actions features (`timeout-minutes`, `::error::`, `actions/cache`); no custom abstractions |
| VIII. Internationalisation | ❌ | N/A | i18n lint step preserved unchanged |
| IX. Scoped Permissions | ❌ | N/A | No permission model changes |
| X. Notification Architecture | ❌ | N/A | No notification changes |
| XI. Resource Ownership | ❌ | N/A | No resource model changes |
| XII. Financial Integrity | ❌ | N/A | No payment logic changes |
| XIII. Development Environment | ✅ | ✅ PASS | Runs on `ubuntu-latest`; no WSL/local tooling requirements |
| XIV. Managed Identity | ✅ | ✅ PASS | OIDC Azure login preserved (`azure/login@v3` with nightly identity) |

**Gate result**: ✅ All applicable principles satisfied. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/copilot/create-optimized-deployment-pipeline/
├── plan.md              # This file
├── spec.md              # Feature specification (copied from 021)
├── research.md          # Phase 0 output — technology decisions
├── data-model.md        # Phase 1 output — pipeline entity model
├── quickstart.md        # Phase 1 output — implementation guide
├── contracts/           # Phase 1 output — workflow interface contracts
│   └── nightly-workflow.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
.github/workflows/
├── nightly.yml          # PRIMARY — replace-in-place with hardened version
├── ci.yml               # NOT MODIFIED (FR-018)
└── deploy.yml           # NOT MODIFIED (FR-018)

infra/modules/
├── database.bicep       # MODIFIED — remove unused managedIdentityClientId param
└── front-door.bicep     # MODIFIED — remove unused customDomainHostname param
```

**Structure Decision**: This feature modifies existing files in-place. The primary deliverable is a hardened `nightly.yml`. Two Bicep modules receive minor cleanup to remove declared-but-unused parameters (which cause Bicep linter warnings). No new directories or source files are created.

## Complexity Tracking

> No constitution violations to justify. All changes use native platform features.
