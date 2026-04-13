# Feature Specification: Optimised Deployment Pipeline

**Feature Branch**: `021-optimized-deployment-pipeline`  
**Created**: 2025-07-14  
**Status**: Draft  
**Input**: User description: "Harden the nightly build & deploy pipeline to be highly reliable and optimised, addressing all 7 historical failure modes discovered across 7 consecutive failed nightly runs. The pipeline must handle: (1) cold-start readiness with minReplicas:0, (2) PostgreSQL auto-stop wake, (3) V8 JIT crash prevention via vitest pool:forks, (4) Bicep deployment idempotency, (5) job-level timeouts preventing indefinite hangs, (6) Docker layer caching for faster builds, (7) structured error annotations for fast failure diagnosis. This builds on and replaces the existing nightly.yml from spec 020."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Reliable Nightly Pipeline with Guaranteed Completion (Priority: P1)

The nightly pipeline runs every night and always terminates in a known state — either success or clearly diagnosed failure — within a bounded time window. No run ever hangs indefinitely, even when Azure infrastructure is slow, container cold-starts take longer than expected, or network conditions are degraded. Every job and critical step has an explicit time boundary so the team can trust that by morning they have a definitive pass/fail result.

**Why this priority**: The single most damaging failure mode is a pipeline that hangs indefinitely — it blocks the concurrency group, produces no notification, wastes runner minutes, and gives the team no signal. Bounded execution time is the foundation on which all other reliability improvements depend.

**Independent Test**: Trigger the nightly workflow and verify that every job completes (pass or fail) within its declared time boundary, and the total workflow finishes within the maximum allowed window.

**Acceptance Scenarios**:

1. **Given** the nightly pipeline triggers (scheduled or manual), **When** any individual job exceeds its declared time limit, **Then** that job is cancelled by the runner and the workflow is marked as failed with a clear timeout indication.
2. **Given** a deployment step is waiting for container readiness, **When** the readiness check exceeds its retry window, **Then** the step fails with a structured error message and does not block subsequent diagnostic steps.
3. **Given** the full nightly pipeline runs end-to-end, **When** all steps succeed, **Then** the total wall-clock time from trigger to completion is within the declared maximum pipeline duration.
4. **Given** the Bicep deployment step encounters an Azure throttling or transient error, **When** the step retries, **Then** it either succeeds within the timeout or fails with a clear diagnostic message — it never hangs.

---

### User Story 2 — Graceful Infrastructure Wake-Up Before Deployment (Priority: P1)

The nightly environment uses cost-saving configurations — the container app scales to zero replicas and the PostgreSQL Flexible Server auto-stops when idle. Before any deployment or smoke test runs, the pipeline detects these sleeping resources and wakes them, waiting until they are fully operational. This eliminates the class of failures caused by deploying to or testing against infrastructure that is not yet ready.

**Why this priority**: Two of the seven historical failures (Runs 5 and 6) were caused by sleeping infrastructure — a stopped PostgreSQL server that blocked Bicep deployment and a cold-started container that did not become ready in time. Without infrastructure wake-up, every nightly run is at risk of the same failures.

**Independent Test**: Manually stop the PostgreSQL server and scale the container app to zero, then trigger the nightly pipeline and verify it completes successfully by waking both resources before proceeding.

**Acceptance Scenarios**:

1. **Given** the PostgreSQL Flexible Server is in a "Stopped" state, **When** the deploy job begins, **Then** the pipeline starts the server and waits until it reaches a "Ready" state before attempting Bicep deployment.
2. **Given** the container app has zero running replicas (scaled to zero), **When** the smoke test step begins, **Then** the readiness check uses sufficient retry time and delay to accommodate the cold-start time before declaring failure.
3. **Given** the PostgreSQL server is already running, **When** the wake step executes, **Then** it detects the server is already ready and proceeds immediately without delay.
4. **Given** the PostgreSQL server fails to start within the maximum wait time, **Then** the pipeline fails with a structured error annotation identifying the server name and last observed state.

---

### User Story 3 — Idempotent Infrastructure Deployment (Priority: P1)

Every Bicep deployment runs cleanly regardless of what state the infrastructure is in from the previous run. Re-running the same deployment with the same parameters produces the same result. Conditional resources (like custom role definitions) are gated by parameters so they can be toggled without breaking the deployment, and the pipeline validates the deployment template before executing it to catch scope and parameter errors early.

**Why this priority**: Runs 2 and 3 of the historical failures were caused by Bicep deployment errors — a scope error in a custom role definition and a location parameter mismatch. Idempotent deployments are essential for a pipeline that runs unattended every night.

**Independent Test**: Run the nightly pipeline twice in succession against the same environment and verify that both runs complete successfully with identical infrastructure state.

**Acceptance Scenarios**:

1. **Given** the nightly pipeline runs a Bicep deployment, **When** no infrastructure changes are needed (identical parameters to the previous run), **Then** the deployment completes successfully and reports no changes.
2. **Given** a conditional resource (such as a custom role definition) is disabled via a parameter flag, **When** the Bicep deployment runs, **Then** no scope or reference errors occur for the disabled resource.
3. **Given** the pipeline includes a pre-deployment validation step, **When** the Bicep template has a parameter or scope error, **Then** the validation step fails fast with a descriptive error before any actual deployment is attempted.
4. **Given** a previous deployment was partially completed (e.g., interrupted by a timeout), **When** the next nightly run deploys, **Then** the Bicep deployment completes successfully by reconciling the desired state.

---

### User Story 4 — Faster Builds Through Container Layer Caching (Priority: P2)

The Docker image build step uses layer caching so that unchanged layers (base image, dependency installation, build tooling) are reused from a previous build. This significantly reduces the build time for nightly runs where only application code has changed, making the overall pipeline faster and reducing runner costs.

**Why this priority**: While not a reliability issue, build speed directly affects the total pipeline duration and runner costs. Faster builds leave more time budget for the deployment and smoke test phases, which have longer inherent latency due to cloud infrastructure.

**Independent Test**: Run the nightly pipeline twice in succession (with no dependency changes between runs) and verify that the second build completes significantly faster than the first due to cached layers.

**Acceptance Scenarios**:

1. **Given** the nightly pipeline builds a Docker image, **When** the base image and dependencies have not changed since the last build, **Then** those layers are loaded from cache rather than rebuilt.
2. **Given** Docker layer caching is configured, **When** the cache is available from a previous run, **Then** the image build step completes faster than a non-cached build.
3. **Given** the dependency file (package-lock.json) has changed, **When** the Docker build runs, **Then** the dependency installation layer is rebuilt while earlier layers (base image) are still cached.
4. **Given** the cache is unavailable or expired, **When** the Docker build runs, **Then** it completes successfully with a full build (no failure due to missing cache).

---

### User Story 5 — Structured Error Annotations for Fast Failure Diagnosis (Priority: P2)

When any step in the nightly pipeline fails, the failure produces a structured annotation visible in the GitHub Actions UI — with the step name, error category, and actionable context. Team members opening the workflow run the next morning can immediately identify what failed and why, without scrolling through raw logs.

**Why this priority**: Across the 7 historical failures, diagnosis required manual log reading and cross-referencing multiple steps. Structured annotations transform the failure signal from "something broke — read the logs" to "step X failed because of Y — here is the relevant context."

**Independent Test**: Introduce a deliberate failure in each major pipeline phase (validation, build, deployment, smoke test) and verify that each produces a structured GitHub Actions error annotation with category, step name, and context.

**Acceptance Scenarios**:

1. **Given** the Bicep deployment step fails, **When** a team member views the workflow run summary, **Then** they see a structured error annotation identifying the deployment error type and the Bicep resource that failed.
2. **Given** the readiness check times out, **When** a team member views the run, **Then** they see an annotation stating the endpoint URL, the number of retries attempted, and the total time elapsed.
3. **Given** a test suite fails during the validation job, **When** a team member views the run, **Then** the annotation identifies which test suite failed and includes the exit code.
4. **Given** the Docker image push fails, **When** a team member views the run, **Then** the annotation identifies whether the failure was an authentication error, a network error, or a registry error.

---

### User Story 6 — Crash-Resilient Test Execution (Priority: P2)

The test runner is configured to prevent runtime crashes that are caused by the execution environment rather than by test logic. Specifically, the test runner uses process isolation (forked processes rather than shared threads) to avoid crashes caused by memory layout issues in the runner environment. This prevents false-negative test failures that have no relation to the application code quality.

**Why this priority**: Run 7 of the historical failures was a V8 JIT page allocation crash triggered by running vitest in threaded mode on the CI runner. This produced a confusing crash that was unrelated to any code defect. Process isolation eliminates this class of environmental crash.

**Independent Test**: Run the full test suite on a CI runner and verify that all tests complete without any V8 or runtime engine crash, and that the test runner uses process isolation.

**Acceptance Scenarios**:

1. **Given** the nightly pipeline runs the test suite, **When** the test runner executes, **Then** tests run in isolated forked processes rather than shared threads.
2. **Given** a test consumes significant memory, **When** it runs in the CI environment, **Then** it does not crash the entire test runner — only the individual forked process fails.
3. **Given** the test runner configuration specifies process isolation, **When** the configuration is inspected, **Then** it uses a fork-based pool setting.

---

### Edge Cases

- What happens when the PostgreSQL server is in a transitional state (e.g., "Starting" or "Updating") when the wake step runs? The pipeline waits and polls until the server reaches "Ready" or the maximum wait time is exceeded, at which point it fails with a diagnostic annotation.
- What happens when the Docker layer cache is corrupted or incompatible with the current build? The build falls back to a full uncached build — the cache is a performance optimisation, not a correctness requirement.
- What happens when Azure experiences a region-wide outage during the nightly run? The job-level timeout fires, the run fails with structured annotations, and the team sees a clear failure the next morning. The pipeline does not retry across regions (out of scope).
- What happens when the nightly concurrency group has a stale run that never completed? The new run waits for the stale run's timeout to expire, then proceeds. The job-level timeout ensures the stale run is eventually cancelled.
- What happens when the Bicep what-if validation passes but the actual deployment fails? The deployment step captures the Azure error response and emits a structured annotation. The what-if is a best-effort early check, not a guarantee.
- What happens when multiple PostgreSQL servers exist in the resource group and some are stopped while others are running? The wake step iterates all stopped servers and starts each one, waiting for each to reach "Ready" before proceeding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The pipeline MUST enforce a maximum time limit on each job (validate, build-and-push, deploy) so that no single job can run indefinitely.
- **FR-002**: The pipeline MUST enforce a maximum time limit on the overall workflow execution, ensuring the entire nightly run completes (pass or fail) within a bounded window.
- **FR-003**: The pipeline MUST detect stopped PostgreSQL Flexible Servers in the nightly resource group and start them before attempting Bicep deployment.
- **FR-004**: The pipeline MUST poll a started PostgreSQL server until it reports a "Ready" state, with a maximum wait time after which the step fails with a structured error.
- **FR-005**: The pipeline MUST use readiness check retries with explicit connect-timeout, max-time, and retry-max-time values sufficient to accommodate container cold-start from zero replicas.
- **FR-006**: The pipeline MUST run a Bicep what-if or validation operation before executing the actual deployment to catch template errors early.
- **FR-007**: The pipeline MUST pass conditional parameter flags for optional Bicep resources (such as custom role definitions) so they can be safely disabled without deployment errors.
- **FR-008**: The pipeline MUST configure the test runner to use fork-based process isolation (not shared threads) to prevent V8 JIT and memory-related crashes in CI.
- **FR-009**: The pipeline MUST use Docker layer caching for the container image build step, caching layers to and from a persistent store between runs.
- **FR-010**: The pipeline MUST complete the Docker image build successfully even when the layer cache is unavailable, expired, or corrupted (cache is best-effort, not required).
- **FR-011**: The pipeline MUST emit structured GitHub Actions error annotations (using `::error::` syntax) for every failure mode, including: deployment errors, readiness timeouts, test failures, build failures, and infrastructure wake-up failures.
- **FR-012**: Each error annotation MUST include the step name, error category (e.g., timeout, deployment, authentication, build), and actionable context (e.g., endpoint URL, server name, exit code).
- **FR-013**: The pipeline MUST use pinned, current-major-version action references (e.g., `@v5`, `@v3`) for all third-party GitHub Actions to prevent OIDC and API compatibility breakages.
- **FR-014**: The pipeline MUST authenticate to Azure using OIDC with managed identity, consistent with the existing nightly environment configuration and Constitution Principle XIV.
- **FR-015**: The pipeline MUST use the same Node.js version (24) and validation steps as the existing CI workflow to ensure consistent results.
- **FR-016**: The pipeline MUST use concurrency controls to prevent overlapping nightly runs, consistent with the existing behaviour.
- **FR-017**: The pipeline MUST preserve all existing nightly workflow capabilities: scheduled trigger at midnight UTC, manual trigger via workflow_dispatch, nightly-specific image tagging (date and commit SHA), deployment to the dedicated nightly environment, and smoke tests.
- **FR-018**: The pipeline MUST NOT modify the existing CI workflow (`ci.yml`) or the existing deploy workflow (`deploy.yml`).

### Key Entities

- **Pipeline Job**: A distinct execution unit within the workflow (validate, build-and-push, deploy), each with its own time limit, permissions, and failure handling.
- **Infrastructure Wake-Up Sequence**: The ordered set of checks and start commands that bring sleeping Azure resources (PostgreSQL server, container app from zero replicas) to a ready state before deployment.
- **Error Annotation**: A structured GitHub Actions annotation that surfaces failure context (step, category, detail) in the workflow run summary without requiring log inspection.
- **Layer Cache**: A persistent store of Docker build layers that is populated during each successful build and consumed on subsequent builds to skip unchanged layers.
- **Readiness Check**: A retry loop that polls the deployed container's health endpoint with explicit timeout and retry parameters to accommodate cold-start latency.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The nightly pipeline completes (pass or fail) within 45 minutes wall-clock time in at least 95% of runs, measured over any 30-consecutive-run window.
- **SC-002**: No nightly run hangs indefinitely — every run terminates within the declared maximum time boundary, verified over 14 consecutive runs.
- **SC-003**: The pipeline succeeds on the first attempt in at least 6 out of 7 consecutive runs when no application code defects are present, measured over any 7-run window.
- **SC-004**: The Docker image build step completes at least 30% faster on cache-hit runs compared to full builds, measured by comparing cached vs uncached build durations.
- **SC-005**: Every failed run produces at least one structured error annotation visible in the GitHub Actions run summary, identifying the failing step and error category — verified by inducing each of the 7 historical failure categories.
- **SC-006**: The pipeline successfully deploys when the PostgreSQL server starts in a "Stopped" state, without manual intervention, in at least 3 consecutive tests.
- **SC-007**: The pipeline successfully deploys when the container app has zero running replicas, with the readiness check accommodating cold-start time, in at least 3 consecutive tests.
- **SC-008**: Running the pipeline twice in succession with identical parameters produces two successful deployments with no Bicep errors, confirming idempotency.
- **SC-009**: No V8 or test-runner crashes occur during the validation job across 14 consecutive nightly runs.

## Assumptions

- All 7 historical root causes (OIDC action versions, Bicep scope error, location mismatch, curl timeout parameters, PostgreSQL auto-stop, extended readiness timeout, V8 JIT crash) have already been individually patched on the main branch. This spec focuses on defence-in-depth to prevent recurrence, not on the initial fixes.
- The nightly environment continues to use cost-saving configurations (PostgreSQL auto-stop, container app scale-to-zero with minReplicas:0) because it is not user-facing. The pipeline must accommodate these configurations rather than disabling them.
- GitHub Actions provides a built-in `timeout-minutes` property for jobs that is the primary mechanism for preventing indefinite hangs.
- Docker layer caching can be achieved using GitHub Actions cache or registry-based caching. The specific mechanism is an implementation detail, but some form of persistent cache across runs is available.
- The nightly container app cold-start time (from zero replicas to serving traffic) may take up to 10 minutes in worst-case scenarios, based on observed historical data from Runs 4 and 6.
- The Bicep what-if operation is a best-effort validation — it catches most template errors but may not catch all runtime deployment failures (e.g., Azure service quota limits).
- Structured error annotations use GitHub Actions' native `::error::` workflow command syntax, which is a stable, supported feature.
- The nightly GitHub environment secrets (AZURE_CLIENT_ID_NIGHTLY, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID, DB_ADMIN_PASSWORD, AZURE_CONTAINER_REGISTRY) are already configured and remain unchanged.

## Scope & Boundaries

### In Scope

- Adding job-level and step-level timeouts to all jobs in the nightly workflow
- Enhancing the PostgreSQL wake step with structured error annotations and bounded polling
- Adding a Bicep what-if or validation pre-check before deployment
- Ensuring Bicep conditional parameters (e.g., deployDbWakeRole) are passed correctly for idempotent runs
- Configuring Docker layer caching for the container image build step
- Adding structured `::error::` annotations to every failure-prone step
- Configuring vitest to use fork-based process isolation in the nightly workflow
- Tuning readiness check retry parameters for cold-start scenarios (minReplicas:0)
- Pinning all GitHub Action references to current stable major versions
- Updating the nightly.yml workflow file to incorporate all of the above

### Out of Scope

- Changes to the CI workflow (`ci.yml`) or the deploy workflow (`deploy.yml`)
- Changes to Bicep infrastructure modules (infra/) — this spec consumes existing modules with correct parameters
- Disabling cost-saving configurations (auto-stop, scale-to-zero) on the nightly environment
- Multi-region failover or disaster recovery for the nightly environment
- Custom notification integrations beyond GitHub's built-in workflow status
- Nightly image retention or cleanup policies
- Performance or load testing against the nightly environment
- Changes to the application code or test suites themselves
- Modifying vitest configuration at the project level — changes are scoped to the CI workflow invocation

## Dependencies

- **Spec 020 (Azure Nightly Publish)**: This spec builds on and replaces the nightly workflow defined in Spec 020. All Spec 020 functional requirements remain in effect unless explicitly superseded.
- **Spec 011 (Azure Deployment)**: The existing infrastructure deployment patterns and Bicep modules that the nightly pipeline consumes.
- **Spec 012 (Managed Identity Deploy)**: OIDC managed identity authentication pattern used for Azure login.
- **Constitution v1.5.0**: Principle II (Test-First Development) mandates CI quality gates; Principle XIV (Managed Identity) requires OIDC-based authentication.
- **Existing CI workflow** (`ci.yml`): Defines the validation steps that the nightly workflow mirrors.
- **Existing nightly workflow** (`nightly.yml`): The current implementation that this spec hardens and optimises.
- **Azure Container Registry**: Existing registry used for image caching and push.
- **Dockerfile**: Existing Dockerfile at the repository root used for container image builds.
