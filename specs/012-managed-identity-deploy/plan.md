# Implementation Plan: Managed Identity Deployment Completion

**Branch**: `012-managed-identity-deploy` | **Date**: 2026-03-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/012-managed-identity-deploy/spec.md`

## Summary

Complete the Managed Identity migration for the AcroYoga Community staging environment. All code and infrastructure changes are already made locally — this plan covers the remaining deployment actions: create a devcontainer for Codespaces (Constitution XIII), sync the constitution to v1.5.0, commit and push all changes, rebuild the container image with `@azure/identity`, redeploy Bicep infrastructure to apply Managed Identity configuration, and verify live endpoints.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22  
**Primary Dependencies**: Next.js 16, `@azure/identity` ^4.6.0, `@azure/storage-blob` ^12.31.0, `pg` ^8.20.0  
**Storage**: Azure PostgreSQL Flexible Server (Entra token auth via MI), Azure Blob Storage (DefaultAzureCredential)  
**Testing**: Vitest (integration tests with PGlite)  
**Target Platform**: Azure Container Apps (Linux, `node:22-alpine`)  
**Project Type**: Monorepo web-service (npm workspaces)  
**Performance Goals**: Health/ready endpoints respond < 1s; deployment completes without rollback  
**Constraints**: All Azure service connections via Managed Identity (Constitution XIV); no connection strings for MI-eligible services  
**Scale/Scope**: Single staging environment (`rg-acroyoga-stg`, `uksouth`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Applies? | Status | Notes |
|---|-----------|----------|--------|-------|
| I | API-First | No | N/A | No new API routes introduced |
| II | Test-First | Partial | ✅ PASS | No new service functions; existing tests cover modified code |
| III | Privacy | No | N/A | No PII changes |
| IV | Server-Side Authority | No | N/A | No new validation surfaces |
| V | UX Consistency | No | N/A | No UI changes |
| VI | Performance Budget | No | N/A | No bundle or query changes |
| VII | Simplicity | Yes | ✅ PASS | Minimal changes; devcontainer uses standard Features, no custom Dockerfile |
| VIII | Internationalisation | No | N/A | No user-facing strings |
| IX | Scoped Permissions | No | N/A | No new mutation endpoints |
| X | Notification Architecture | No | N/A | No notifications |
| XI | Resource Ownership | No | N/A | No new resources |
| XII | Financial Integrity | No | N/A | No payment changes |
| XIII | Development Environment | **Yes** | ✅ PASS | FR-001/FR-002: `.devcontainer/devcontainer.json` created with Node.js 22, Azure CLI, GH CLI, PostgreSQL client |
| XIV | Managed Identity | **Yes** | ✅ PASS | FR-005–FR-008: Bicep deploys MI config; app uses `DefaultAzureCredential`; storage connection string removed from Key Vault |

**Quality Gates impacted**:
- QG-1 Type check: Must pass after code changes (already passing locally)
- QG-3 Lint: Must pass (already passing locally)
- QG-4 Build: Must pass (production build succeeds locally)
- QG-5 Bundle size: No change expected
- QG-8 Constitution review: v1.5.0 adds XIII (Codespaces) and XIV (Managed Identity) — both satisfied

**Post-design re-check**: ✅ All gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/012-managed-identity-deploy/
├── plan.md              # This file
├── research.md          # Phase 0: research findings (7 topics)
├── data-model.md        # Phase 1: infrastructure configuration entities
├── quickstart.md        # Phase 1: step-by-step execution guide
├── contracts/
│   └── infrastructure.md  # Phase 1: deployment & verification contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
.devcontainer/
└── devcontainer.json          # NEW — Codespaces config (Constitution XIII)

.specify/memory/
└── constitution.md            # UPDATED — sync to v1.5.0

infra/
├── main.bicep                 # MODIFIED — new param wiring for MI
├── main.parameters.json       # EXISTING — deployment parameters
└── modules/
    ├── container-apps.bicep   # MODIFIED — AZURE_CLIENT_ID, storage URL, PG env vars
    ├── database.bicep         # MODIFIED — Entra admin config
    ├── key-vault.bicep        # MODIFIED — removed storage-connection-string secret
    └── storage.bicep          # MODIFIED — removed connection string output, added RBAC

apps/web/
├── package.json               # MODIFIED — added @azure/identity ^4.6.0
└── src/
    ├── db/client.ts           # MODIFIED — DefaultAzureCredential for PG
    ├── lib/blob-storage.ts    # MODIFIED — DefaultAzureCredential for Blob
    └── app/api/ready/route.ts # MODIFIED — readiness check via MI auth

Dockerfile                     # EXISTING — no changes needed (npm ci installs new dep)
```

**Structure Decision**: This feature modifies existing files across the monorepo and infrastructure directories. The only new directory is `.devcontainer/`. No new application source directories are introduced.

## Implementation Phases

### Phase 1: Local Setup & Governance (no Azure dependency)

| Step | Action | Acceptance |
|------|--------|------------|
| 1.1 | Create `.devcontainer/devcontainer.json` | Node.js 22, Azure CLI, GH CLI, PG client, `npm ci --force` post-create |
| 1.2 | Copy `specs/constitution.md` → `.specify/memory/constitution.md` | `diff` returns zero differences |
| 1.3 | Commit all changes with descriptive messages | Clean `git status` |
| 1.4 | Push to remote | CI quality gates pass |

### Phase 2: Container Build (depends on Phase 1)

| Step | Action | Acceptance |
|------|--------|------------|
| 2.1 | Prepare build context (temp directory for Windows path workaround) | Context directory contains all needed files |
| 2.2 | Run `az acr build` against `acracroyogai6t2epo2hhajo` | Image `acroyoga-web:latest` available in registry |
| 2.3 | Verify image contains `@azure/identity` | Package present in `node_modules` |

### Phase 3: Infrastructure Deployment (depends on Phase 2)

| Step | Action | Acceptance |
|------|--------|------------|
| 3.1 | List and deactivate old container app revisions | No revisions reference removed secrets |
| 3.2 | Run `az deployment group create` with Bicep | Deployment succeeds |
| 3.3 | Handle `ContainerAppSecretInUse` if needed | Deactivate revisions, retry |
| 3.4 | Verify deployed config: Entra admin, env vars, no storage secret | Azure resource inspection confirms |

### Phase 4: Endpoint Verification (depends on Phase 3)

| Step | Action | Acceptance |
|------|--------|------------|
| 4.1 | Health check: Container App `/api/health` | HTTP 200 |
| 4.2 | Readiness check: Container App `/api/ready` | HTTP 200 (MI auth to DB + Storage) |
| 4.3 | Front Door check: `/api/health` | HTTP 200 (CDN routing) |

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `ContainerAppSecretInUse` error | High | Medium | Deactivate old revisions before deployment (R-007) |
| ACR build fails (transient) | Low | Low | Retry once; build context is idempotent |
| MI auth fails at runtime | Medium | High | Readiness endpoint (`/api/ready`) catches this; check role assignments |
| Windows path issues with ACR build | High | Low | Use temp directory for build context (proven approach) |
| Constitution sync introduces drift | Low | Low | Wholesale file copy, verified by diff |

## Complexity Tracking

No constitution violations. No complexity justifications required.
