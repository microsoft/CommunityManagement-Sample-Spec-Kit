# Tasks: Azure Nightly Publish Workflow

**Input**: Design documents from `/specs/020-azure-nightly-publish/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: No test tasks are generated. The implementation consists entirely of YAML workflow and Bicep infrastructure-as-code files, which are validated by deployment rather than unit/integration tests. The validate job within the workflow itself runs the full CI suite.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. This feature modifies only 3 files (1 new workflow, 1 modified Bicep, 1 new parameters file) so the task count is compact.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Workflow**: `.github/workflows/nightly.yml` (new file)
- **Infrastructure**: `infra/main.bicep` (modified), `infra/main.parameters.nightly.json` (new file)

---

## Phase 1: Setup (Infrastructure Conditionality)

**Purpose**: Make the existing Bicep infrastructure flexible enough to support the nightly environment by adding conditional parameters with backward-compatible defaults. This MUST complete before the workflow can target a nightly deployment.

- [x] T001 Add `deployFrontDoor` boolean parameter (default `true`) to `infra/main.bicep` with description: "Deploy Azure Front Door CDN. Set to false for non-user-facing environments like nightly."
- [x] T002 Add `deployContainerRegistry` boolean parameter (default `true`) to `infra/main.bicep` with description: "Deploy a Container Registry in this resource group. Set to false when using a shared ACR from another resource group."
- [x] T003 Add `sharedContainerRegistryLoginServer` string parameter (default `''`) to `infra/main.bicep` with description: "Shared Container Registry login server URL. Required when deployContainerRegistry is false."
- [x] T004 Add `deployMonitoringAlerts` boolean parameter (default `true`) to `infra/main.bicep` with description: "Deploy monitoring alert rules. Set to false for cost-optimized environments."
- [x] T005 Update `environmentName` parameter description from "staging or production" to "staging, production, or nightly" in `infra/main.bicep`
- [x] T006 Wrap `registry` module invocation with `if (deployContainerRegistry)` condition and add `containerRegistryLoginServer` variable that resolves to `registry.outputs.loginServer` when deployed or `sharedContainerRegistryLoginServer` when skipped in `infra/main.bicep`
- [x] T007 Update `containerApps` module to use the new `containerRegistryLoginServer` variable instead of `registry.outputs.loginServer` directly in `infra/main.bicep`
- [x] T008 Wrap `frontDoor` module invocation with `if (deployFrontDoor)` condition in `infra/main.bicep`
- [x] T009 Wrap `monitoringAlerts` module invocation with `if (deployMonitoringAlerts)` condition in `infra/main.bicep`
- [x] T010 Update outputs section: `AZURE_CONTAINER_REGISTRY_ENDPOINT` and `containerRegistryLoginServer` to use the resolved `containerRegistryLoginServer` variable; `frontDoorEndpoint` to conditionally output empty string when Front Door is not deployed in `infra/main.bicep`

**Checkpoint**: `infra/main.bicep` now supports conditional module deployment. Existing staging/production deployments are unaffected because all new parameters default to `true`/`''` (backward-compatible).

---

## Phase 2: Foundational (Nightly Parameters File)

**Purpose**: Create the nightly-specific Bicep parameters file that configures the nightly environment. This MUST complete before the workflow deploy job can reference it.

**⚠️ CRITICAL**: Phase 1 must be complete — the parameters file references the new conditional parameters.

- [x] T011 Create `infra/main.parameters.nightly.json` with nightly-specific parameter values: `environmentName: "nightly"`, `location: "eastus2"`, `deployFrontDoor: false`, `deployContainerRegistry: false`, `deployMonitoringAlerts: false`, `sharedContainerRegistryLoginServer: "${AZURE_CONTAINER_REGISTRY}"`, `minReplicas: 0`, `maxReplicas: 2`, `cpuCores: "0.5"`, `memorySize: "1Gi"`, `dbSkuName: "Standard_B1ms"`, `dbStorageSizeGB: 32`, and placeholder secret parameters per `contracts/infrastructure.md`

**Checkpoint**: Infrastructure files are complete. A `az deployment group create` using `main.parameters.nightly.json` would provision a nightly environment without Front Door, without its own ACR, and without monitoring alerts.

---

## Phase 3: User Story 1 — Automated Nightly Validation and Deployment (Priority: P1) 🎯 MVP

**Goal**: A GitHub Actions workflow that triggers at midnight UTC, runs the full CI validation suite, builds and pushes a container image with nightly tags, and deploys to a dedicated nightly Container App.

**Independent Test**: Trigger the workflow manually from GitHub Actions UI → verify all three jobs complete (validate → build-and-push → deploy-nightly) → verify the nightly environment health endpoint responds → verify nightly-tagged images exist in ACR.

### Implementation for User Story 1

- [x] T012 [US1] Create `.github/workflows/nightly.yml` with workflow `name: Nightly Build & Deploy`, `schedule` trigger (`cron: '0 0 * * *'`), and `concurrency` block (`group: nightly-build`, `cancel-in-progress: false`) per `contracts/nightly-workflow.yml`
- [x] T013 [US1] Add `env` block with `REGISTRY: ${{ secrets.AZURE_CONTAINER_REGISTRY }}` to `.github/workflows/nightly.yml`
- [x] T014 [US1] Implement `validate` job in `.github/workflows/nightly.yml`: `runs-on: ubuntu-latest`, checkout, setup-node (v24, npm cache), `npm ci`, and the full ordered validation suite — token build, typecheck, lint, web build, bundle size check, unit tests (tokens, shared-ui, shared, web, mobile), Playwright install + E2E, i18n lint, Storybook build + a11y audit — per contract steps in `contracts/nightly-workflow.yml`
- [x] T015 [US1] Implement `build-and-push` job in `.github/workflows/nightly.yml`: `needs: [validate]`, `permissions: { id-token: write, contents: read }`, `outputs` for image tags, Azure OIDC login with staging identity (`secrets.AZURE_CLIENT_ID`), ACR login, generate date tag (`nightly-YYYYMMDD`) and SHA tag (`nightly-sha-{short_sha}`), Docker build and push with both tags — per contract in `contracts/nightly-workflow.yml`
- [x] T016 [US1] Implement `deploy-nightly` job in `.github/workflows/nightly.yml`: `needs: [build-and-push]`, `environment: nightly`, `permissions: { id-token: write, contents: read }`, env vars for `IMAGE_TAG`, `RESOURCE_GROUP` (`rg-acroyoga-nightly`), `APP_NAME` (`ca-acroyoga-web-nightly`), Azure OIDC login with nightly identity (`secrets.AZURE_CLIENT_ID_NIGHTLY`), deploy via `azure/container-apps-deploy-action@v2`, readiness wait with `curl --retry`, health endpoint smoke test, home page smoke test — per contract in `contracts/nightly-workflow.yml`

**Checkpoint**: The nightly workflow file is complete. On merge to `main`, the workflow will trigger at midnight UTC, run full validation, build/push with nightly tags, deploy to the nightly Container App, and verify with smoke tests. User Story 1 is fully functional.

---

## Phase 4: User Story 2 — Manual Nightly Build Trigger (Priority: P1)

**Goal**: The same nightly workflow supports manual triggering via `workflow_dispatch`, executing the identical pipeline as a scheduled run.

**Independent Test**: Navigate to GitHub Actions → Nightly Build & Deploy → "Run workflow" → select `main` branch → verify the pipeline completes with all three jobs and the nightly environment is updated.

### Implementation for User Story 2

- [x] T017 [US2] Add `workflow_dispatch` trigger to the `on:` block in `.github/workflows/nightly.yml` (no inputs — the pipeline runs identically for both trigger types per R-003)

**Checkpoint**: The workflow now supports both triggers. A developer can manually run the full nightly pipeline on demand. Note: T012 may already include the `workflow_dispatch` trigger in the `on:` block since the contract defines both triggers together. If so, this task validates its presence; if not, it adds it.

---

## Phase 5: User Story 3 — Nightly Deployment Isolation (Priority: P1)

**Goal**: The nightly environment is completely isolated from staging and production — its own resource group, Container App, managed identity, and GitHub environment configuration.

**Independent Test**: Verify that the nightly workflow's deploy job targets `rg-acroyoga-nightly` / `ca-acroyoga-web-nightly` (not staging/production resources), uses `environment: nightly` in the GitHub job, and the Bicep parameters file creates a separate resource stack.

### Implementation for User Story 3

- [x] T018 [US3] Verify isolation in `.github/workflows/nightly.yml`: confirm `deploy-nightly` job uses `environment: nightly`, `RESOURCE_GROUP: rg-acroyoga-nightly`, `APP_NAME: ca-acroyoga-web-nightly`, and authenticates with `AZURE_CLIENT_ID_NIGHTLY` (separate from staging/production client IDs)
- [x] T019 [US3] Verify isolation in `infra/main.parameters.nightly.json`: confirm `environmentName: "nightly"` which produces distinct resource names (`id-acroyoga-nightly`, `cae-acroyoga-nightly`, `ca-acroyoga-web-nightly`) and confirm `deployFrontDoor: false`, `deployContainerRegistry: false` to avoid overlapping with staging/production resources

**Checkpoint**: Environment isolation is guaranteed by design. The nightly environment has its own resource group, identity, Container App, and GitHub environment — no shared compute or config with staging/production (FR-014).

---

## Phase 6: User Story 4 — Nightly Build Failure Notification (Priority: P2)

**Goal**: When the nightly workflow fails at any step, the team is notified with clear failure identification and a direct link to the failed run.

**Independent Test**: Introduce a deliberate failure (e.g., failing lint) → run the workflow → verify GitHub Actions marks it as failed with the specific failing step visible → confirm GitHub's built-in notification (email/mobile) fires for the failure.

### Implementation for User Story 4

- [x] T020 [US4] Verify that the three-job structure in `.github/workflows/nightly.yml` provides clear failure identification: validation failure stops before build (FR-013), build failure stops before deploy, deploy/smoke failure is clearly identified — GitHub's built-in workflow failure notifications handle alerting per spec assumption (no custom notification system needed)

**Checkpoint**: Failure notification relies on GitHub's native workflow failure status and notifications. The three-job structure ensures the failing step (validate, build-and-push, or deploy-nightly) is clearly identifiable. No additional implementation needed beyond what GitHub provides out of the box.

---

## Phase 7: User Story 5 — Nightly Image Tagging and Traceability (Priority: P2)

**Goal**: Every nightly image is tagged with both a date-based tag (`nightly-YYYYMMDD`) and a commit-based tag (`nightly-sha-{short_sha}`) for traceability.

**Independent Test**: After a nightly build, inspect the ACR tags → verify both `nightly-YYYYMMDD` and `nightly-sha-XXXXXXX` tags exist → verify neither conflicts with staging/production tag patterns.

### Implementation for User Story 5

- [x] T021 [US5] Verify tagging in `.github/workflows/nightly.yml` `build-and-push` job: confirm the `meta` step generates `DATE_TAG="nightly-$(date -u +'%Y%m%d')"` and `SHA_TAG="nightly-sha-${GITHUB_SHA:0:7}"`, and the build step applies both tags to the Docker image and pushes both — per R-004 and FR-007

**Checkpoint**: Image tagging is implemented as part of the `build-and-push` job (T015). This story validates the tagging strategy meets traceability requirements: UTC date, 7-char short SHA, `nightly-` prefix distinguishing from staging/production tags.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation cleanup across all files.

- [x] T022 Validate backward compatibility: confirm that `infra/main.bicep` changes do not break existing staging/production deployments by verifying all new parameters have backward-compatible defaults (`deployFrontDoor: true`, `deployContainerRegistry: true`, `deployMonitoringAlerts: true`, `sharedContainerRegistryLoginServer: ''`) in `infra/main.bicep`
- [x] T023 Validate YAML syntax of `.github/workflows/nightly.yml` — ensure valid GitHub Actions schema, correct indentation, proper `${{ }}` expression syntax, and no reference to non-existent secrets or actions
- [x] T024 [P] Validate JSON syntax of `infra/main.parameters.nightly.json` — ensure valid ARM deployment parameters schema and all parameter names match those defined in `infra/main.bicep`
- [x] T025 Run quickstart.md validation steps from `specs/020-azure-nightly-publish/quickstart.md` to confirm the implementation matches the documented setup and verification guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. Modifies `infra/main.bicep` only.
- **Foundational (Phase 2)**: Depends on Phase 1 (parameters file references new Bicep params). Creates `infra/main.parameters.nightly.json`.
- **User Story 1 (Phase 3)**: Can start in parallel with Phase 1 and 2 — the workflow file (`.github/workflows/nightly.yml`) is a new file independent of Bicep changes. However, the deploy job logically depends on the nightly infrastructure being defined.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (adds trigger to existing workflow file) — or may be completed as part of T012 since both triggers are in the same `on:` block.
- **User Story 3 (Phase 5)**: Verification only — depends on Phases 1–4 being complete.
- **User Story 4 (Phase 6)**: Verification only — depends on Phase 3 (workflow structure).
- **User Story 5 (Phase 7)**: Verification only — depends on Phase 3 (tagging in build-and-push job).
- **Polish (Phase 8)**: Depends on all previous phases being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Core workflow — can start immediately (new file)
- **User Story 2 (P1)**: Shares same file as US1 — implement together or sequentially
- **User Story 3 (P1)**: Isolation verified by Bicep params (Phase 1–2) and workflow targeting (Phase 3)
- **User Story 4 (P2)**: Relies on three-job structure from US1 — verification after US1
- **User Story 5 (P2)**: Relies on tagging strategy in build-and-push job from US1 — verification after US1

### Within Each User Story

- Infrastructure changes (Bicep) before workflow changes
- Workflow structure before individual job implementation
- Validate job before build-and-push job (sequential dependency)
- Build-and-push job before deploy-nightly job (sequential dependency)

### Parallel Opportunities

- **Phase 1** tasks T001–T005 (parameter additions) can be done in a single edit session since they all modify the same file — but they are listed separately for clarity and tracking
- **Phase 1 + Phase 3** can start in parallel: Bicep changes (`infra/main.bicep`) and workflow creation (`.github/workflows/nightly.yml`) are different files
- **Phase 2** (`infra/main.parameters.nightly.json`) is a new file and can be created in parallel with Phase 3
- **Phase 8** T023 and T024 (YAML and JSON validation) can run in parallel

---

## Parallel Example: Phase 1 + Phase 3

```bash
# These can run in parallel (different files):
# Stream A: Infrastructure changes
Task T001–T010: Modify infra/main.bicep (add conditional params, wrap modules)
Task T011: Create infra/main.parameters.nightly.json

# Stream B: Workflow creation
Task T012–T016: Create .github/workflows/nightly.yml (all three jobs)
Task T017: Add workflow_dispatch trigger (if not already in T012)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Add conditional parameters to `infra/main.bicep` (T001–T010)
2. Complete Phase 2: Create `infra/main.parameters.nightly.json` (T011)
3. Complete Phase 3: Create `.github/workflows/nightly.yml` with all three jobs (T012–T016)
4. **STOP and VALIDATE**: Trigger workflow manually → verify validate → build-and-push → deploy-nightly all succeed
5. Merge to `main` and confirm scheduled trigger fires at midnight UTC

### Incremental Delivery

1. Complete Phases 1–2 → Infrastructure ready for nightly environment
2. Add User Story 1 (Phase 3) → Full automated pipeline → Deploy/Demo (MVP!)
3. Add User Story 2 (Phase 4) → Manual trigger support → Verify
4. Verify User Stories 3, 4, 5 (Phases 5–7) → Confirm isolation, notifications, tagging
5. Polish (Phase 8) → Final validation across all files

### Practical Note

Because this feature modifies only 3 files and all user stories share the same workflow file, the most efficient approach is to implement all phases in a single pass:

1. Modify `infra/main.bicep` with all conditional parameters and module wrapping (T001–T010)
2. Create `infra/main.parameters.nightly.json` (T011)
3. Create `.github/workflows/nightly.yml` with both triggers, all three jobs, nightly tags, and smoke tests (T012–T017)
4. Validate all files (T018–T025)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No unit/integration tests needed — YAML and Bicep are validated by deployment
- The validate job within the workflow IS the test suite — it runs the full CI validation before any deployment
- All new Bicep parameters have backward-compatible defaults — staging/production unaffected
- The workflow contract in `contracts/nightly-workflow.yml` is the definitive reference for implementation
- Commit after completing each phase for clean git history
- Total: 25 tasks across 8 phases
