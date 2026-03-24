# Tasks: Managed Identity Deployment Completion

**Input**: Design documents from `/specs/012-managed-identity-deploy/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/infrastructure.md

**Tests**: No test tasks — this is a deployment/operations feature; verification is via endpoint health checks.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths and commands in descriptions

## Key Context

- All code changes (Bicep, app code, constitution) are **already done locally** — tasks do NOT recreate these files
- ACR registry: `acracroyogai6t2epo2hhajo.azurecr.io`
- Resource group: `rg-acroyoga-stg` (subscription `ea77caf3-375b-4f1e-b3b0-03e58569567e`)
- Container app: `ca-acroyoga-web-staging`
- Git remote: `origin → https://github.com/MikeWedderburn-Clarke/CommunityManagement-Sample-Spec-Kit.git`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No-Azure-dependency local tasks — devcontainer creation and governance sync

- [X] T001 [P] [US1] Create `.devcontainer/devcontainer.json` with Node.js 22 base image (`mcr.microsoft.com/devcontainers/javascript-node:22`), Dev Container Features for Azure CLI (`ghcr.io/devcontainers/features/azure-cli`), GitHub CLI (`ghcr.io/devcontainers/features/github-cli`), PostgreSQL client (`ghcr.io/devcontainers/features/postgresql`), `postCreateCommand: "npm ci --force"`, `forwardPorts: [3000]`, and VS Code extensions (ESLint, Prettier) — per FR-001/FR-002 and Constitution XIII
- [X] T002 [P] [US2] Copy `specs/constitution.md` to `.specify/memory/constitution.md` (wholesale replacement, not merge) and verify with `diff` that both files are byte-identical at v1.5.0 — per FR-003

**Checkpoint**: Devcontainer exists, constitution synced — no Azure operations needed yet

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Publish all local changes to remote — BLOCKS container build and deployment

**⚠️ CRITICAL**: No deployment work can begin until changes are pushed and (optionally) CI passes

- [X] T003 [US3] Stage all changes with `git add -A` and commit with message `feat(012): devcontainer, constitution sync, managed identity migration`
- [X] T004 [US3] Push to remote: `git push origin` to `https://github.com/MikeWedderburn-Clarke/CommunityManagement-Sample-Spec-Kit.git` — per FR-004
- [X] T005 [US3] Verify the pushed commit contains all expected modified files: Bicep modules (`infra/modules/*.bicep`, `infra/main.bicep`), app code (`apps/web/src/db/client.ts`, `apps/web/src/lib/blob-storage.ts`, `apps/web/src/app/api/ready/route.ts`, `apps/web/package.json`), devcontainer (`.devcontainer/devcontainer.json`), constitution (`.specify/memory/constitution.md`, `specs/constitution.md`), and README

**Checkpoint**: Remote main branch reflects all Managed Identity migration changes

---

## Phase 3: User Story 1 — Standardized Development Environment (Priority: P1) 🎯 MVP

**Goal**: A new contributor can open the repository in Codespaces and immediately build/test without manual setup

**Independent Test**: Open the repository in GitHub Codespaces; run `npm run typecheck && npm run build -w @acroyoga/web && npm run test` — all succeed without manual tool installation

_(Implementation complete in Phase 1, T001. This phase exists for independent verification.)_

- [X] T006 [US1] Validate the devcontainer by confirming `.devcontainer/devcontainer.json` references the correct base image, features, post-create command, forwarded ports, and extensions — cross-reference with contracts/infrastructure.md Devcontainer Contract

**Checkpoint**: US1 complete — devcontainer configuration is correct and pushed

---

## Phase 4: User Story 2 — Governance Document Consistency (Priority: P1)

**Goal**: Both canonical constitution copies are byte-identical at v1.5.0

**Independent Test**: Run `diff specs/constitution.md .specify/memory/constitution.md` — zero differences

_(Implementation complete in Phase 1, T002. This phase exists for independent verification.)_

- [X] T007 [US2] Run `diff specs/constitution.md .specify/memory/constitution.md` and confirm zero differences and both files contain `v1.5.0` version identifier

**Checkpoint**: US2 complete — governance documents are synchronized

---

## Phase 5: User Story 3 — All Changes Published to Remote (Priority: P1)

**Goal**: All Managed Identity migration changes are visible on the remote main branch

**Independent Test**: Visit the GitHub repository and confirm the latest commit includes all modified files

_(Implementation complete in Phase 2, T003–T005. This phase exists as a reference — no additional tasks.)_

**Checkpoint**: US3 complete — remote repository is up to date

---

## Phase 6: User Story 4 — Updated Container Image (Priority: P2)

**Goal**: The staging container image includes `@azure/identity` so the app can authenticate via Managed Identity at runtime

**Independent Test**: Verify the rebuilt image is present in ACR with a recent build timestamp

### Implementation for User Story 4

- [X] T008 [US4] Prepare ACR build context: create temp directory at `$env:TEMP\acr-build-ctx2`, remove it if it exists, then `Copy-Item -Path . -Destination $ctx -Recurse -Exclude @('.git','node_modules','.next','storybook-static')` to stage the build context (Windows path workaround per R-003)
- [X] T009 [US4] Run ACR remote build: `az acr build --registry acracroyogai6t2epo2hhajo --image acroyoga-web:latest --file Dockerfile $ctx` — per FR-005 and Container Image Contract
- [X] T010 [US4] Verify the image exists in the registry: `az acr repository show-tags --name acracroyogai6t2epo2hhajo --repository acroyoga-web -o table` — confirm `latest` tag is present with a recent timestamp

**Checkpoint**: US4 complete — container image rebuilt with `@azure/identity` in registry

---

## Phase 7: User Story 5 — Infrastructure Reflects Managed Identity Configuration (Priority: P2)

**Goal**: Staging Azure environment is updated with Entra admin, MI env vars, and removed secrets

**Independent Test**: Inspect deployed container app env vars and database Entra admin configuration

### Implementation for User Story 5

- [X] T011 [US5] List active container app revisions: `az containerapp revision list -n ca-acroyoga-web-staging -g rg-acroyoga-stg -o table` and deactivate all old/non-latest revisions via `az containerapp revision deactivate -n ca-acroyoga-web-staging -g rg-acroyoga-stg --revision <revision-name>` to prevent `ContainerAppSecretInUse` error (R-007)
- [X] T012 [US5] Deploy Bicep infrastructure: `az deployment group create --resource-group rg-acroyoga-stg --template-file infra/main.bicep --parameters infra/main.parameters.json --parameters imageTag=latest environmentName=staging location=uksouth` — per FR-006/FR-007/FR-008 and Bicep Deployment Contract
- [X] T013 [US5] If T012 fails with `ContainerAppSecretInUse`: re-list revisions, deactivate any remaining old revisions still referencing removed secrets, then retry the deployment command from T012 — per Error Recovery Contract
- [X] T014 [P] [US5] Verify database Entra admin: `az postgres flexible-server ad-admin list --resource-group rg-acroyoga-stg --server-name <server-name> -o table` — confirm managed identity is registered as administrator (FR-006)
- [X] T015 [P] [US5] Verify container app environment variables: `az containerapp show -n ca-acroyoga-web-staging -g rg-acroyoga-stg --query "properties.template.containers[0].env" -o table` — confirm `AZURE_CLIENT_ID`, `AZURE_STORAGE_ACCOUNT_URL`, `PGHOST`, `PGDATABASE` are present (FR-007)
- [X] T016 [P] [US5] Verify Key Vault secrets: `az keyvault secret list --vault-name <vault-name> -o table` — confirm `storage-connection-string` is NOT present while `database-url`, `nextauth-secret`, and other required secrets remain (FR-008)

**Checkpoint**: US5 complete — infrastructure fully reflects Managed Identity configuration

---

## Phase 8: User Story 6 — Live Endpoints Respond Successfully (Priority: P2)

**Goal**: All three verification endpoints return HTTP 200, confirming end-to-end deployment success

**Independent Test**: Issue HTTP requests to each endpoint and validate 200 response codes

### Implementation for User Story 6

- [X] T017 [US6] Health check — Container App: `curl -s -o /dev/null -w "%{http_code}" https://ca-acroyoga-web-staging.salmontree-d5cceffd.uksouth.azurecontainerapps.io/api/health` — must return 200 (FR-010)
- [X] T018 [US6] Readiness check — Container App: `curl -s -o /dev/null -w "%{http_code}" https://ca-acroyoga-web-staging.salmontree-d5cceffd.uksouth.azurecontainerapps.io/api/ready` — must return 200, confirming MI auth to DB + Storage (FR-011). If 200 for health but non-200 for ready: check role assignments, env vars, database Entra admin config
- [X] T019 [US6] Front Door health check: `curl -s -o /dev/null -w "%{http_code}" https://acro-i6t2epo2hhajo-gcdgg7b8cgdndebz.b01.azurefd.net/api/health` — must return 200, confirming CDN routing (FR-012)
- [X] T020 [US6] If any endpoint returns non-200: wait 60s and retry once. If still failing, check container app logs via `az containerapp logs show -n ca-acroyoga-web-staging -g rg-acroyoga-stg --type console` — per Error Recovery Contract

**Checkpoint**: US6 complete — all endpoints healthy, deployment verified end-to-end

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation and cleanup

- [X] T021 [P] Clean up ACR build context temp directory: `Remove-Item $env:TEMP\acr-build-ctx2 -Recurse -Force`
- [X] T022 Run quickstart.md validation — confirm all steps in `specs/012-managed-identity-deploy/quickstart.md` correspond to completed tasks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all deployment phases
- **Phase 3 (US1)**: Verification only; dependent on T001 from Phase 1
- **Phase 4 (US2)**: Verification only; dependent on T002 from Phase 1
- **Phase 5 (US3)**: Reference only; implemented in Phase 2
- **Phase 6 (US4)**: Depends on Phase 2 (changes must be pushed before ACR build)
- **Phase 7 (US5)**: Depends on Phase 6 (image must be in registry before Bicep deploys)
- **Phase 8 (US6)**: Depends on Phase 7 (infrastructure must be deployed before verification)
- **Phase 9 (Polish)**: Depends on Phase 8 completion

### User Story Dependencies

- **US1 (P1)**: Independent — devcontainer is self-contained
- **US2 (P1)**: Independent — constitution sync is self-contained
- **US3 (P1)**: Depends on US1 + US2 completion (all files must exist before commit)
- **US4 (P2)**: Depends on US3 (code must be pushed to build from latest)
- **US5 (P2)**: Depends on US4 (image must exist in ACR before Bicep deploy)
- **US6 (P2)**: Depends on US5 (infrastructure must be deployed before verification)

### Within Each User Story

- Setup tasks (T001, T002) can run in parallel
- Verification tasks (T014, T015, T016) can run in parallel after deployment
- Endpoint checks (T017, T018, T019) can run in parallel after infrastructure is deployed

### Parallel Opportunities

- T001 and T002 can execute simultaneously (different files, no shared state)
- T006 and T007 can execute simultaneously (both are verification-only)
- T014, T015, T016 can execute simultaneously (read-only Azure queries)
- T017, T018, T019 can execute simultaneously (independent HTTP requests)

---

## Parallel Example: Phase 1

```bash
# Run in parallel — no shared file paths:
T001: Create .devcontainer/devcontainer.json
T002: Copy specs/constitution.md → .specify/memory/constitution.md
```

## Parallel Example: Phase 7 Verification

```bash
# Run in parallel — all read-only Azure queries:
T014: Verify database Entra admin
T015: Verify container app env vars
T016: Verify Key Vault secrets
```

## Parallel Example: Phase 8 Endpoint Checks

```bash
# Run in parallel — independent HTTP requests:
T017: Health check (container app)
T018: Readiness check (container app)
T019: Front Door health check
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Create devcontainer + sync constitution
2. Complete Phase 2: Commit and push all changes
3. **STOP and VALIDATE**: Verify devcontainer config (T006), constitution sync (T007), remote has all files (T005)
4. This delivers a working dev environment and published codebase

### Incremental Delivery

1. Phase 1 + Phase 2 → Local setup complete, changes published (MVP)
2. Phase 6 (US4) → Container image rebuilt with `@azure/identity`
3. Phase 7 (US5) → Infrastructure updated with MI configuration
4. Phase 8 (US6) → Endpoints verified, deployment confirmed successful
5. Each phase adds deployment confidence without breaking previous work

### Serial Execution (Single Operator)

This feature is inherently serial for the deployment phases:
1. Setup (T001–T002) — local, parallelizable
2. Git (T003–T005) — sequential, depends on setup
3. ACR Build (T008–T010) — sequential, depends on git push
4. Bicep Deploy (T011–T016) — sequential then parallel verification
5. Verify (T017–T020) — parallelizable endpoint checks

---

## Notes

- [P] tasks = different files or independent operations, no dependencies
- [Story] label maps task to specific user story for traceability
- All code/Bicep changes are pre-existing — tasks focus on deployment actions
- `ContainerAppSecretInUse` handling (T011, T013) is critical — always deactivate old revisions before deploying
- Windows path workaround for ACR build context is a known requirement (R-003)
- Constitution sync is a wholesale file copy, not a merge (R-002)
