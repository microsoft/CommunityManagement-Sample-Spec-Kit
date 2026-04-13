# Tasks: Optimised Deployment Pipeline

**Input**: Design documents from `/specs/copilot/create-optimized-deployment-pipeline/` and `/specs/021-optimized-deployment-pipeline/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/nightly-workflow.md ✅, quickstart.md ✅

**Tests**: No test files are added by this feature. YAML and Bicep changes are validated by deployment (nightly pipeline execution). `pool: "forks"` is already configured in `apps/web/vitest.config.ts`; defence-in-depth is added at the workflow level.

**Organization**: Tasks are grouped by user story. Phase 1 (Bicep cleanup) and Phase 2 (foundational timeouts) must complete before user story phases. User stories within the nightly workflow hardening phase can be implemented sequentially since they all modify `.github/workflows/nightly.yml`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

```text
.github/workflows/nightly.yml   # PRIMARY — hardened nightly pipeline
infra/modules/database.bicep     # Remove unused param
infra/modules/front-door.bicep   # Remove unused param
infra/modules/container-apps.bicep # Remove unused param
infra/main.bicep                 # Update module invocations
```

---

## Phase 1: Setup (Bicep Parameter Cleanup)

**Purpose**: Remove unused Bicep parameters that generate linter warnings (BCP `no-unused-params`). These are independent, low-risk changes that must complete before the workflow can validate Bicep cleanly.

- [ ] T001 [P] Remove unused param `managedIdentityClientId` (delete `@description` decorator on line 24 and `param managedIdentityClientId string` declaration on line 25) from `infra/modules/database.bicep`. This param is declared but never referenced — only `managedIdentityPrincipalId` is used for the Entra admin and role assignment.
- [ ] T002 [P] Remove unused param `customDomainHostname` (delete `@description` decorator on line 4 and `param customDomainHostname string = ''` declaration on line 5) from `infra/modules/front-door.bicep`. Custom domain configuration is not yet implemented in this module.
- [ ] T003 [P] Remove unused param `appInsightsConnectionString` (delete `@description` decorator on line 25 and `param appInsightsConnectionString string` declaration on line 26) from `infra/modules/container-apps.bicep`. The Application Insights connection string is delivered via Key Vault secret reference (`applicationinsights-connection-string`), not through this param. Note: research.md R-006 states this module has no unused params, but code inspection confirms `appInsightsConnectionString` is declared and never referenced in the module body (only 1 occurrence — the declaration).
- [ ] T004 Update `infra/main.bicep` to stop passing removed params: delete `managedIdentityClientId: identity.outputs.clientId` from the database module invocation (line 151), delete `customDomainHostname: customDomainHostname` from the front-door module invocation (line 226 — note: data-model.md says this isn't passed, but code inspection confirms it IS passed at line 226), and delete `appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString` from the container-apps module invocation (line 206).

**Checkpoint**: All Bicep modules compile cleanly with no `no-unused-params` warnings. Run `az bicep build --file infra/main.bicep` or `az bicep lint --file infra/main.bicep` to verify.

---

## Phase 2: Foundational (Workflow Timeout Structure)

**Purpose**: Add job-level timeouts — the foundational defence against indefinite hangs. This MUST be in place before any other workflow hardening begins.

**⚠️ CRITICAL**: No user story work on `nightly.yml` should begin until this phase is complete.

- [ ] T005 Add `timeout-minutes` to all three jobs in `.github/workflows/nightly.yml`: set `timeout-minutes: 45` on the `validate` job (after `runs-on: ubuntu-latest`, before `permissions:`), set `timeout-minutes: 30` on the `build-and-push` job, and set `timeout-minutes: 30` on the `deploy` job. These values are ~2× observed worst-case durations per R-002. Preserve all existing job properties (`runs-on`, `needs`, `environment`, `outputs`, `permissions`, `env`).

**Checkpoint**: Workflow YAML is valid. All three jobs now have explicit time boundaries per FR-001.

---

## Phase 3: User Story 1 — Reliable Pipeline with Guaranteed Completion (Priority: P1) 🎯 MVP

**Goal**: Flaky infrastructure operations (ACR login, Azure CLI queries) have retry wrappers so transient failures don't fail the entire pipeline. Combined with Phase 2 timeouts, this guarantees the pipeline always terminates in a known state.

**Independent Test**: Trigger the nightly workflow via `workflow_dispatch`. Verify all jobs complete (pass or fail) within their declared time boundaries and the total workflow finishes within 45 minutes wall-clock.

### Implementation for User Story 1

- [ ] T006 [US1] Wrap the ACR login step in `.github/workflows/nightly.yml` with a retry loop: 3 attempts with 10s backoff between retries. On final failure, emit `::error title=AUTHENTICATION: ACR login::Failed to log in to ACR {registry} after 3 attempts (exit code: $?)`. Replace the current single-line `az acr login --name ...` with a bash `for` loop that attempts the login and sleeps on failure.
- [ ] T007 [US1] Wrap all three `az containerapp show` invocations in the deploy job of `.github/workflows/nightly.yml` (in "Wait for readiness", "Smoke test — health", and "Smoke test — home page" steps) with a retry wrapper: 3 attempts with 5s backoff. On failure, emit `::error title=INFRASTRUCTURE: Container App query::Failed to resolve FQDN for {APP_NAME} after 3 attempts`. Extract the URL resolution into a reusable shell function or inline retry block at the top of each step's `run:` script.

**Checkpoint**: ACR login and container app URL resolution are resilient to transient Azure API failures. Each retry emits diagnostic context on final failure.

---

## Phase 4: User Story 2 — Graceful Infrastructure Wake-Up Before Deployment (Priority: P1)

**Goal**: Sleeping PostgreSQL servers are detected and woken with structured annotations so the team knows exactly what happened during the wake sequence.

**Independent Test**: Manually stop the PostgreSQL server (`az postgres flexible-server stop`), then trigger the nightly pipeline. Verify the pipeline starts the server, waits for Ready state, and completes deployment successfully.

### Implementation for User Story 2

- [ ] T008 [US2] Harden the "Start PostgreSQL server if stopped" step in `.github/workflows/nightly.yml` with structured annotations: (a) Add `::notice title=PostgreSQL Wake::Server {name} is already running — skipping start` when no stopped servers are found. (b) Add `::notice title=PostgreSQL Wake::Server {name} started and ready (elapsed: {N}s)` on successful wake using `$SECONDS` for timing. (c) Replace the existing `::error::` on timeout with `::error title=TIMEOUT: PostgreSQL Wake::Server {name} did not reach Ready state after 300s (last state: {STATE}, attempts: {i}/30)`. (d) Add a retry wrapper (3 attempts, 10s backoff) around the `az postgres flexible-server list` query that discovers stopped servers, with `::error title=INFRASTRUCTURE: PostgreSQL list::` on failure. Preserve the existing polling loop structure (30 attempts × 10s = 5 min max).

**Checkpoint**: PostgreSQL wake-up emits structured annotations for every outcome (already running, started successfully, timeout). Polling budget is bounded at 5 minutes.

---

## Phase 5: User Story 3 — Idempotent Infrastructure Deployment (Priority: P1)

**Goal**: Bicep deployments are pre-validated before execution and retried on transient ARM errors, ensuring idempotent nightly runs.

**Independent Test**: Run the nightly pipeline twice in succession with identical parameters. Both runs complete successfully with no Bicep errors.

### Implementation for User Story 3

- [ ] T009 [US3] Add a new step "Validate infrastructure (Bicep)" in the deploy job of `.github/workflows/nightly.yml`, positioned AFTER the PostgreSQL wake step and BEFORE the existing "Deploy infrastructure (Bicep)" step. The step runs `az deployment group validate` with the same `--resource-group`, `--template-file`, `--parameters` as the deploy step. On failure, emit `::error title=DEPLOYMENT: Bicep validate::Template validation failed — {error message}` and `exit 1` to fail fast before attempting actual deployment. Use the exact same parameter set as the deploy step to ensure parity. Reference: FR-006, R-009.
- [ ] T010 [US3] Wrap the "Deploy infrastructure (Bicep)" step in `.github/workflows/nightly.yml` with a retry loop: 2 attempts with 60s backoff between retries. On each failure, capture the Azure error output. On final failure, emit `::error title=DEPLOYMENT: Bicep deploy::Deployment failed after 2 attempts — {error message}`. On success, emit `::notice title=Bicep Deploy::Infrastructure deployment completed successfully`. Replace the current single `az deployment group create` with a bash loop.

**Checkpoint**: Bicep template is validated before deployment. Transient ARM errors are retried once. Structural template errors fail fast at the validate step.

---

## Phase 6: User Story 4 — Faster Builds Through Container Layer Caching (Priority: P2)

**Goal**: Docker image builds use BuildKit layer caching via GitHub Actions cache backend, reducing build time ≥30% on cache-hit runs.

**Independent Test**: Run the nightly pipeline twice in succession (no dependency changes). Verify the second build shows cache hits in the build log and completes faster.

### Implementation for User Story 4

- [ ] T011 [US4] Replace the Docker build/push mechanism in the `build-and-push` job of `.github/workflows/nightly.yml`. Make these changes in order: (a) Add a new step after checkout: `docker/setup-buildx-action` (no special parameters needed — just `uses: docker/setup-buildx-action`). (b) Replace the existing "Build and push container image" step (which uses `docker build` + `docker push`) with a `docker/build-push-action` step configured as: `uses: docker/build-push-action` with `push: true`, `context: .`, `file: ./Dockerfile`, `tags:` with both `${REGISTRY}/acroyoga-web:${{ steps.meta.outputs.date-tag }}` and `${REGISTRY}/acroyoga-web:${{ steps.meta.outputs.sha-tag }}`, `cache-from: type=gha`, `cache-to: type=gha,mode=max`. The `REGISTRY` value comes from `${{ secrets.AZURE_CONTAINER_REGISTRY }}`. Reference: R-001, contracts/nightly-workflow.md Docker Build Contract.

**Checkpoint**: Docker build uses BuildKit with GHA cache backend. First run populates the cache; second run shows cache hits for unchanged layers. Build falls back to full build if cache is unavailable (FR-010).

---

## Phase 7: User Story 5 — Structured Error Annotations for Fast Failure Diagnosis (Priority: P2)

**Goal**: Every failure-prone step in the pipeline emits structured `::error::`, `::warning::`, or `::notice::` annotations visible in the GitHub Actions run summary.

**Independent Test**: Induce failures in each pipeline phase (validation, build, deployment, smoke test). Verify that each failure produces a structured annotation with category, step name, and actionable context.

### Implementation for User Story 5

- [ ] T012 [US5] Add `::error title=BUILD:` annotations to all validate job test and build steps in `.github/workflows/nightly.yml`. For each of these steps, wrap the command in an `if ! command; then echo "::error title=BUILD: {step name}::{failure message}"; exit 1; fi` pattern: "Build design tokens", "Typecheck", "Lint", "Build web app", "Check bundle size" (already has `::error::` — update to include `title=BUILD: Bundle Size Check::`), "Run token tests", "Run shared-ui tests", "Run shared tests", "Run web tests", "Run mobile unit tests", "Run E2E tests", "i18n string lint", "Build Storybook", "Storybook a11y audit". Each annotation should include the step name and exit code.
- [ ] T013 [US5] Add annotations to `build-and-push` job steps in `.github/workflows/nightly.yml`: (a) After the `docker/build-push-action` step (from T011), add a `::notice title=Docker Build::Build completed (cache status: hit/miss)` notice — inspect the action's outputs or log for cache indicators. (b) On Docker build failure, the `docker/build-push-action` step will fail naturally; add a step with `if: failure()` that emits `::error title=BUILD: Docker build and push::Docker build/push failed (exit code: check previous step)`. (c) Add `::warning title=BUILD: Docker cache::Cache miss — full build executed` if the build log indicates a cache miss.
- [ ] T014 [US5] Add annotations to deploy job smoke test and readiness check steps in `.github/workflows/nightly.yml`: (a) "Wait for readiness" step: add `$SECONDS` timing before the curl command, then on failure emit `::error title=TIMEOUT: Readiness Check::Readiness check failed after {elapsed}s. Endpoint: https://{APP_URL}/api/ready, retries: 50, delay: 15s`; on success emit `::notice title=Readiness Check::Application ready after {elapsed}s`. (b) "Smoke test — health" step: wrap in error handler with `::error title=SMOKE_TEST: Health Check::Health check failed. Endpoint: https://{APP_URL}/api/health, response: {truncated body}`. (c) "Smoke test — home page" step: wrap in error handler with `::error title=SMOKE_TEST: Home Page::Home page check failed. Endpoint: https://{APP_URL}/, HTTP status: {code}`.

**Checkpoint**: Every failure-prone step across all three jobs has a structured annotation. The GitHub Actions run summary shows categorised error annotations (BUILD, AUTHENTICATION, INFRASTRUCTURE, TIMEOUT, DEPLOYMENT, SMOKE_TEST) for any failure.

---

## Phase 8: User Story 6 — Crash-Resilient Test Execution (Priority: P2)

**Goal**: All test suites in the validate job use fork-based process isolation to prevent V8 JIT and memory-related crashes in CI.

**Independent Test**: Run the full test suite in the nightly pipeline and verify all tests complete without V8 or runtime engine crashes.

### Implementation for User Story 6

- [ ] T015 [US6] Add `--pool forks` CLI flag to test runner invocations in the validate job of `.github/workflows/nightly.yml`. Change each `npm run test -w @acroyoga/{package}` to `npm run test -w @acroyoga/{package} -- --pool forks` for the four packages that do NOT already have `pool: "forks"` in their vitest config: `tokens`, `shared-ui`, `shared`, and `mobile`. The web package (`apps/web/vitest.config.ts` line 15) already has `pool: "forks"` configured, so its test step does not require the CLI flag — but adding it for consistency is harmless. This is defence-in-depth per FR-008 and the spec assumptions that initial fixes are already on main. Reference: R-008, spec User Story 6.

**Checkpoint**: All test suites use fork-based process isolation. No V8 JIT crashes across 14 consecutive nightly runs (SC-009).

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation that all changes are consistent and no existing capabilities are broken.

- [ ] T016 [P] Validate `.github/workflows/nightly.yml` YAML syntax is well-formed — use `yamllint` or GitHub's workflow validator. Ensure all `uses:` action references are pinned to current major versions (`actions/checkout@v5`, `actions/setup-node@v5`, `azure/login@v3`, `docker/setup-buildx-action`, `docker/build-push-action`). Verify no YAML parse errors from indentation or quoting issues in the expanded bash scripts.
- [ ] T017 Review all changes against FR-017 (preserve all existing nightly capabilities) and FR-018 (do NOT modify ci.yml or deploy.yml). Verify: (a) scheduled trigger at midnight UTC preserved, (b) `workflow_dispatch` preserved, (c) nightly-specific image tags preserved (date + SHA), (d) deployment to `nightly` environment preserved, (e) smoke tests preserved, (f) concurrency group `nightly-build` preserved, (g) ci.yml and deploy.yml are UNCHANGED.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. All T001–T003 run in parallel (different files). T004 depends on T001 + T002 + T003 completion.
- **Foundational (Phase 2)**: Depends on Phase 1 completion (clean Bicep is a prerequisite for the Bicep validation step added in Phase 5). T005 must complete before any nightly.yml user story work.
- **User Stories (Phases 3–8)**: All depend on Phase 2 (T005) completion. Within the nightly.yml file, stories are implemented sequentially in priority order since they all modify the same file.
- **Polish (Phase 9)**: Depends on all user story phases (Phases 3–8) being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Phase 2 — no dependencies on other stories (modifies deploy job PG wake section)
- **User Story 3 (P1)**: Can start after Phase 2 — no dependencies on other stories (adds new steps + wraps existing step in deploy job)
- **User Story 4 (P2)**: Can start after Phase 2 — no dependencies on other stories (modifies build-and-push job)
- **User Story 5 (P2)**: Depends on US1 (T006–T007), US2 (T008), US3 (T009–T010), US4 (T011) — annotations are added to the steps created/modified by earlier stories
- **User Story 6 (P2)**: Can start after Phase 2 — no dependencies on other stories (modifies validate job test commands)

### Within Each User Story

- All changes are to existing files — no models → services → endpoints pattern applies
- Retry wrappers include their error annotations (annotation is part of the retry logic)
- Each task should be committed after completion for clean git history

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can all run in parallel (different Bicep module files)
- **Phase 2**: Single task (T005) — no parallelism needed
- **Phases 3–8**: All modify `.github/workflows/nightly.yml` — must be sequential within the file, but US4 (build-and-push job) and US6 (validate job) modify different job sections and could theoretically be developed in parallel by careful merge
- **Phase 9**: T016 can run in parallel with T017 (syntax check vs. requirements review)

---

## Parallel Example: Phase 1 (Bicep Cleanup)

```bash
# Launch all Bicep module cleanups together (different files):
Task T001: "Remove unused param managedIdentityClientId from infra/modules/database.bicep"
Task T002: "Remove unused param customDomainHostname from infra/modules/front-door.bicep"
Task T003: "Remove unused param appInsightsConnectionString from infra/modules/container-apps.bicep"

# Then update the caller:
Task T004: "Update infra/main.bicep to stop passing removed params"
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2 + User Story 1)

1. Complete Phase 1: Bicep cleanup (4 tasks, all low-risk)
2. Complete Phase 2: Add job timeouts (1 task, foundational)
3. Complete Phase 3: US1 retry wrappers (2 tasks)
4. **STOP and VALIDATE**: Trigger `workflow_dispatch` — verify all jobs have timeouts and ACR login/URL resolution are resilient
5. This alone addresses the most damaging failure mode (indefinite hangs) and provides retry resilience

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready (timeouts + clean Bicep)
2. Add US1 (retries) → Verify pipeline reliability → **MVP!**
3. Add US2 (PG wake) → Verify infrastructure wake handles all states
4. Add US3 (Bicep validate + deploy retry) → Verify idempotent deployments
5. Add US4 (Docker caching) → Verify cache-hit speedup on second run
6. Add US5 (annotations) → Verify all failures produce structured annotations
7. Add US6 (pool:forks) → Verify no V8 crashes across test suites
8. Polish → Full validation

### Key Constraints

- **DO NOT** modify `.github/workflows/ci.yml` (FR-018)
- **DO NOT** modify `.github/workflows/deploy.yml` (FR-018)
- **DO NOT** disable cost-saving configs (`minReplicas:0`, PG auto-stop)
- **PRESERVE** all existing nightly capabilities: triggers, tags, environment, smoke tests (FR-017)
- **USE** `azure/login@v3` for OIDC authentication (FR-013, FR-014)
- **USE** `actions/checkout@v5` and `actions/setup-node@v5` (FR-013)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All changes are in-place modifications to existing files — no new files are created
- No test files are added (FR-018 scope; YAML/Bicep validated by deployment)
- `pool: "forks"` for web tests is already in `apps/web/vitest.config.ts` — US6 adds defence-in-depth via CLI flags
- Error annotations are embedded in retry wrappers (US1–US3) and added separately for remaining steps (US5)
- Commit after each task or logical group for clean git history
