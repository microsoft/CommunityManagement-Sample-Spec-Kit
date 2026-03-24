# CI/CD Contract: GitHub Actions Workflows

**Spec**: 011 | **Date**: 2026-03-22

---

## Workflow Overview

```
PRs → ci.yml (existing, extended)
Merge to main → deploy.yml (new)
  ├── Build & push image
  ├── Deploy to staging
  ├── Smoke tests
  ├── Manual approval
  └── Promote to production
```

---

## ci.yml — Extended CI Pipeline

**Trigger**: Push to `main`, PRs to `main`

**New steps added** (after existing quality gates):

| Step | Command | Purpose |
|------|---------|---------|
| Docker build test | `docker build --target builder .` | Verify Dockerfile builds successfully |

**Existing steps preserved** (no changes):
1. Checkout
2. Setup Node.js 22
3. `npm ci`
4. Build design tokens
5. Typecheck
6. Lint
7. Build web app
8. Check bundle size
9. Run token tests
10. Run shared-ui tests
11. Run web tests
12. i18n string lint
13. Build Storybook
14. Storybook a11y audit

---

## deploy.yml — Deployment Pipeline

**Trigger**:
- Push to `main` (auto-deploy to staging)
- Manual dispatch with `environment` and `image-tag` inputs

### Job: build-and-push

**Runs on**: `ubuntu-latest`

**Steps**:
| Step | Action | Details |
|------|--------|---------|
| Checkout | `actions/checkout@v4` | Full repo for Docker context |
| Azure login | `azure/login@v2` | Service principal from `AZURE_CREDENTIALS` secret |
| ACR login | `azure/docker-login@v2` | Login to `acracroyoga.azurecr.io` |
| Build image | `docker build` | Multi-stage build, tag `sha-{github.sha}` |
| Push image | `docker push` | Push to ACR |

**Outputs**:
| Output | Value | Used by |
|--------|-------|---------|
| `image-tag` | `sha-{github.sha}` | deploy-staging, deploy-production |

### Job: deploy-staging

**Depends on**: `build-and-push`
**Environment**: `staging` (GitHub Environment)

**Steps**:
| Step | Action | Details |
|------|--------|---------|
| Azure login | `azure/login@v2` | Same service principal |
| Deploy | `azure/container-apps-deploy-action@v2` | Deploy new revision with image tag |

**Post-deploy**:
| Step | Action | Details |
|------|--------|---------|
| Wait for readiness | `curl --retry 10` | Poll `/api/ready` until 200 |
| Smoke test — health | `curl /api/health` | Verify 200 + version matches |
| Smoke test — home page | `curl /` | Verify 200 + HTML contains expected title |

### Job: deploy-production

**Depends on**: `deploy-staging`
**Environment**: `production` (GitHub Environment with required reviewers)

**Steps**:
| Step | Action | Details |
|------|--------|---------|
| Azure login | `azure/login@v2` | Same service principal |
| Deploy | `azure/container-apps-deploy-action@v2` | Same image tag as staging |
| Verify | `curl --retry 10 /api/ready` | Wait for readiness |

### Required GitHub Repository Secrets

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON (`{ "clientId": ..., "clientSecret": ..., "subscriptionId": ..., "tenantId": ... }`) |
| `AZURE_CONTAINER_REGISTRY` | ACR login server (e.g., `acracroyoga.azurecr.io`) |

### Required GitHub Environments

| Environment | Protection Rules |
|-------------|-----------------|
| `staging` | None (auto-deploy on merge) |
| `production` | Required reviewers (1+), deployment branch: `main` |

---

## Image Tagging Strategy

| Tag | When Applied | Purpose |
|-----|-------------|---------|
| `sha-{git-sha}` | Every build | Immutable reference to exact commit |
| `latest-staging` | After staging deploy | Current staging image |
| `latest-production` | After production deploy | Current production image |

**Key principle**: The same `sha-{git-sha}` image is used for both staging and production. No rebuild between environments (FR-014).

---

## Rollback Procedure

```bash
# 1. Identify the previous working revision
az containerapp revision list --name ca-acroyoga-web-production \
  --resource-group rg-acroyoga-production -o table

# 2. Reactivate the previous revision
az containerapp revision activate --name ca-acroyoga-web-production \
  --resource-group rg-acroyoga-production \
  --revision <previous-revision>

# 3. Shift traffic to previous revision
az containerapp ingress traffic set --name ca-acroyoga-web-production \
  --resource-group rg-acroyoga-production \
  --revision-weight <previous-revision>=100

# 4. Deactivate the broken revision
az containerapp revision deactivate --name ca-acroyoga-web-production \
  --resource-group rg-acroyoga-production \
  --revision <broken-revision>
```
