targetScope = 'resourceGroup'

// ──────────────────────────────────────────────
// Parameters (per contracts/infrastructure.md)
// ──────────────────────────────────────────────

@description('Environment name (staging, production, or nightly)')
param environmentName string

@description('Azure region')
param location string = 'eastus2'

@description('Container image tag (git SHA)')
param imageTag string

@description('PostgreSQL admin username')
@secure()
param dbAdminLogin string

@description('PostgreSQL admin password')
@secure()
param dbAdminPassword string

@description('Stripe API secret key')
@secure()
param stripeSecretKey string

@description('Stripe webhook signing secret')
@secure()
param stripeWebhookSecret string

@description('Stripe Connect client ID')
@secure()
param stripeClientId string

@description('NextAuth session encryption key')
@secure()
param nextAuthSecret string

@description('Entra External ID application (client) ID')
@secure()
param entraClientId string = ''

@description('Entra External ID tenant UUID')
@secure()
param entraTenantId string = ''

@description('Entra External ID CIAM tenant subdomain (e.g. "acroyogacommunity" for acroyogacommunity.ciamlogin.com)')
param entraTenantDomain string = ''

@description('Custom domain hostname (optional)')
param customDomainHostname string = ''

@description('Minimum Container App instances')
param minReplicas int = 0

@description('Maximum Container App instances')
param maxReplicas int = 10

@description('PostgreSQL SKU')
param dbSkuName string = 'Standard_B1ms'

@description('PostgreSQL storage in GB')
param dbStorageSizeGB int = 32

@description('CPU cores per container instance')
param cpuCores string = '0.5'

@description('Memory per container instance')
param memorySize string = '1Gi'

@description('Email address for alert notifications')
param alertEmailAddress string = ''

@description('GitHub organisation name (e.g. "microsoft"). When set together with githubRepo, OIDC federated identity credentials are provisioned on the managed identity so GitHub Actions can authenticate without stored secrets.')
param githubOrg string = ''

@description('GitHub repository name (e.g. "CommunityManagement-Sample-Spec-Kit"). Required when githubOrg is set.')
param githubRepo string = ''

@description('Deploy Azure Front Door CDN. Set to false for non-user-facing environments like nightly.')
param deployFrontDoor bool = true

@description('Deploy a Container Registry in this resource group. Set to false when using a shared ACR from another resource group.')
param deployContainerRegistry bool = true

@description('Shared Container Registry login server URL. Required when deployContainerRegistry is false.')
param sharedContainerRegistryLoginServer string = ''

@description('Deploy monitoring alert rules. Set to false for cost-optimized environments.')
param deployMonitoringAlerts bool = true

@description('Deploy the DB Wake custom role (requires subscription-level Microsoft.Authorization/roleDefinitions/write). Set to false for environments where the deploying identity only has resource-group-scoped permissions.')
param deployDbWakeRole bool = true

// ──────────────────────────────────────────────
// 1. Managed Identity
// ──────────────────────────────────────────────
module identity 'modules/managed-identity.bicep' = {
  name: 'managed-identity'
  params: {
    environmentName: environmentName
    location: location
    githubOrg: githubOrg
    githubRepo: githubRepo
    // Only the staging identity gets the main-branch FIC (for the build-and-push CI job)
    addMainBranchFic: environmentName == 'staging'
  }
}

// ──────────────────────────────────────────────
// 2. Container Registry (skip for nightly — uses shared ACR)
// ──────────────────────────────────────────────
module registry 'modules/container-registry.bicep' = if (deployContainerRegistry) {
  name: 'container-registry'
  params: {
    location: location
    managedIdentityPrincipalId: identity.outputs.principalId
  }
}

// Resolve ACR login server: own ACR if deployed, shared otherwise
var resolvedContainerRegistryLoginServer = deployContainerRegistry ? registry.outputs.loginServer : sharedContainerRegistryLoginServer

// ──────────────────────────────────────────────
// 3. Monitoring (Log Analytics + App Insights)
// ──────────────────────────────────────────────
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    environmentName: environmentName
    location: location
    alertEmailAddress: alertEmailAddress
    enableAlertRules: false // Enabled after App Insights is created
  }
}

// ──────────────────────────────────────────────
// 4. Database
// ──────────────────────────────────────────────
module database 'modules/database.bicep' = {
  name: 'database'
  params: {
    environmentName: environmentName
    location: location
    adminLogin: dbAdminLogin
    adminPassword: dbAdminPassword
    skuName: dbSkuName
    storageSizeGB: dbStorageSizeGB
    managedIdentityPrincipalId: identity.outputs.principalId
    managedIdentityClientId: identity.outputs.clientId
    deployDbWakeRole: deployDbWakeRole
  }
}

// ──────────────────────────────────────────────
// 5. Storage
// ──────────────────────────────────────────────
module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    environmentName: environmentName
    location: location
    managedIdentityPrincipalId: identity.outputs.principalId
  }
}

// ──────────────────────────────────────────────
// 6. Key Vault (depends on identity, monitoring, database, storage)
// ──────────────────────────────────────────────
module keyVault 'modules/key-vault.bicep' = {
  name: 'key-vault'
  params: {
    environmentName: environmentName
    location: location
    managedIdentityPrincipalId: identity.outputs.principalId
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    secrets: {
      databaseUrl: database.outputs.connectionString
      nextAuthSecret: nextAuthSecret
      nextAuthUrl: customDomainHostname != '' ? 'https://${customDomainHostname}' : 'https://placeholder.azurecontainerapps.io'
      stripeSecretKey: stripeSecretKey
      stripeWebhookSecret: stripeWebhookSecret
      stripeClientId: stripeClientId
      applicationInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
      entraClientId: entraClientId
      entraTenantId: entraTenantId
    }
  }
}

// ──────────────────────────────────────────────
// 7. Container Apps (depends on ACR, Key Vault, monitoring, identity)
// ──────────────────────────────────────────────
module containerApps 'modules/container-apps.bicep' = {
  name: 'container-apps'
  params: {
    environmentName: environmentName
    location: location
    containerRegistryLoginServer: resolvedContainerRegistryLoginServer
    imageTag: imageTag
    managedIdentityId: identity.outputs.resourceId
    managedIdentityClientId: identity.outputs.clientId
    managedIdentityName: identity.outputs.name
    keyVaultName: keyVault.outputs.vaultName
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    minReplicas: minReplicas
    maxReplicas: maxReplicas
    cpuCores: cpuCores
    memorySize: memorySize
    storageBlobEndpoint: storage.outputs.blobEndpoint
    pgHost: database.outputs.serverHost
    pgDatabase: database.outputs.databaseName
    entraTenantDomain: entraTenantDomain
  }
}

// ──────────────────────────────────────────────
// 8. Front Door (skip for non-user-facing environments like nightly)
// ──────────────────────────────────────────────
module frontDoor 'modules/front-door.bicep' = if (deployFrontDoor) {
  name: 'front-door'
  params: {
    originHostname: containerApps.outputs.fqdn
    customDomainHostname: customDomainHostname
  }
}

// ──────────────────────────────────────────────
// 9. Monitoring alerts (skip for cost-optimized environments)
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// Outputs
// ──────────────────────────────────────────────
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resolvedContainerRegistryLoginServer
output containerAppFqdn string = containerApps.outputs.fqdn
output frontDoorEndpoint string = deployFrontDoor ? frontDoor.outputs.endpoint : ''
output containerRegistryLoginServer string = resolvedContainerRegistryLoginServer
