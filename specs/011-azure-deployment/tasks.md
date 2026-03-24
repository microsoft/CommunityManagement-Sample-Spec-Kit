# Tasks: Azure Production Deployment

**Input**: Design documents from `/specs/011-azure-deployment/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. This is an infrastructure-only feature — no application feature changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Scaffolding)

**Purpose**: Create directory structure, base configuration files, and the foundational Dockerfile

- [X] T001 Create `infra/` directory structure with module stubs per plan.md at `infra/modules/`
- [X] T002 [P] Create `azure.yaml` azd project configuration at repository root with `web` service targeting `containerapp` host and Docker context pointing to `./Dockerfile`
- [X] T003 [P] Add `output: 'standalone'` to `apps/web/next.config.js` for containerised Next.js builds
- [X] T004 Create multi-stage `Dockerfile` at repository root: Stage 1 (deps) installs all npm dependencies; Stage 2 (builder) builds tokens then web in standalone mode; Stage 3 (runner) uses `node:22-alpine` with only standalone output + static + public, sets `HOSTNAME=0.0.0.0`, `PORT=3000`, exposes port 3000, runs `node server.js`. Target final image <150MB.
- [X] T005 [P] Create `infra/abbreviations.json` with Azure resource naming abbreviations per data-model.md naming patterns
- [X] T006 [P] Create `infra/main.parameters.json` with default Bicep parameter values per data-model.md Bicep parameter contract

**Checkpoint**: Directory structure ready, Dockerfile builds locally, azd recognises the project

---

## Phase 2: Foundational (Core IaC Modules)

**Purpose**: Bicep modules that ALL user stories depend on — managed identity, registry, monitoring, Key Vault, database, storage. These must exist before any Container App can be deployed.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create `infra/modules/managed-identity.bicep` — user-assigned managed identity `id-acroyoga-{env}` with outputs for `principalId`, `clientId`, and `resourceId`
- [X] T008 [P] Create `infra/modules/container-registry.bicep` — ACR `acracroyoga` with Basic SKU, admin disabled, AcrPull role assignment for managed identity. Output `loginServer`
- [X] T009 [P] Create `infra/modules/monitoring.bicep` — Log Analytics workspace `log-acroyoga-{env}` (30-day retention, PerGB2018 SKU) + Application Insights `appi-acroyoga-{env}` (Web type, workspace-backed). Output `logAnalyticsWorkspaceId`, `appInsightsConnectionString`, `appInsightsInstrumentationKey`
- [X] T010 Create `infra/modules/key-vault.bicep` — Key Vault `kv-acroyoga-{env}` with RBAC enabled, soft delete 90 days, purge protection, Key Vault Secrets User role for managed identity principal, diagnostic logs to Log Analytics. Accept `secrets` object param for initial secret population. Output `vaultName`, `vaultUri`
- [X] T011 [P] Create `infra/modules/database.bicep` — PostgreSQL Flexible Server `psql-acroyoga-{env}` with configurable SKU (default `Standard_B1ms`), PgBouncer enabled in transaction mode on port 6432, SSL required, auto-grow storage, PostgreSQL 16, firewall rule for Azure services, database `acroyoga`. Output `serverFqdn`, `connectionString` (secure), `databaseName`
- [X] T012 [P] Create `infra/modules/storage.bicep` — Storage account `stacroyoga{env}` with Standard_LRS, hot tier, public access disabled, `media` container, Storage Blob Data Contributor role for managed identity. Output `connectionString`, `blobEndpoint`
- [X] T013 Create `infra/main.bicep` — orchestrator that invokes all modules in dependency order per contracts/infrastructure.md: (1) managed-identity → (2) container-registry → (3) monitoring → (4) key-vault → (5) database → (6) storage → (7) container-apps → (8) front-door. Wire outputs between modules with correct parameter passing. Define all top-level parameters per data-model.md Bicep parameter contract. Output `containerAppFqdn`, `frontDoorEndpoint`, `containerRegistryLoginServer`

**Checkpoint**: `az deployment group what-if` validates the Bicep compiles and resource graph is correct. All foundational modules ready for Container Apps and Front Door.

---

## Phase 3: User Story 1 — Platform Operator Deploys to Production (Priority: P1) 🎯 MVP

**Goal**: A single `azd up` command provisions all infrastructure and deploys the application, returning a working URL with health endpoint returning 200 OK.

**Independent Test**: Run `azd up --environment staging` from clean state; verify `/api/health` returns 200 and home page loads.

### Implementation for User Story 1

- [X] T014 [US1] Create `infra/modules/container-apps.bicep` — Container Apps Environment `cae-acroyoga-{env}` (Consumption workload profile, Log Analytics integration) + Container App `ca-acroyoga-web-{env}` with: image from ACR, user-assigned managed identity, Key Vault secret references for all env vars per data-model.md, liveness probe `/api/health` (10s period, 3 failures), readiness probe `/api/ready` (5s period, 3 failures), startup probe `/api/health` (5s period, 30 failures), HTTP scale rule (20 concurrent/instance), configurable min/max replicas, multiple revision mode. Output `fqdn`, `environmentId`
- [X] T015 [P] [US1] Create `apps/web/src/app/api/health/route.ts` — GET handler returning `{ status: "healthy", version: process.env.COMMIT_SHA || "local", timestamp: new Date().toISOString() }` with 200 OK. No auth required. Follow existing API route patterns with Response object.
- [X] T015a [P] [US1] Create `HealthResponse` and `ReadinessResponse` TypeScript interfaces in `packages/shared/src/types/health.ts` per Constitution I (response shapes in central types file). Export from `packages/shared/src/types/index.ts`.
- [X] T015b [P] [US1] Create integration test `apps/web/tests/integration/health.test.ts` — test `/api/health` returns 200 with `status`, `version`, and `timestamp` fields. Test `/api/ready` returns 200 when dependencies are available and 503 when database is unreachable. Uses `createTestDb()` for isolation per Constitution II.
- [X] T016 [P] [US1] Create `apps/web/src/app/api/ready/route.ts` — GET handler that checks database connectivity (SELECT 1 via pg pool) and storage reachability (list container). Return 200 `{ status: "ready", checks: { database: "ok", storage: "ok" } }` or 503 with failing check details. No auth required.
- [X] T017 [US1] Wire `infra/main.bicep` to include `container-apps.bicep` module, passing ACR login server, Key Vault name, managed identity IDs, monitoring workspace, and App Insights connection string. Verify all Key Vault secret references resolve correctly.
- [X] T018 [US1] Create azd environment config for staging: set `AZURE_LOCATION=eastus2`, `AZURE_ENV_NAME=staging`, min replicas 0, max replicas 3, DB SKU `Standard_B1ms`, DB storage 32GB in `.azure/staging/.env`
- [X] T019 [US1] Create azd environment config for production: set `AZURE_LOCATION=eastus2`, `AZURE_ENV_NAME=production`, min replicas 1, max replicas 10, DB SKU `Standard_B2s`, DB storage 64GB, `cpuCores=1.0`, `memorySize=2Gi` in `.azure/production/.env`
- [X] T020 [US1] Add database migration as init container in `infra/modules/container-apps.bicep` — init container runs same image with command `node apps/web/src/db/migrate.ts`, connecting via `DATABASE_URL` from Key Vault. Main container starts only after init succeeds.

**Checkpoint**: `azd up --environment staging` provisions all resources and deploys a working application. `/api/health` returns 200. Home page loads.

---

## Phase 4: User Story 2 — Fast Page Loads Globally (Priority: P1)

**Goal**: Static assets served from CDN edge locations worldwide with <2.5s LCP. Cache headers applied per asset type.

**Independent Test**: Access the application via Front Door endpoint URL; verify `/_next/static/*` returns `cache-control` with 30-day max-age; verify `/api/*` is not cached.

### Implementation for User Story 2

- [X] T021 [US2] Create `infra/modules/front-door.bicep` — Azure Front Door Standard `afd-acroyoga` with: origin group pointing to Container App FQDN, health probe on `/api/health` every 30s, caching rules per data-model.md (`/_next/static/*` 30d, `/api/*` no-cache, `/*.ico|svg|png` 7d, default 60s stale-while-revalidate), managed TLS certificate for custom domain (optional param). Output `endpoint`, `frontDoorId`
- [X] T022 [US2] Create WAF policy `waf-acroyoga` within `infra/modules/front-door.bicep` — Microsoft Default Rule Set 2.1 + Bot Manager Rule Set 1.0, prevention mode, associated with Front Door profile
- [X] T023 [US2] Wire `infra/main.bicep` to include `front-door.bicep`, passing Container App FQDN as origin hostname and optional `customDomainHostname` parameter
- [X] T024 [P] [US2] Add cache-control headers in `apps/web/next.config.js` — configure `headers()` to return `Cache-Control: public, max-age=31536000, immutable` for `/_next/static/(.*)` and `Cache-Control: no-store` for `/api/(.*)` paths

**Checkpoint**: Front Door endpoint serves the application. Static assets have correct cache headers. WAF is active in prevention mode.

---

## Phase 5: User Story 3 — Auto-Scaling Under Traffic Spikes (Priority: P1)

**Goal**: Container Apps scales from 0 to max instances based on HTTP load, and scales back to zero when idle. Database handles concurrent connections via PgBouncer.

**Independent Test**: Verify Container App scale rule is configured with HTTP threshold of 20. Verify PostgreSQL PgBouncer is enabled on port 6432. Confirm min replicas = 0 for staging.

### Implementation for User Story 3

- [X] T025 [US3] Verify and tune Container Apps HTTP scale rule in `infra/modules/container-apps.bicep` — ensure `httpScaleRule` threshold is 20 concurrent requests per instance, min replicas per environment param (0=staging, 1=production), max replicas per environment param (3=staging, 10=production)
- [X] T026 [US3] Verify PgBouncer configuration in `infra/modules/database.bicep` — ensure `pgBouncer.enabled=true`, `poolMode=transaction`, port 6432 used in connection string output. Add firewall rule allowing Container Apps Environment subnet
- [X] T027 [US3] Add resource limits in `infra/modules/container-apps.bicep` — staging: 0.5 CPU / 1Gi memory per instance; production: 1.0 CPU / 2Gi memory per instance (configurable via environment parameters). Max scale-out handled by `maxReplicas` (3 staging, 10 production)

**Checkpoint**: Scale rule visible on Container App. PgBouncer connection on port 6432 works. Application scales to 0 replicas when idle in staging.

---

## Phase 6: User Story 4 — Monitoring and Alerting (Priority: P2)

**Goal**: Application Insights provides distributed tracing and real-time metrics. Alert rules fire on error rate spikes, slow responses, container restarts, and DB failures.

**Independent Test**: Trigger an error in the application; verify it appears in Application Insights within 5 minutes. Verify alert rules exist in the resource group.

### Implementation for User Story 4

- [X] T028 [US4] Create `apps/web/src/instrumentation.ts` — Next.js instrumentation hook that conditionally imports `@azure/monitor-opentelemetry` and calls `useAzureMonitor()` when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set. Gracefully no-op in local dev.
- [X] T029 [US4] Add `@azure/monitor-opentelemetry` dependency to `apps/web/package.json`
- [X] T030 [US4] Add alert rules in `infra/modules/monitoring.bicep` — four metric alerts per data-model.md: (1) HTTP 5xx > 5% / 5min / Sev2, (2) Response p95 > 2s / 5min / Sev3, (3) Container restarts > 3 / 10min / Sev2, (4) DB connection failures > 0 / 5min / Sev1. Create action group with email notification (configurable address param)
- [X] T031 [P] [US4] Add diagnostic settings for Key Vault in `infra/modules/key-vault.bicep` — send audit logs to Log Analytics workspace for secret access auditing (FR-005 AC-3)

**Checkpoint**: Application Insights receives telemetry from the deployed app. Four alert rules configured. Key Vault audit logs flow to Log Analytics.

---

## Phase 7: User Story 5 — Secrets Management (Priority: P2)

**Goal**: All sensitive configuration sourced from Key Vault at runtime via Container Apps Key Vault references. No secrets in images, env vars, or logs.

**Independent Test**: Verify Container App env vars reference Key Vault secrets (not inline values). Verify application starts and `/api/ready` returns 200 with secrets sourced from vault.

### Implementation for User Story 5

- [X] T032 [US5] Verify Key Vault secret population in `infra/main.bicep` — ensure all 8 secrets from data-model.md are passed to `key-vault.bicep` module: `database-url`, `nextauth-secret`, `nextauth-url`, `stripe-secret-key`, `stripe-webhook-secret`, `stripe-client-id`, `azure-storage-connection-string`, `applicationinsights-connection-string`
- [X] T033 [US5] Verify Container App Key Vault references in `infra/modules/container-apps.bicep` — each env var mapped to `secretRef` using Key Vault URI pattern `https://{vaultName}.vault.azure.net/secrets/{secretName}` with managed identity `clientId`
- [X] T034 [P] [US5] Draft secret rotation content for the deployment runbook (to be consolidated into `docs/deployment-runbook.md` by T043) covering `az keyvault secret set` followed by `azd deploy` to pick up new revision with updated secrets

**Checkpoint**: Container App runs with all secrets from Key Vault. No secrets appear in container inspect or logs. Key Vault access logged.

---

## Phase 8: User Story 6 — Staging Environment (Priority: P2)

**Goal**: CI/CD pipeline auto-deploys to staging on merge to main, runs smoke tests, then waits for manual approval before promoting the same image to production.

**Independent Test**: Push a commit to main; verify staging deploys automatically, smoke tests pass, and production waits for approval.

### Implementation for User Story 6

- [X] T035 [US6] Extend `.github/workflows/ci.yml` — add Docker build test step after existing quality gates: `docker build --target builder .` to verify Dockerfile builds successfully on PRs
- [X] T036 [US6] Create `.github/workflows/deploy.yml` — **build-and-push** job: checkout, Azure login via `AZURE_CREDENTIALS`, ACR login, `docker build` + `docker push` with tag `sha-${{ github.sha }}`. Triggered on push to `main` and manual `workflow_dispatch` with `environment` and `image-tag` inputs.
- [X] T037 [US6] Add **deploy-staging** job to `.github/workflows/deploy.yml` — depends on build-and-push, GitHub Environment `staging`, deploys via `azure/container-apps-deploy-action@v2` with image tag from build job output, followed by readiness poll (`curl --retry 10 /api/ready`), health smoke test, and home page smoke test
- [X] T038 [US6] Add **deploy-production** job to `.github/workflows/deploy.yml` — depends on deploy-staging, GitHub Environment `production` (with required reviewers), deploys same image tag, followed by readiness verification
- [X] T039 [P] [US6] Draft GitHub secrets and environments documentation (to be consolidated into `docs/deployment-runbook.md` by T043) covering required secrets (`AZURE_CREDENTIALS`, `AZURE_CONTAINER_REGISTRY`) and GitHub Environments (`staging` with no protection, `production` with required reviewers)

**Checkpoint**: Merge to main triggers staging deploy + smoke tests. Production deploys after manual approval with same image.

---

## Phase 9: User Story 7 — Zero-Downtime Deployments (Priority: P3)

**Goal**: New revisions deploy alongside old ones; traffic shifts only after health checks pass. Failed deployments auto-rollback.

**Independent Test**: Deploy a new revision; verify two revisions exist briefly and traffic shifts to the new one after readiness passes. Verify old revision deactivated.

### Implementation for User Story 7

- [X] T040 [US7] Ensure `revisionMode: 'Multiple'` in `infra/modules/container-apps.bicep` and verify traffic weight configuration — new revision gets 100% traffic after health check passes, previous revision deactivated but retained for rollback
- [X] T041 [US7] Draft rollback procedure content (to be consolidated into `docs/deployment-runbook.md` by T043) — document `az containerapp revision list`, `az containerapp revision activate`, `az containerapp ingress traffic set` commands for manual rollback per contracts/cicd.md rollback procedure
- [X] T042 [P] [US7] Add deployment verification step in `.github/workflows/deploy.yml` production job — after deploy, verify `/api/health` returns the expected `version` field matching the deployed git SHA

**Checkpoint**: Deployments create new revisions with zero dropped requests. Runbook documents rollback procedure.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, security hardening, and validation across all stories

- [X] T043 [P] Create `docs/deployment-runbook.md` — comprehensive operational guide covering: prerequisites, first-time setup (`azd up`), subsequent deploys, environment management, secret rotation, monitoring/troubleshooting, rollback procedure, teardown (`azd down`). Consolidate content from T034, T039, T041.
- [X] T044 [P] Create `docs/environment-setup.md` — developer onboarding guide: required CLI tools (az, azd, docker, node 22+), Azure subscription setup, GitHub secrets configuration, local Docker testing, verification steps per quickstart.md
- [X] T045 Run `infra/main.bicep` through `az bicep lint` and fix any warnings. Verify all modules follow Azure naming conventions from `infra/abbreviations.json`
- [X] T046 Verify security posture: (1) ACR admin disabled, (2) Key Vault RBAC-only with purge protection, (3) Storage public access disabled, (4) PostgreSQL SSL required, (5) WAF in prevention mode, (6) Managed identity used for all service-to-service auth — no connection strings with credentials in env vars
- [X] T046a Verify PII-at-rest encryption (FR-016, Constitution III): confirm Azure PostgreSQL Flexible Server TDE is active via `az postgres flexible-server show --query 'dataEncryption'`; confirm Key Vault secrets are encrypted; confirm Blob Storage uses Microsoft-managed encryption. Document verification results.
- [X] T047 Validate cost estimate — verify resource SKUs match data-model.md cost table (<$98/mo at low traffic): Container Apps Consumption, PostgreSQL B1ms, Front Door Standard, ACR Basic, Storage LRS, Log Analytics PerGB2018
- [X] T048 [P] Add resource tags to all Bicep modules: `environment={env}`, `project=acroyoga-community`, `managedBy=bicep` per data-model.md
- [X] T049 Run quickstart.md validation — execute the documented first-time setup flow (`azd auth login` → `azd init` → `azd up --environment staging`) and verify each verification step passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 — Deploy to Production (Phase 3)**: Depends on Phase 2 — creates Container App + health endpoints + azd configs
- **US2 — Fast Page Loads (Phase 4)**: Depends on Phase 2 — can start in parallel with US1 (Front Door module is independent), but integration with US1 Container App FQDN output needed in T023
- **US3 — Auto-Scaling (Phase 5)**: Depends on Phase 3 — tunes the Container App and DB created in US1
- **US4 — Monitoring (Phase 6)**: Depends on Phase 2 (monitoring module) + Phase 3 (deployed app to instrument)
- **US5 — Secrets (Phase 7)**: Depends on Phase 2 (Key Vault module) + Phase 3 (Container App with Key Vault refs)
- **US6 — Staging/CI/CD (Phase 8)**: Depends on Phase 3 (working deployment to automate)
- **US7 — Zero-Downtime (Phase 9)**: Depends on Phase 3 (Container App revision mode) + Phase 8 (deploy pipeline)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
  └── Phase 2 (Foundational IaC modules)
        ├── Phase 3 (US1: Deploy) ◄── MVP target
        │     ├── Phase 4 (US2: CDN/Performance) — can partially parallel with US1
        │     ├── Phase 5 (US3: Scaling) — tunes US1 resources
        │     ├── Phase 6 (US4: Monitoring) — instruments US1 deployment
        │     ├── Phase 7 (US5: Secrets) — validates US1 Key Vault integration
        │     └── Phase 8 (US6: CI/CD Pipeline) — depends on Phase 3
        │           └── Phase 9 (US7: Zero-Downtime)
        └── Phase 10 (Polish) — after all stories
```

> **Note**: Phase 8 (US6) depends on Phase 3 (working deployment), NOT on Phase 7 (US5). US5 and US6 can proceed in parallel after Phase 3.

### Parallel Opportunities

- **Phase 1**: T002, T003, T005, T006 can all run in parallel
- **Phase 2**: T007, T008, T009, T011, T012 can run in parallel (no cross-dependencies). T010 needs monitoring output. T013 wires everything together last.
- **Phase 3**: T015, T015a, T015b, and T016 can all run in parallel (different files). T014 and T017-T020 are sequential.
- **Phase 4**: T024 can run in parallel with T021-T023 (different files)
- **Phase 8**: T039 can run in parallel with T035-T038
- **Phase 10**: T043, T044, T048 can all run in parallel

### Implementation Strategy

**Suggested MVP scope**: Phases 1–3 (Setup + Foundational + US1). After completing these, you have a fully deployable application with `azd up`. This is the minimum viable deployment.

**Incremental delivery order**:
1. **MVP**: Phases 1–3 → Working deployment with health checks
2. **Performance**: Phase 4 → CDN and cache headers
3. **Resilience**: Phase 5 → Auto-scaling tuned
4. **Operations**: Phases 6–7 → Monitoring, secrets validation
5. **Automation**: Phase 8 → CI/CD pipeline
6. **Reliability**: Phase 9 → Zero-downtime deployments
7. **Polish**: Phase 10 → Documentation, security audit, cost validation

---

## Task Summary

| Phase | Story | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| 1 — Setup | — | 6 | 4 |
| 2 — Foundational | — | 7 | 5 |
| 3 — US1: Deploy | US1 | 9 | 4 |
| 4 — US2: CDN | US2 | 4 | 1 |
| 5 — US3: Scaling | US3 | 3 | 0 |
| 6 — US4: Monitoring | US4 | 4 | 1 |
| 7 — US5: Secrets | US5 | 3 | 1 |
| 8 — US6: CI/CD | US6 | 5 | 1 |
| 9 — US7: Zero-Downtime | US7 | 3 | 1 |
| 10 — Polish | — | 8 | 3 |
| **Total** | | **52** | **22** |
