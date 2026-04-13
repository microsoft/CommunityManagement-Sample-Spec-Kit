# Research: Optimised Deployment Pipeline

**Date**: 2025-07-14 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Research Tasks & Decisions

### R-001: Docker Layer Caching Strategy

**Question**: What is the best approach for Docker layer caching in GitHub Actions for a multi-stage Next.js build?

**Decision**: Use `docker/setup-buildx-action` + `docker/build-push-action` with `cache-from`/`cache-to` using GitHub Actions cache backend (`type=gha`).

**Rationale**:
- The existing build uses plain `docker build` which rebuilds all layers every run
- `docker/build-push-action` with `type=gha` cache backend stores layers in GitHub Actions cache (10 GB free per repo) — no need for a separate cache registry
- The Dockerfile already has optimal layer ordering: `COPY package*.json` → `npm ci` → `COPY .` → `npm run build`, so dependency layers are cache-friendly
- `type=gha,mode=max` caches all layers including intermediate build stages, maximising reuse
- The `docker/setup-buildx-action` enables BuildKit which is required for `cache-from`/`cache-to`

**Alternatives Considered**:
- **Registry-based caching (`type=registry`)**: Requires pushing cache manifests to ACR, which adds auth complexity and egress costs. GitHub's `type=gha` is simpler and free.
- **`actions/cache` with Docker save/load**: Would require saving/restoring the entire image tarball (~1–2 GB), which is slower than layer-level caching. Also doesn't benefit from BuildKit's granular layer matching.
- **ACR build tasks**: Would move the build to Azure, but adds latency for uploading context and requires different auth flow. Keeps things simpler on GHA runners.

---

### R-002: Job-Level Timeout Strategy

**Question**: What timeout-minutes values are appropriate for each of the 3 jobs?

**Decision**:
- `validate`: 45 minutes — includes npm install, typecheck, lint, build, 5 test suites, Playwright E2E, Storybook build + a11y audit
- `build-and-push`: 30 minutes — Docker build + ACR push (cached builds: ~5 min; cold builds: ~15 min)
- `deploy`: 30 minutes — PG wake (~5 min), Bicep deploy (~10 min), readiness wait (~10 min worst-case), smoke tests (~1 min)

**Rationale**:
- GitHub Actions default timeout is 360 minutes (6 hours) which is far too long for nightly failure detection
- These values are chosen to be ~2x the observed worst-case durations, providing headroom without allowing indefinite hangs
- SC-001 requires ≤ 45 min total wall-clock for 95% of runs; sequential job execution means the theoretical max is 45 + 30 + 30 = 105 min, but in practice jobs overlap and each rarely hits its limit
- Job timeouts are the primary mechanism for FR-001 and FR-002

**Alternatives Considered**:
- **Step-level timeouts only**: GitHub Actions doesn't support `timeout-minutes` at step level in a granular enough way. Job-level is the standard approach.
- **Tighter timeouts (e.g., 20/15/15)**: Risk false failures during legitimate slow operations (npm install with cold cache, Azure throttling). 2x headroom is appropriate for a nightly pipeline.

---

### R-003: Structured Error Annotations Pattern

**Question**: How should structured `::error::` annotations be implemented for each failure mode?

**Decision**: Wrap each failure-prone step in a bash pattern that captures the exit code and emits a categorised `::error::` annotation before exiting.

**Pattern**:
```bash
if ! some_command 2>&1; then
  echo "::error title=Category: Step Name::Descriptive message with context (exit code: $?)"
  exit 1
fi
```

**Rationale**:
- GitHub Actions natively supports `::error::`, `::warning::`, and `::notice::` workflow commands
- The `title=` parameter appears as a collapsible heading in the Actions summary UI
- Including the step name, error category, and actionable context (endpoint URL, server name, exit code) satisfies FR-012
- This is zero-dependency — no custom actions or tools required (Principle VII — Simplicity)

**Categories defined**:
| Category | Steps |
|----------|-------|
| `TIMEOUT` | Readiness check, PG wake polling |
| `DEPLOYMENT` | Bicep deploy, Bicep validate |
| `AUTHENTICATION` | Azure login, ACR login |
| `BUILD` | Docker build, npm build, test suites |
| `INFRASTRUCTURE` | PG server start, container app query |

**Alternatives Considered**:
- **GitHub Actions problem matchers**: More complex setup (JSON config files), designed for compiler-style output. Overkill for structured step-level errors.
- **Custom action for error formatting**: Adds a dependency for something achievable with native bash + workflow commands. Violates Simplicity principle.

---

### R-004: Retry Wrapper for Flaky Infrastructure Operations

**Question**: Which operations need retry wrappers and what retry strategy should be used?

**Decision**: Add retry logic to these operations:
1. **Azure CLI login** — already inherently retried by `azure/login` action
2. **ACR login** — add 3-attempt retry with 10s backoff
3. **Bicep deployment** — add a pre-deployment `az deployment group validate` step (FR-006), and wrap the actual deployment with a 2-attempt retry with 60s backoff for transient Azure errors
4. **az containerapp show** (URL resolution) — add 3-attempt retry with 5s backoff (can fail during cold-start when the resource is being created)

**Rationale**:
- Azure CLI operations are subject to transient network errors, API throttling (429), and ARM cache staleness
- The Bicep `validate` pre-check (FR-006) catches template errors early without deploying
- Retry with exponential or fixed backoff is standard practice for cloud infrastructure operations
- The retry budget is bounded by the job-level timeout, preventing infinite retry loops

**Alternatives Considered**:
- **No retries, rely on job-level timeout only**: Would mean that a single transient 429 error fails the entire pipeline. Retries provide resilience without extending the timeout budget.
- **External retry tool (e.g., `retry` CLI)**: Adds a dependency. Bash `for` loop with `sleep` is simpler and sufficient.

---

### R-005: Readiness Check Hardening for Cold-Start

**Question**: What curl parameters are needed to handle cold-start from `minReplicas:0`?

**Decision**: Keep the existing hardened curl parameters which are already well-tuned:
```bash
curl --retry 50 --retry-delay 15 --retry-all-errors \
  --connect-timeout 10 --max-time 30 --retry-max-time 900 \
  -sf "https://${APP_URL}/api/ready"
```

**Enhancements**:
1. Add `--fail-with-body` (requires curl 7.76+, available on ubuntu-latest) to capture error response bodies
2. Add a pre-flight DNS resolution check to surface DNS failures early
3. Add structured `::error::` annotation on failure with retry count and elapsed time
4. Add `::notice::` on success with elapsed time for observability

**Rationale**:
- The existing parameters already accommodate the worst-case 10-minute cold-start: 50 retries × 15s delay = 750s retry budget + 900s max time
- The `/api/ready` endpoint has per-check 10s timeouts via `withTimeout()`, so `--max-time 30` (per-attempt) is appropriate
- The startup probe in container-apps.bicep has a 330s window (30 + 60 × 5), which the curl retry window covers
- Adding `--fail-with-body` provides diagnostic output when the endpoint returns an error during cold-start

**Alternatives Considered**:
- **Custom health-check script with exponential backoff**: More code to maintain than curl's built-in retry. The linear 15s delay is fine for this use case.
- **Reducing retry count/delay**: Risks false failures during legitimate cold-start. The current parameters are proven.

---

### R-006: Bicep Unused Parameter Cleanup

**Question**: Which Bicep modules have unused parameters and how should they be cleaned up?

**Decision**: Remove unused parameters from two modules:

1. **`infra/modules/database.bicep`**: Remove `managedIdentityClientId` parameter (declared at line 25, never referenced in the module body). Only `managedIdentityPrincipalId` is used for the Entra admin and role assignment.

2. **`infra/modules/front-door.bicep`**: Remove `customDomainHostname` parameter (declared at line 5, never referenced in the module body). Custom domain configuration is not yet implemented in the Front Door module.

**Also update callers**:
- `infra/main.bicep` line 151: Remove `managedIdentityClientId` from the `database` module invocation
- `infra/main.bicep` line 206: Remove `appInsightsConnectionString` from the `containerApps` module invocation
- `infra/main.bicep` line 226: Remove `customDomainHostname` from the `frontDoor` module invocation

**Rationale**:
- Unused parameters generate Bicep linter warnings (`no-unused-params`), adding noise to CI output
- Removing unused params improves maintainability and reduces confusion about what's actually used
- All removals are non-breaking: the params are never referenced, so removing them has no runtime effect

**Alternatives Considered**:
- **Suppress warnings with `#disable-next-line`**: Hides the problem rather than fixing it. The params truly aren't used.
- **Implement custom domain in front-door.bicep**: Out of scope — that's a separate feature. Remove the dead param now, add it back when custom domains are implemented.

---

### R-007: npm Cache Strategy

**Question**: Should the validate job add explicit npm caching?

**Decision**: The existing `actions/setup-node@v5` with `cache: "npm"` already handles npm cache restoration. No additional changes needed — the current configuration is correct.

**Rationale**:
- `actions/setup-node` with `cache: "npm"` automatically caches and restores the npm global cache (`~/.npm`) based on `package-lock.json` hash
- This doesn't skip `npm ci` (which always does a clean install) but it avoids re-downloading packages from the registry
- Typical speedup is 30–60s on the install step
- The nightly.yml already has this configured correctly at lines 26–28

**Alternatives Considered**:
- **Cache `node_modules/` directly with `actions/cache`**: Incompatible with `npm ci` which deletes `node_modules/` before install. Would need to switch to `npm install` which is less deterministic.
- **Use `pnpm` or `yarn` for faster installs**: Out of scope. The project uses npm; changing package managers is a much larger change.

---

### R-008: Test Parallelisation Strategy

**Question**: Should the validate job split test suites into parallel jobs for speed?

**Decision**: Keep tests sequential within a single validate job. Do NOT split into parallel jobs.

**Rationale**:
- The 5 test suites (tokens, shared-ui, shared, web, mobile) each take 5–30s; total test time is ~2 min
- The expensive steps are `npm ci` (~2 min), `npm run build` (~3 min), Playwright install + run (~3 min), and Storybook build + a11y (~2 min)
- Splitting into parallel jobs would require duplicating the install + build steps in each job, costing more total runner-minutes
- The validate job total is ~15 min, well within the 45-min timeout
- Parallelisation would increase complexity (job matrix, artifact passing) for minimal speedup (Principle VII — Simplicity)

**Alternatives Considered**:
- **Matrix strategy for test suites**: Would save ~1–2 min of test time but add ~4 min of duplicated install/build per matrix job. Net negative.
- **Split E2E into separate job**: Reasonable for much larger E2E suites, but the current Playwright suite is small. Keep simple.

---

### R-009: Bicep Pre-Deployment Validation

**Question**: What validation should run before the actual Bicep deployment (FR-006)?

**Decision**: Add an `az deployment group validate` step before the actual `az deployment group create`. This validates the template, parameters, and ARM expressions without actually deploying resources.

**Rationale**:
- `az deployment group validate` checks parameter types, resource API versions, template syntax, and expression evaluation
- It catches the categories of errors from historical Runs 2 and 3: scope errors, location mismatches, missing parameters
- It runs in ~10–30s vs minutes for actual deployment, providing fast feedback
- The `what-if` operation was considered but `validate` is lighter-weight and catches the same structural errors

**Alternatives Considered**:
- **`az deployment group what-if`**: Provides a diff of changes but takes longer (1–2 min) and requires the same permissions as deployment. Good for human review but overkill for automated validation.
- **`bicep build` only**: Catches syntax errors but NOT parameter mismatches or ARM expression evaluation errors. Insufficient for FR-006.
