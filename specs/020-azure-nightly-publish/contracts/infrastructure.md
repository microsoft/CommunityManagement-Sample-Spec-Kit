# Contract: Infrastructure Changes for Nightly Environment

**Feature**: 020-azure-nightly-publish  
**Date**: 2025-07-09

## Overview

The nightly environment reuses the existing `infra/main.bicep` with two new conditional parameters to skip modules that are not needed for a non-user-facing validation environment.

## Bicep Parameter Changes (main.bicep)

### New Parameters

```bicep
@description('Deploy Azure Front Door CDN. Set to false for non-user-facing environments like nightly.')
param deployFrontDoor bool = true

@description('Deploy a Container Registry in this resource group. Set to false when using a shared ACR from another resource group.')
param deployContainerRegistry bool = true

@description('Shared Container Registry login server URL. Required when deployContainerRegistry is false.')
param sharedContainerRegistryLoginServer string = ''

@description('Deploy monitoring alert rules. Set to false for cost-optimized environments.')
param deployMonitoringAlerts bool = true
```

### Conditional Module Changes

```bicep
// Container Registry — skip for nightly (uses shared ACR)
module registry 'modules/container-registry.bicep' = if (deployContainerRegistry) {
  name: 'container-registry'
  params: {
    location: location
    managedIdentityPrincipalId: identity.outputs.principalId
  }
}

// Resolve ACR login server: own ACR if deployed, shared otherwise
var containerRegistryLoginServer = deployContainerRegistry ? registry.outputs.loginServer : sharedContainerRegistryLoginServer

// Front Door — skip for nightly (out of scope)
module frontDoor 'modules/front-door.bicep' = if (deployFrontDoor) {
  name: 'front-door'
  params: {
    originHostname: containerApps.outputs.fqdn
    customDomainHostname: customDomainHostname
  }
}

// Monitoring Alerts — skip for nightly (cost optimization)
module monitoringAlerts 'modules/monitoring.bicep' = if (deployMonitoringAlerts) {
  name: 'monitoring-alerts'
  params: {
    environmentName: environmentName
    location: location
    alertEmailAddress: alertEmailAddress
    enableAlertRules: true
    appInsightsResourceId: monitoring.outputs.appInsightsResourceId
  }
}
```

### Conditional Outputs

```bicep
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistryLoginServer
output containerAppFqdn string = containerApps.outputs.fqdn
output frontDoorEndpoint string = deployFrontDoor ? frontDoor.outputs.endpoint : ''
output containerRegistryLoginServer string = containerRegistryLoginServer
```

### Updated environmentName Description

```bicep
@description('Environment name (staging, production, or nightly)')
param environmentName string
```

## Nightly Deployment Parameters

File: `infra/main.parameters.nightly.json`

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environmentName": { "value": "nightly" },
    "location": { "value": "eastus2" },
    "imageTag": { "value": "latest" },
    "deployFrontDoor": { "value": false },
    "deployContainerRegistry": { "value": false },
    "deployMonitoringAlerts": { "value": false },
    "sharedContainerRegistryLoginServer": { "value": "${AZURE_CONTAINER_REGISTRY}" },
    "minReplicas": { "value": 0 },
    "maxReplicas": { "value": 2 },
    "cpuCores": { "value": "0.5" },
    "memorySize": { "value": "1Gi" },
    "dbSkuName": { "value": "Standard_B1ms" },
    "dbStorageSizeGB": { "value": 32 },
    "dbAdminLogin": { "value": "acroyogaadmin" },
    "dbAdminPassword": { "value": "${DB_ADMIN_PASSWORD}" },
    "stripeSecretKey": { "value": "${STRIPE_SECRET_KEY}" },
    "stripeWebhookSecret": { "value": "${STRIPE_WEBHOOK_SECRET}" },
    "stripeClientId": { "value": "${STRIPE_CLIENT_ID}" },
    "nextAuthSecret": { "value": "${NEXTAUTH_SECRET}" },
    "entraClientId": { "value": "${ENTRA_CLIENT_ID}" },
    "entraTenantId": { "value": "${ENTRA_TENANT_ID}" },
    "entraTenantDomain": { "value": "${ENTRA_TENANT_DOMAIN}" },
    "githubOrg": { "value": "${GITHUB_ORG}" },
    "githubRepo": { "value": "${GITHUB_REPO}" },
    "customDomainHostname": { "value": "" },
    "alertEmailAddress": { "value": "" }
  }
}
```

## Cross-Resource-Group RBAC

The nightly managed identity (`id-acroyoga-nightly`) needs AcrPull on the shared ACR for the Container App to pull images at runtime. This role assignment must be created outside the nightly resource group deployment.

### Option A: Manual one-time setup (recommended for simplicity)

```bash
# Get nightly identity principal ID
NIGHTLY_PRINCIPAL=$(az identity show \
  --name id-acroyoga-nightly \
  --resource-group rg-acroyoga-nightly \
  --query principalId -o tsv)

# Get shared ACR resource ID
ACR_ID=$(az acr show \
  --name <shared-acr-name> \
  --resource-group rg-acroyoga-stg \
  --query id -o tsv)

# Assign AcrPull role
az role assignment create \
  --assignee-object-id "$NIGHTLY_PRINCIPAL" \
  --assignee-principal-type ServicePrincipal \
  --role "AcrPull" \
  --scope "$ACR_ID"
```

### Option B: Subscription-scoped Bicep module

A separate Bicep file at subscription scope that creates the cross-RG role assignment. This can be run once during initial nightly environment setup.

## GitHub Environment Configuration

### Environment: nightly

| Secret Name | Value Source | Notes |
|-------------|-------------|-------|
| `AZURE_CLIENT_ID` | Staging MI client ID | Used by build-and-push job (main branch FIC) |
| `AZURE_CLIENT_ID_NIGHTLY` | Nightly MI client ID | Used by deploy job (environment FIC) |
| `AZURE_TENANT_ID` | Shared Entra tenant ID | Same for all environments |
| `AZURE_SUBSCRIPTION_ID` | Shared subscription ID | Same for all environments |
| `AZURE_CONTAINER_REGISTRY` | Shared ACR login server | e.g., `acracroyogai6t2epo2hhajo.azurecr.io` |

### Protection Rules

No approval gates required for the nightly environment. The workflow runs automatically and the environment is non-user-facing.
