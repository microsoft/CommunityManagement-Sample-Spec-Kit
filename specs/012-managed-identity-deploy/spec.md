# Feature Specification: Managed Identity Deployment Completion

**Feature Branch**: `012-managed-identity-deploy`  
**Created**: 2026-03-23  
**Status**: Draft  
**Input**: User description: "Complete managed identity deployment - devcontainer, constitution sync, Docker rebuild, Bicep redeploy, endpoint verification"

## Overview

Following the migration from WSL to Codespaces (Constitution XIII) and the addition of Managed Identity for all Azure connections (Constitution XIV), several deployment actions remain incomplete. This feature covers the final steps to bring the staging environment fully up to date: creating the devcontainer configuration, syncing governance documents, pushing all code changes, rebuilding the container image with new dependencies, redeploying updated infrastructure, and verifying the live endpoints.

## Assumptions

- All local code changes (Bicep modules, app code, constitution) have already been made and are correct
- The Azure subscription, resource group, and resources are already provisioned and accessible
- The managed identity has already been granted the necessary role assignments (Storage Blob Data Contributor, database access)
- The Bicep parameter files reference the correct existing resource names
- The container app environment and Front Door are already configured and only need updated deployments
- Standard session-based authentication is used for the web application (no changes to app auth flow)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Standardized Development Environment (Priority: P1)

A new contributor clones the repository and opens it in GitHub Codespaces (or VS Code Dev Containers). They are immediately provided with a fully configured development environment containing all required tooling — no manual setup steps needed.

**Why this priority**: Without a devcontainer, every new contributor must manually install and configure tooling, violating Constitution XIII. This is the foundational prerequisite for onboarding.

**Independent Test**: A contributor can open the repository in Codespaces and immediately run the project's build and test commands without installing anything manually.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repository, **When** a contributor opens it in GitHub Codespaces, **Then** the environment automatically provisions with Node.js 22, npm, Azure CLI, GitHub CLI, and PostgreSQL client tools
2. **Given** the devcontainer is running, **When** a contributor runs the project's build command, **Then** it succeeds without missing dependencies
3. **Given** the devcontainer is running, **When** a contributor runs the project's test suite, **Then** all tests execute without environment-related failures

---

### User Story 2 — Governance Document Consistency (Priority: P1)

A project maintainer verifies that both canonical copies of the constitution are identical, ensuring that governance rules referenced during specification and planning always match the authoritative version.

**Why this priority**: Constitution governance requires both copies to stay in sync. A stale copy could cause spec generation or planning to follow outdated rules, producing non-compliant outputs.

**Independent Test**: Compare the two constitution files byte-for-byte; they must be identical and both at v1.5.0.

**Acceptance Scenarios**:

1. **Given** the constitution at `specs/constitution.md` is at v1.5.0, **When** the sync operation completes, **Then** the copy at `.specify/memory/constitution.md` is identical to `specs/constitution.md`
2. **Given** both copies exist, **When** a diff is run between them, **Then** there are zero differences

---

### User Story 3 — All Changes Published to Remote (Priority: P1)

A team member visits the GitHub repository and sees all Managed Identity migration changes (infrastructure, application code, constitution, specs) reflected on the main branch.

**Why this priority**: Unpushed changes exist only on one machine. Until published, no CI runs, no team visibility, and no deployment pipeline can act on them.

**Independent Test**: Visit the remote repository and confirm that the latest commit includes all modified files.

**Acceptance Scenarios**:

1. **Given** local changes include modified Bicep modules, app code, constitution, and README, **When** changes are committed and pushed, **Then** the remote main branch contains all modifications
2. **Given** the push is complete, **When** CI runs on the pushed commit, **Then** all quality gates pass (typecheck, lint, build, tests)

---

### User Story 4 — Updated Container Image (Priority: P2)

The staging container image includes the newly added identity library dependency so the application can authenticate to Azure services using Managed Identity at runtime.

**Why this priority**: The deployed container currently lacks the identity library. Without rebuilding, the application will fail to connect to storage and database using Managed Identity.

**Independent Test**: Pull the rebuilt image and verify the identity library is present in the installed packages.

**Acceptance Scenarios**:

1. **Given** the application dependency file includes the identity library, **When** the container image is rebuilt, **Then** the new image in the registry contains the identity library
2. **Given** the rebuild completes, **When** the image tag is inspected in the registry, **Then** it shows a build timestamp after the dependency was added

---

### User Story 5 — Infrastructure Reflects Managed Identity Configuration (Priority: P2)

The staging Azure environment is updated so that the database recognizes the managed identity as an administrator, the container app receives the correct identity-related environment variables, and no connection string secrets remain in Key Vault for services now using Managed Identity.

**Why this priority**: Without redeploying infrastructure, the Bicep changes that enable Managed Identity auth are not applied, and the container app cannot authenticate to backend services.

**Independent Test**: Inspect the deployed container app configuration and database settings to confirm identity-related settings are present.

**Acceptance Scenarios**:

1. **Given** updated Bicep templates add Entra admin to the database, **When** infrastructure is deployed, **Then** the managed identity is registered as a database administrator
2. **Given** updated Bicep templates add identity environment variables, **When** the container app is redeployed, **Then** `AZURE_CLIENT_ID`, `AZURE_STORAGE_ACCOUNT_URL`, `PGHOST`, and `PGDATABASE` are present as environment variables
3. **Given** the storage connection string secret was removed from Bicep, **When** infrastructure is deployed, **Then** the Key Vault no longer contains the storage connection string secret
4. **Given** old container app revisions reference removed secrets, **When** a `ContainerAppSecretInUse` error occurs, **Then** old revisions are deactivated and redeployment is retried

---

### User Story 6 — Live Endpoints Respond Successfully (Priority: P2)

After all deployment steps are complete, the staging application endpoints return healthy responses, confirming the full deployment pipeline succeeded end-to-end.

**Why this priority**: Verification is the final confirmation that all prior steps produced a working system. Without it, breakages may go undetected.

**Independent Test**: Issue requests to each endpoint and validate response status codes.

**Acceptance Scenarios**:

1. **Given** the redeployment is complete, **When** the container app health endpoint is requested, **Then** it returns a 200 status
2. **Given** the redeployment is complete, **When** the container app readiness endpoint is requested, **Then** it returns a 200 status (confirming database and storage connectivity via Managed Identity)
3. **Given** the redeployment is complete, **When** the Front Door health endpoint is requested, **Then** it returns a 200 status (confirming traffic routing through the CDN)

---

### Edge Cases

- What happens if the container image rebuild fails due to a transient network error? Retry the build once before reporting failure.
- What happens if Bicep deployment encounters a `ContainerAppSecretInUse` error? Deactivate all old revisions referencing the removed secret, then retry the deployment.
- What happens if the health endpoint returns 200 but the readiness endpoint returns a non-200 status? Investigate database or storage connectivity — this indicates the app is running but Managed Identity authentication to a backend service failed.
- What happens if the devcontainer build fails in Codespaces? Verify the base image and feature references are valid and accessible from GitHub's infrastructure.
- What happens if the constitution sync introduces unexpected changes? Validate by diffing before and after — the sync should be a wholesale replacement, not a merge.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain a `.devcontainer/devcontainer.json` at the repo root that provisions Node.js 22, npm, Azure CLI, GitHub CLI, and PostgreSQL client tools
- **FR-002**: The devcontainer MUST allow a contributor to run all project build and test commands immediately after environment creation
- **FR-003**: The file `.specify/memory/constitution.md` MUST be an exact copy of `specs/constitution.md` (v1.5.0)
- **FR-004**: All local changes from the Managed Identity migration MUST be committed and pushed to the remote repository's main branch
- **FR-005**: The container registry image MUST be rebuilt to include the identity library dependency
- **FR-006**: The deployed infrastructure MUST register the managed identity as a database Entra administrator
- **FR-007**: The container app MUST receive environment variables for identity-based authentication: `AZURE_CLIENT_ID`, `AZURE_STORAGE_ACCOUNT_URL`, `PGHOST`, `PGDATABASE`
- **FR-008**: The Key Vault MUST NOT contain connection string secrets for services that now use Managed Identity
- **FR-009**: If redeployment fails due to old revisions referencing removed secrets, old revisions MUST be deactivated before retrying
- **FR-010**: The container app health endpoint MUST return a 200 status after deployment
- **FR-011**: The container app readiness endpoint MUST return a 200 status after deployment
- **FR-012**: The Front Door health endpoint MUST return a 200 status after deployment

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new contributor can open the repository in Codespaces and run the full build-and-test cycle within 5 minutes of environment creation, with zero manual tool installation
- **SC-002**: Both canonical copies of the constitution are byte-identical at v1.5.0, verified by a diff producing zero differences
- **SC-003**: All Managed Identity migration changes are visible on the remote main branch, confirmed by inspecting the latest pushed commit
- **SC-004**: The container registry image is rebuilt and tagged with a timestamp after the identity library was added
- **SC-005**: Deployed infrastructure correctly reflects all Managed Identity configuration — database Entra admin, container app environment variables, removed secrets — verified by inspecting Azure resource properties
- **SC-006**: All three verification endpoints (container app health, container app readiness, Front Door health) return 200 status codes within 2 minutes of deployment completion
- **SC-007**: The readiness endpoint confirms successful Managed Identity authentication to both the database and storage, as indicated by a 200 response rather than a connectivity error
