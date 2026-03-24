# Quickstart: 012-managed-identity-deploy

**Date**: 2026-03-23 | **Spec**: `specs/012-managed-identity-deploy/spec.md`

## Prerequisites

- Azure CLI (`az`) installed and authenticated
- Access to subscription `ea77caf3-375b-4f1e-b3b0-03e58569567e`
- Contributor role on resource group `rg-acroyoga-stg`
- Git with push access to origin remote

## Execution Order

The tasks must be executed in this order due to dependencies:

### Phase 1: Local Setup & Governance (no Azure dependency)

```bash
# 1. Create devcontainer configuration
mkdir -p .devcontainer
# Create .devcontainer/devcontainer.json (see data-model.md for schema)

# 2. Sync constitution
cp specs/constitution.md .specify/memory/constitution.md
# Verify: diff specs/constitution.md .specify/memory/constitution.md

# 3. Commit and push all changes
git add -A
git commit -m "feat(012): devcontainer, constitution sync, managed identity code"
git push origin 012-managed-identity-deploy
# Merge to main when CI passes
```

### Phase 2: Container Build (depends on Phase 1 push)

```powershell
# 4. Build container image via ACR
$ctx = Join-Path $env:TEMP "acr-build-ctx3"
if (Test-Path $ctx) { Remove-Item $ctx -Recurse -Force }
Copy-Item -Path . -Destination $ctx -Recurse -Exclude @('.git','node_modules','.next','storybook-static')
az acr build --registry acracroyogai6t2epo2hhajo --image acroyoga-web:latest --file Dockerfile $ctx
```

### Phase 3: Infrastructure Deployment (depends on Phase 2 image)

```bash
# 5. Deactivate old revisions (prevent ContainerAppSecretInUse error)
az containerapp revision list -n ca-acroyoga-web-staging -g rg-acroyoga-stg -o table
# For each old revision:
az containerapp revision deactivate -n ca-acroyoga-web-staging -g rg-acroyoga-stg --revision <name>

# 6. Deploy Bicep
az deployment group create \
  --resource-group rg-acroyoga-stg \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --parameters imageTag=latest environmentName=staging location=uksouth
```

### Phase 4: Verification (depends on Phase 3 deployment)

```bash
# 7. Health checks
curl -s -o /dev/null -w "%{http_code}" \
  https://ca-acroyoga-web-staging.salmontree-d5cceffd.uksouth.azurecontainerapps.io/api/health
# Expected: 200

curl -s -o /dev/null -w "%{http_code}" \
  https://ca-acroyoga-web-staging.salmontree-d5cceffd.uksouth.azurecontainerapps.io/api/ready
# Expected: 200

curl -s -o /dev/null -w "%{http_code}" \
  https://acro-i6t2epo2hhajo-gcdgg7b8cgdndebz.b01.azurefd.net/api/health
# Expected: 200
```

## Rollback

If deployment fails and the app is broken:

```bash
# Revert to previous container image
az containerapp update -n ca-acroyoga-web-staging -g rg-acroyoga-stg \
  --image acracroyogai6t2epo2hhajo.azurecr.io/acroyoga-web:<previous-tag>

# Or revert Bicep changes and redeploy from the previous commit
git revert HEAD
az deployment group create --resource-group rg-acroyoga-stg --template-file infra/main.bicep ...
```
