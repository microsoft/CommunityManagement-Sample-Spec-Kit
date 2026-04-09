# Feature Specification: Azure Nightly Publish Workflow

**Feature Branch**: `020-azure-nightly-publish`  
**Created**: 2025-07-09  
**Status**: Draft  
**Input**: User description: "Create an Azure publishing GitHub Actions workflow that runs a nightly build and full test suite, then deploys to its own dedicated 'nightly' environment on Azure. This is separate from the existing staging and production deploy workflow."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Automated Nightly Validation and Deployment (Priority: P1)

Every night at midnight UTC, the platform automatically runs the complete validation suite against the latest code on the main branch. If all checks pass, a container image is built, pushed to the container registry with a nightly-specific tag, and deployed to a dedicated nightly environment. Team members arrive each morning knowing whether the current main branch is healthy and deployable.

**Why this priority**: This is the core purpose of the feature. Without automated nightly validation and deployment, the team has no early warning system for regressions that slip past individual PR checks, and no dedicated environment to verify nightly builds against.

**Independent Test**: Wait for the scheduled workflow to trigger (or trigger it manually), and verify that the full validation suite runs, the container image is built and pushed with a nightly tag, and the nightly environment is updated and accessible.

**Acceptance Scenarios**:

1. **Given** it is midnight UTC and the main branch has commits since the last nightly run, **When** the scheduled trigger fires, **Then** the full CI validation suite executes against the latest main branch code.
2. **Given** all validation checks pass, **When** the container build step runs, **Then** a Docker image is built and pushed to the container registry with a tag that includes the date (e.g., `nightly-20250709`) and the commit identifier.
3. **Given** the image is pushed successfully, **When** the deployment step runs, **Then** the image is deployed to the dedicated nightly container app environment — not to staging or production.
4. **Given** the deployment completes, **When** smoke tests run against the nightly environment, **Then** the health endpoint returns a healthy status and the home page loads successfully.

---

### User Story 2 — Manual Nightly Build Trigger (Priority: P1)

A developer or team lead needs to verify the nightly build pipeline on demand — for example, after merging a critical fix or before a release. They manually trigger the nightly workflow from the GitHub Actions UI and receive the same full validation, build, and deployment as the scheduled run.

**Why this priority**: Manual triggering is essential for the workflow to be useful during development and incident response, not just as a passive overnight process. It shares the same priority as scheduled runs because both trigger paths must work for the feature to deliver value.

**Independent Test**: Navigate to the GitHub Actions UI, trigger the nightly workflow manually, and verify the full pipeline completes with the same steps as a scheduled run.

**Acceptance Scenarios**:

1. **Given** a developer is on the GitHub Actions page for the nightly workflow, **When** they click "Run workflow" and select the main branch, **Then** the full nightly pipeline begins execution.
2. **Given** the manual trigger is activated, **When** the pipeline completes, **Then** the nightly environment is updated with the freshly built image and all smoke tests pass.
3. **Given** a manual run is already in progress, **When** another manual trigger is attempted, **Then** the platform's default concurrency behavior applies (the existing run is not disrupted).

---

### User Story 3 — Nightly Deployment Isolation (Priority: P1)

The nightly environment is completely isolated from staging and production. A failed nightly build or a broken deployment to the nightly environment has zero impact on staging or production availability. Each environment has its own GitHub environment configuration with independent secrets and protection rules.

**Why this priority**: Environment isolation is a hard requirement — without it, nightly deployments could disrupt active staging validation or production users. This makes it equally critical to the deployment itself.

**Independent Test**: Deploy a known-broken image to the nightly environment and verify that staging and production remain unaffected and fully operational.

**Acceptance Scenarios**:

1. **Given** the nightly workflow deploys to the nightly environment, **When** the deployment fails or the nightly app becomes unhealthy, **Then** the staging and production environments continue to operate normally with no interruption.
2. **Given** the GitHub repository settings, **When** an administrator views the environments list, **Then** they see a "nightly" environment separate from "staging" and "production," each with its own secret configuration.
3. **Given** the nightly environment uses its own resource group and container app, **When** the nightly container app is inspected, **Then** it does not share compute, networking, or configuration with the staging or production container apps.

---

### User Story 4 — Nightly Build Failure Notification (Priority: P2)

When the nightly build or deployment fails, the team is notified so they can investigate first thing in the morning. The notification identifies which step failed (validation, build, push, deployment, or smoke test) and provides a direct link to the workflow run.

**Why this priority**: Notifications transform the nightly workflow from a passive log into an actionable alerting system. However, the nightly pipeline must work correctly first (P1 stories) before notifications add value.

**Independent Test**: Introduce a deliberate test failure, let the nightly workflow run, and verify that a notification is generated with the correct failure details and a link to the run.

**Acceptance Scenarios**:

1. **Given** the nightly validation suite fails (e.g., a test regression), **When** the workflow completes with a failure status, **Then** the GitHub Actions workflow run is marked as failed and any configured notification channels receive an alert.
2. **Given** a nightly workflow failure notification, **When** a developer reads the notification, **Then** they can identify which step failed and click a link that takes them directly to the failed workflow run.
3. **Given** the nightly workflow succeeds on all steps, **When** the pipeline completes, **Then** no failure notification is sent (success is silent by default).

---

### User Story 5 — Nightly Image Tagging and Traceability (Priority: P2)

Every nightly image pushed to the container registry is tagged in a way that makes it easy to identify when it was built, which commit it was built from, and that it is a nightly build (not a staging or production release). Old nightly images can be identified for cleanup.

**Why this priority**: Traceability supports debugging and auditing. Without clear tagging, it becomes difficult to correlate a deployed nightly environment with the source code that produced it. This builds on the core deployment pipeline.

**Independent Test**: After a nightly build completes, inspect the container registry and verify the image has both a date-based tag and a commit-based tag, and that neither conflicts with staging or production tags.

**Acceptance Scenarios**:

1. **Given** a nightly build completes successfully, **When** the image is pushed to the registry, **Then** it is tagged with both `nightly-YYYYMMDD` (date of the build) and `nightly-sha-{short_sha}` (commit reference).
2. **Given** two nightly builds run on consecutive nights, **When** the registry is inspected, **Then** each night's image has a unique date-based tag and both images are present.
3. **Given** a developer wants to identify the source of a deployed nightly image, **When** they read the image tag, **Then** they can determine the exact commit and date of the build without consulting external logs.

---

### Edge Cases

- What happens when the nightly schedule triggers but the main branch has no new commits since the last successful nightly run? The workflow still runs the full validation and deployment to confirm the build remains healthy — idempotent runs are expected and acceptable.
- What happens when the nightly deployment succeeds but smoke tests fail? The workflow is marked as failed, the nightly environment retains the newly deployed (potentially broken) image, and the failure notification identifies the smoke test step as the failure point.
- What happens when the container registry is temporarily unavailable during the image push? The push step fails, the workflow is marked as failed, and no deployment is attempted. The previous nightly image remains deployed.
- What happens when the nightly environment's Azure resources do not yet exist (first-time setup)? The nightly container app and resource group must be provisioned as a prerequisite (via infrastructure-as-code) before the workflow can deploy. The workflow itself does not provision infrastructure — it assumes the nightly environment already exists.
- What happens when a manual trigger and a scheduled trigger overlap? The workflow uses concurrency controls to prevent simultaneous runs — the later run waits or is cancelled based on the configured concurrency policy.
- What happens when the nightly image tag `nightly-YYYYMMDD` already exists from an earlier same-day run (e.g., a manual re-trigger)? The tag is overwritten with the newer image, and the commit-based tag provides a unique reference for each build.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a GitHub Actions workflow file that is separate from the existing CI and deploy workflows, dedicated to nightly validation and deployment.
- **FR-002**: The workflow MUST trigger automatically on a cron schedule at midnight UTC daily.
- **FR-003**: The workflow MUST support manual triggering via GitHub's `workflow_dispatch` event, allowing a team member to run it on demand.
- **FR-004**: The workflow MUST run the complete CI validation suite in order: design token build → typecheck → lint → application build → unit tests (tokens, shared-ui, shared, web, mobile) → bundle size check → Playwright end-to-end tests → internationalization string lint → Storybook build and accessibility audit.
- **FR-005**: The workflow MUST build a Docker container image using the repository's existing Dockerfile after all validation checks pass.
- **FR-006**: The workflow MUST push the built container image to the existing Azure Container Registry.
- **FR-007**: The workflow MUST tag the pushed image with a date-based tag (`nightly-YYYYMMDD`) and a commit-based tag (`nightly-sha-{short_sha}`).
- **FR-008**: The workflow MUST deploy the newly pushed image to a dedicated nightly Azure Container App that is separate from the staging and production container apps.
- **FR-009**: The workflow MUST run smoke tests against the deployed nightly environment, verifying that the health endpoint returns a healthy status and the home page loads.
- **FR-010**: The workflow MUST authenticate to Azure using OIDC with managed identity, following the same pattern as the existing deploy workflow (using `azure/login` with client ID, tenant ID, and subscription ID).
- **FR-011**: The nightly deployment MUST use a dedicated GitHub environment named "nightly" with its own secrets and optional protection rules.
- **FR-012**: The workflow MUST use concurrency controls to prevent multiple nightly runs from executing simultaneously.
- **FR-013**: The workflow MUST NOT deploy the container image if any validation step fails — deployment is gated on full validation success.
- **FR-014**: The workflow MUST NOT affect, trigger, or interfere with the existing staging and production deployment pipeline.
- **FR-015**: The workflow MUST use the same Node.js version (24) as the existing CI workflow to ensure consistent validation results.
- **FR-016**: The workflow MUST request `id-token: write` and `contents: read` permissions for OIDC authentication.

### Key Entities

- **Nightly Workflow**: The GitHub Actions workflow definition that orchestrates the nightly validation, build, push, deployment, and smoke test sequence.
- **Nightly Environment**: A dedicated Azure Container App and associated GitHub environment configuration, isolated from staging and production, where nightly builds are deployed.
- **Nightly Image Tag**: A container image tag that identifies a build as a nightly build and encodes the build date and source commit for traceability.
- **Validation Suite**: The ordered set of checks (typecheck, lint, build, tests, bundle size, E2E, i18n lint, Storybook) that must all pass before deployment proceeds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The nightly workflow runs automatically every night at midnight UTC without manual intervention, completing within 30 minutes.
- **SC-002**: The nightly workflow can be triggered manually and completes the full pipeline with identical steps and outcomes as a scheduled run.
- **SC-003**: All validation steps (token build, typecheck, lint, app build, unit tests across all packages, bundle size check, E2E tests, i18n lint, Storybook build and a11y audit) execute and pass before any deployment occurs.
- **SC-004**: The nightly container image is present in the registry with correct date-based and commit-based tags after each successful run.
- **SC-005**: The nightly environment is reachable and returns a healthy status from its health endpoint within 5 minutes of deployment completion.
- **SC-006**: A failure in any validation step prevents deployment, and the workflow run is clearly marked as failed with the specific failing step identifiable.
- **SC-007**: The staging and production environments experience zero disruption during and after nightly workflow runs, verified over 7 consecutive nightly runs.
- **SC-008**: The nightly GitHub environment is configured with its own secrets, separate from staging and production, verified by inspecting repository environment settings.
- **SC-009**: Failed nightly runs produce a workflow failure status visible in GitHub Actions, enabling notification integrations within 5 minutes of failure.

## Assumptions

- The Azure subscription has capacity to host an additional Container App environment for the nightly deployment alongside existing staging and production environments.
- The existing Azure Container Registry has sufficient storage to accommodate daily nightly images (old nightly images may be cleaned up by a separate retention policy, which is out of scope for this feature).
- The nightly Azure Container App and its resource group will be provisioned via infrastructure-as-code (Bicep) as a prerequisite before this workflow is first run. The Bicep changes to define the nightly environment are part of implementing this feature.
- The OIDC managed identity used for nightly deployments has the necessary role assignments to push to the container registry and deploy to the nightly container app.
- GitHub Actions cron schedules have a known imprecision of up to 15 minutes; the exact trigger time may vary slightly from midnight UTC and this is acceptable.
- The nightly environment does not require the same scale-to-zero configuration as production — a minimal, always-cold-startable configuration is acceptable since it is not user-facing.
- Smoke tests follow the same pattern as the existing staging deployment (health endpoint check and home page load) and do not require additional test infrastructure.
- GitHub's built-in workflow failure notifications (email, mobile) or third-party integrations are sufficient for failure alerting — no custom notification system is needed.
- The `nightly-YYYYMMDD` tag uses the UTC date at the time the image is built, not the date the schedule was intended to trigger.

## Scope & Boundaries

### In Scope

- New GitHub Actions workflow file for nightly builds (separate from existing CI and deploy workflows)
- Cron schedule configuration (midnight UTC)
- Manual workflow_dispatch trigger support
- Full CI validation suite execution (same checks as the existing CI workflow)
- Docker image build and push to the existing Azure Container Registry
- Nightly-specific image tagging strategy (date-based and commit-based)
- Deployment to a dedicated nightly Azure Container App
- Smoke tests against the deployed nightly environment
- OIDC managed identity authentication (same pattern as existing deploy workflow)
- Dedicated "nightly" GitHub environment configuration
- Concurrency controls to prevent overlapping runs
- Infrastructure-as-code additions to define the nightly container app environment

### Out of Scope

- Changes to the existing CI workflow (`ci.yml`)
- Changes to the existing deploy workflow (`deploy.yml`) or its staging/production pipeline
- Nightly image retention or cleanup policies (separate operational concern)
- Performance or load testing against the nightly environment
- Custom notification integrations beyond GitHub's built-in workflow status notifications
- Promotion of nightly images to staging or production (nightly is a validation-only environment)
- Database provisioning for the nightly environment (the nightly environment uses the same application image but infrastructure details like database connectivity are handled by the nightly environment's own configuration)
- Multi-region deployment for the nightly environment
- CDN or Front Door configuration for the nightly environment (not user-facing)
- Cost optimization or auto-shutdown of the nightly environment during off-hours

## Dependencies

- **Spec 011 (Azure Deployment)**: The existing deploy workflow and infrastructure patterns that this feature mirrors for the nightly environment.
- **Spec 012 (Managed Identity Deploy)**: OIDC managed identity authentication pattern used for Azure login in the workflow.
- **Constitution v1.5.0**: Principle II (Test-First Development) mandates CI quality gates; Principle XIV (Managed Identity) requires OIDC-based Azure authentication.
- **Existing CI workflow** (`ci.yml`): Defines the validation steps that the nightly workflow must replicate.
- **Existing deploy workflow** (`deploy.yml`): Provides the deployment pattern (Docker build, ACR push, Container Apps deploy, smoke tests) that the nightly workflow adapts.
- **Azure Container Registry**: Existing registry where nightly images will be pushed alongside staging and production images.
- **Dockerfile**: Existing Dockerfile at the repository root used to build the container image.
