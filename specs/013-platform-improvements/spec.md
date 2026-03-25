# Feature Specification: Platform Improvements & Documentation Gaps

**Feature Branch**: `013-platform-improvements`  
**Created**: 2026-03-24  
**Status**: Draft  
**Input**: Repository review identifying documentation gaps, incomplete tasks, and improvement opportunities

## Summary

This spec captures improvements identified during a comprehensive repository review. The platform (Specs 001–012) is feature-complete, but several cross-cutting gaps remain in documentation, testing, and developer experience.

## User Scenarios & Testing

### User Story 1 - Contributing Developer Onboarding (Priority: P1)

A new contributor clones the repository and needs to understand how to set up their environment, run tests, and submit changes following the project's conventions.

**Why this priority**: Without clear onboarding docs, new contributors face friction and may introduce convention violations.

**Independent Test**: A new developer can follow CONTRIBUTING.md from clone to first passing PR without external guidance.

**Acceptance Scenarios**:

1. **Given** a new contributor, **When** they read CONTRIBUTING.md, **Then** they understand the PR process, spec-kit workflow, and quality gates
2. **Given** a developer on any platform, **When** they follow Getting Started, **Then** they have a working dev environment with passing tests

---

### User Story 2 - API Documentation (Priority: P1)

A developer building a client (mobile app, third-party integration) needs a complete API reference documenting all 80+ endpoints, request/response shapes, and error codes.

**Why this priority**: Constitution Principle I (API-First) mandates API contracts as the source of truth, but no consolidated API reference exists.

**Independent Test**: Every public API endpoint is documented with method, path, request schema, response schema, and error codes.

**Acceptance Scenarios**:

1. **Given** a developer, **When** they read the API docs, **Then** they can call any endpoint correctly without reading source code
2. **Given** an endpoint change, **When** a PR is opened, **Then** the API docs are updated (enforced by review checklist)

---

### User Story 3 - Database Schema Documentation (Priority: P2)

A developer needs to understand the database schema, relationships between tables, and the migration process.

**Why this priority**: 40+ tables across 8 migrations with cross-spec dependencies are hard to reason about without documentation.

**Independent Test**: A developer can understand the full data model by reading DATABASE.md without running migrations.

**Acceptance Scenarios**:

1. **Given** a developer, **When** they read DATABASE.md, **Then** they understand all tables, relationships, and migration order

---

### User Story 4 - Testing Guide (Priority: P2)

A developer writing new tests needs guidance on test patterns, PGlite setup, test helpers, and coverage requirements.

**Why this priority**: Constitution Principle II (Test-First) mandates tests but the testing patterns are only discoverable by reading existing test files.

**Independent Test**: A developer can write a new integration test by following TESTING.md patterns.

**Acceptance Scenarios**:

1. **Given** a developer, **When** they read TESTING.md, **Then** they understand how to use createTestDb(), mock auth helpers, and test patterns

---

### User Story 5 - E2E Test Coverage (Priority: P3)

The Events Explorer (Spec 010) has 6 deferred E2E tests (T021, T037, T046, T063, T065, T066) that require Playwright setup. Adding E2E infrastructure would enable testing critical user journeys.

**Why this priority**: Lower priority since integration tests cover API logic, but E2E tests would catch UI regressions.

**Independent Test**: Playwright E2E tests run in CI for Events Explorer user journeys.

**Acceptance Scenarios**:

1. **Given** the Events Explorer page, **When** a user interacts with calendar/map/tree, **Then** E2E tests verify the synchronized filtering behavior

---

### User Story 6 - Remaining Spec Task Completion (Priority: P3)

Several specs have a small number of remaining unchecked tasks:
- **Spec 001**: 36 unchecked (mostly seed scripts, specific UI polish, Stripe checkout)
- **Spec 003**: 7 unchecked (occurrence UI, notifications, i18n)
- **Spec 004**: 26 unchecked (setup tasks, creator settings page, polish)
- **Spec 005**: 9 unchecked (proof doc endpoints, reminder jobs, report extension)
- **Spec 009**: 2 unchecked (seed helpers, smoke test)
- **Spec 010**: 6 unchecked (E2E tests, heatmap feature)

**Why this priority**: These are polish/enhancement tasks — core functionality is implemented.

**Acceptance Scenarios**:

1. **Given** the remaining unchecked tasks, **When** they are triaged, **Then** each is either completed, deferred with justification, or removed if no longer relevant

---

### Edge Cases

- API documentation must handle versioning (future /v2/ endpoints)
- Database docs must stay in sync as new migrations are added
- Contributing guide must work for both Codespaces and local Linux environments

## Requirements

### Functional Requirements

- **FR-001**: Repository MUST have a CONTRIBUTING.md with PR process, spec-kit workflow, code conventions, and quality gate requirements
- **FR-002**: Repository MUST have an API reference documenting all public endpoints with request/response schemas
- **FR-003**: Repository MUST have a DATABASE.md documenting all tables, relationships, and migration process
- **FR-004**: Repository MUST have a TESTING.md documenting test patterns, PGlite setup, and coverage requirements
- **FR-005**: README.md MUST accurately reflect current Node.js version (22+), constitution version (v1.5.0), and all 12 specs
- **FR-006**: All completed tasks across specs 001–012 MUST be marked [X] in their respective tasks.md files
- **FR-007**: Deferred tasks MUST be documented with rationale

### Key Entities

- **Documentation files**: CONTRIBUTING.md, API.md, DATABASE.md, TESTING.md
- **Task tracking**: tasks.md files across all 12 specs

## Success Criteria

### Measurable Outcomes

- **SC-001**: New contributor can go from clone to passing tests in under 15 minutes following docs
- **SC-002**: 100% of public API endpoints are documented
- **SC-003**: All implemented tasks are marked [X] across all spec tasks.md files
- **SC-004**: Zero outdated information in README.md

## Constitution Compliance

| Principle | Applicable | Notes |
|-----------|:---:|-------|
| I. API-First | ✅ | API documentation fulfills this principle's documentation mandate |
| II. Test-First | ✅ | Testing guide and E2E coverage |
| VII. Simplicity | ✅ | Documentation should be minimal and actionable |
| VIII. Internationalisation | | Not applicable |
| XIII. Development Environment | ✅ | Contributing guide covers Codespaces setup |
