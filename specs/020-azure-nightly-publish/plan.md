# Implementation Plan: Azure Nightly Publish Workflow

**Branch**: `020-azure-nightly-publish` | **Date**: 2025-07-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-azure-nightly-publish/spec.md`

## Summary

Create a dedicated GitHub Actions workflow that runs nightly at midnight UTC (and supports manual trigger) to execute the full CI validation suite, build a Docker image, push it to the shared Azure Container Registry with nightly-specific tags (`nightly-YYYYMMDD`, `nightly-sha-{short_sha}`), and deploy to an isolated nightly Azure Container App environment (`ca-acroyoga-web-nightly` in `rg-acroyoga-nightly`). The infrastructure extends the existing Bicep IaC by making Front Door and Container Registry modules conditional, enabling a cost-optimized nightly deployment that reuses the shared ACR. Authentication uses OIDC with managed identity (Constitution XIV), following the exact pattern established in `deploy.yml`.

## Technical Context

**Language/Version**: Node.js 24 (application), Bicep (infrastructure), YAML (GitHub Actions workflows)  
**Primary Dependencies**: GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v2`, `azure/container-apps-deploy-action@v2`), Azure CLI  
**Storage**: PostgreSQL Flexible Server (nightly instance, Standard_B1ms), Azure Blob Storage (nightly instance), Azure Key Vault (nightly instance)  
**Testing**: Full CI suite (vitest, Playwright, eslint, tsc, i18n lint, Storybook a11y) — runs in validate job  
**Target Platform**: GitHub Actions (ubuntu-latest runners), Azure Container Apps (Consumption plan)  
**Project Type**: CI/CD workflow + infrastructure-as-code  
**Performance Goals**: Complete nightly pipeline within 30 minutes (SC-001); nightly environment health endpoint responsive within 5 minutes of deployment (SC-005)  
**Constraints**: OIDC-only authentication (no stored secrets for Azure); isolated from staging/production; shared ACR across environments  
**Scale/Scope**: Single nightly environment; 0–2 container replicas; minimal database tier

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicable | Status | Notes |
|-----------|:---:|:---:|-------|
| I. API-First | ❌ | N/A | No new APIs introduced |
| II. Test-First | ✅ | ✅ PASS | Workflow runs full CI validation suite before deployment (FR-004); no deployment without passing tests (FR-013) |
| III. Privacy | ❌ | N/A | No PII handling in workflow |
| IV. Server-Side Authority | ❌ | N/A | No new endpoints |
| V. UX Consistency | ❌ | N/A | No UI changes |
| VI. Performance Budget | ✅ | ✅ PASS | Bundle size check included in validate job; same thresholds as CI |
| VII. Simplicity | ✅ | ✅ PASS | Three-job workflow mirrors proven deploy.yml pattern; reuses existing Bicep modules with conditional params; no new abstractions |
| VIII. Internationalisation | ✅ | ✅ PASS | i18n lint included in validate job |
| IX. Scoped Permissions | ❌ | N/A | No new permission endpoints |
| X. Notification Architecture | ❌ | N/A | Uses GitHub's built-in failure notifications (P2 story) |
| XI. Resource Ownership | ❌ | N/A | No new mutable resources |
| XII. Financial Integrity | ❌ | N/A | No payment changes |
| XIII. Development Environment | ✅ | ✅ PASS | Workflow runs on ubuntu-latest; same as CI (Constitution XIII constraint) |
| XIV. Managed Identity | ✅ | ✅ PASS | OIDC auth via `azure/login@v2` with client-id/tenant-id/subscription-id (FR-010, FR-016); nightly identity uses `DefaultAzureCredential` pattern; no stored credentials |

**Gate Result**: ✅ ALL PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/020-azure-nightly-publish/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Research findings (9 decisions)
├── data-model.md        # Phase 1: Infrastructure entity model
├── quickstart.md        # Phase 1: Setup and verification guide
├── contracts/
│   ├── nightly-workflow.yml   # Phase 1: Workflow YAML contract
│   └── infrastructure.md      # Phase 1: Bicep changes contract
├── tasks.md             # Phase 2 output
└── checklists/          # Spec checklists
```

### Source Code (repository root)

```text
.github/workflows/
├── ci.yml               # Existing — unchanged (FR-014)
├── deploy.yml           # Existing — unchanged (FR-014)
└── nightly.yml          # NEW — nightly build & deploy workflow

infra/
├── main.bicep           # MODIFIED — add conditional params for Front Door, ACR, alerts
├── main.parameters.json         # Existing — unchanged
└── main.parameters.nightly.json # NEW — nightly-specific parameters
```

**Structure Decision**: This feature adds two new files and modifies one existing file. No new application source code. The workflow file follows the existing naming convention in `.github/workflows/`. The Bicep changes are additive (new optional parameters with backward-compatible defaults) so staging and production deployments are unaffected.

## Complexity Tracking

No constitution violations to justify. The design passes all applicable gates.
