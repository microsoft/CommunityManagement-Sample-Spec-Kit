# Implementation Plan: Azure Production Deployment

**Branch**: `011-azure-deployment` | **Date**: 2026-03-22 | **Spec**: [specs/011-azure-deployment/spec.md](../011-azure-deployment.md)
**Input**: Feature specification from `/specs/011-azure-deployment/spec.md`

## Summary

Deploy the AcroYoga Community platform to Azure for production use with a single-command provisioning experience. Infrastructure is defined as Bicep IaC and orchestrated via Azure Developer CLI (`azd`). The architecture uses Azure Container Apps (scale-to-zero with KEDA), Azure Database for PostgreSQL Flexible Server (PgBouncer pooling), Azure Front Door (global CDN + WAF), Azure Key Vault (secrets), Azure Container Registry, Azure Blob Storage (already integrated), and Azure Monitor + Application Insights (observability). A GitHub Actions CI/CD pipeline builds, tests, and deploys through staging→production promotion using the same container image. Zero-downtime deployments via Container Apps revision management. Target: <$100/mo at low traffic, <2.5s LCP globally, <1s API p95.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22+
**Primary Dependencies**: Next.js 16 (App Router, React 19), next-auth v5 beta, pg, Stripe SDK, @azure/storage-blob, Zod, sharp, Bicep (IaC), Azure Developer CLI (azd)
**Storage**: Azure Database for PostgreSQL Flexible Server (production), PGlite (test isolation), Azure Blob Storage (media)
**Testing**: Vitest (unit/integration with PGlite), smoke tests against deployed environments
**Target Platform**: Azure Container Apps (Linux containers), Azure Front Door (global edge)
**Project Type**: Infrastructure-as-code + CI/CD pipeline + containerised web application deployment
**Performance Goals**: LCP <2.5s on simulated 3G; API mutation p95 <1s; initial JS bundle <200KB compressed; deployment completes <15min from clean state
**Constraints**: Scale-to-zero for cost (<$100/mo baseline); zero-downtime deployments; all secrets from Key Vault (never in env vars or images); same image promoted staging→production
**Scale/Scope**: Single-region primary (read replicas optional), auto-scale 0→10 instances, 500 concurrent users during spikes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | No application code changes. Deployment preserves existing API route structure. Health/readiness endpoints are new API routes following existing patterns. |
| II. Test-First Development | ✅ PASS | Smoke tests validate deployed environments. Existing test suite runs in CI before deployment. No new service functions without tests. |
| III. Privacy & Data Protection | ✅ PASS | PII encrypted at rest via PostgreSQL Flexible Server TDE. Secrets in Key Vault, never in images or logs. Managed identity for service-to-service auth. |
| IV. Server-Side Authority | ✅ PASS | No client-side changes. All validation remains server-side. Infrastructure enforces this via Container Apps (no direct DB access from outside). |
| V. UX Consistency | ✅ PASS | Front Door CDN improves asset delivery globally. No UI changes — preserves existing design system. |
| VI. Performance Budget | ✅ PASS | Front Door edge caching for static assets. Container Apps auto-scaling for API throughput. PgBouncer connection pooling for DB efficiency. Bundle size enforced in CI (existing gate). |
| VII. Simplicity | ✅ PASS | Single-region deployment. Bicep modules follow Azure best practices. No custom orchestration — azd handles provisioning and deployment. |
| VIII. Internationalisation | ✅ PASS | No changes to i18n. Edge caching respects Accept-Language via cache key rules. |
| IX. Scoped Permissions | ✅ PASS | Managed identity with least-privilege RBAC. Key Vault access via RBAC (not access policies). Container Apps has no direct DB admin access — only connection string via Key Vault. |
| X. Notification Architecture | ✅ PASS | No changes. Alert notifications (for operators) are separate from user notifications — Azure Monitor action groups handle operator alerts. |
| XI. Resource Ownership | ✅ PASS | No changes to application ownership model. Infrastructure resources tagged with environment and managed by IaC. |
| XII. Financial Integrity | ✅ PASS | Stripe webhook endpoint preserved. Staging uses Stripe test keys (from Key Vault). Production uses live keys (from Key Vault). No pricing logic changes. |
| XIII. Development Environment | ✅ PASS | azd and Bicep CLI work in Codespaces. CI runs on ubuntu-latest. Docker builds in CI, not locally. |
| QG-5: Bundle Size | ✅ PASS | Existing CI gate preserved. Standalone output mode does not affect bundle size check. |
| QG-10: Permission Smoke Test | ✅ PASS | Health endpoints are public (no auth). No new mutation endpoints. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

**Post–Phase 1 re-check: PASS** — infrastructure model, contracts, and source structure all align with principles.

## Project Structure

### Documentation (this feature)

```text
specs/011-azure-deployment/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions & research
├── data-model.md        # Phase 1 — infrastructure resource definitions
├── quickstart.md        # Phase 1 — developer onboarding for deployment
├── contracts/           # Phase 1 — IaC module interfaces, CI/CD contracts
│   ├── infrastructure.md    # Bicep module interface contracts
│   └── cicd.md              # GitHub Actions workflow contracts
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Infrastructure-as-Code
infra/
├── main.bicep                  # Orchestrator — deploys all modules
├── main.parameters.json        # Default parameter values
├── abbreviations.json          # Azure resource name abbreviations
├── modules/
│   ├── container-apps.bicep    # Container Apps Environment + App
│   ├── container-registry.bicep # ACR with admin disabled
│   ├── database.bicep          # PostgreSQL Flexible Server + PgBouncer
│   ├── front-door.bicep        # Azure Front Door + WAF + custom domain
│   ├── key-vault.bicep         # Key Vault + RBAC assignments
│   ├── monitoring.bicep        # Log Analytics + App Insights
│   ├── storage.bicep           # Blob Storage (existing, imported)
│   └── managed-identity.bicep  # User-assigned managed identity

# Azure Developer CLI config
azure.yaml                      # azd project configuration

# Docker
Dockerfile                      # Multi-stage build: deps → tokens → build → standalone

# Application additions
apps/web/src/
├── app/api/health/
│   └── route.ts                # GET /api/health — liveness probe
├── app/api/ready/
│   └── route.ts                # GET /api/ready — readiness probe (checks DB, storage)
└── instrumentation.ts          # Application Insights SDK initialisation (Next.js instrumentation hook)

# CI/CD
.github/workflows/
├── ci.yml                      # Existing — extended with image build + push
└── deploy.yml                  # New — staging deploy, smoke test, production promote

# Database migrations (run as init container)
apps/web/src/db/
└── migrate.ts                  # Existing — invoked as pre-deployment step
```

**Structure Decision**: Infrastructure-only feature. New `infra/` directory at repo root for Bicep modules (standard azd convention). Dockerfile at repo root (monorepo build context). Minimal application additions: health endpoints + App Insights instrumentation. Existing CI extended; new deploy workflow added.

## Cross-Spec Dependencies

| Spec | Dependency Direction | Integration Point |
|------|---------------------|-------------------|
| 001 — Event Discovery | 011 deploys 001 | All event APIs, pages, and DB migrations are deployed as part of the container image. |
| 004 — Permissions | 011 deploys 004 | Auth configuration (NextAuth, Entra External ID) provided via Key Vault secrets. Permission middleware runs unchanged. |
| All specs with migrations | 011 runs migrations | Pre-deployment step runs `db:migrate` against production PostgreSQL before new revision receives traffic. |
| Constitution v1.4.0 | 011 enforces gates | CI pipeline enforces all quality gates. Performance budgets validated by Front Door + App Insights metrics. |

## Complexity Tracking

No constitution violations detected. No complexity justifications needed.

---

## Phase Summary

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 0 | `research.md` — technology decisions, alternatives | ✅ Complete |
| Phase 1 | `data-model.md`, `contracts/`, `quickstart.md` | ✅ Complete |
| Phase 2 | `tasks.md` — implementation tasks (`/speckit.tasks`) | ⏳ Not started |
