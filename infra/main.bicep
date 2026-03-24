targetScope = 'resourceGroup'

// ──────────────────────────────────────────────
// Parameters (per contracts/infrastructure.md)
// ──────────────────────────────────────────────

@description('Environment name (staging or production)')
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

// ──────────────────────────────────────────────
// 1. Managed Identity
// ──────────────────────────────────────────────
module identity 'modules/managed-identity.bicep' = {
  name: 'managed-identity'
  params: {
    environmentName: environmentName
    location: location
  }
}

// ──────────────────────────────────────────────
// 2. Container Registry
// ──────────────────────────────────────────────
module registry 'modules/container-registry.bicep' = {
  name: 'container-registry'
  params: {
    location: location
    managedIdentityPrincipalId: identity.outputs.principalId
  }
}

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
    containerRegistryLoginServer: registry.outputs.loginServer
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
  }
}

// ──────────────────────────────────────────────
// 8. Front Door (depends on Container App FQDN)
// ──────────────────────────────────────────────
module frontDoor 'modules/front-door.bicep' = {
  name: 'front-door'
  params: {
    originHostname: containerApps.outputs.fqdn
    customDomainHostname: customDomainHostname
  }
}

// ──────────────────────────────────────────────
// 9. Monitoring alerts (now that App Insights exists)
// ──────────────────────────────────────────────
module monitoringAlerts 'modules/monitoring.bicep' = {
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
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = registry.outputs.loginServer
output containerAppFqdn string = containerApps.outputs.fqdn
output frontDoorEndpoint string = frontDoor.outputs.endpoint
output containerRegistryLoginServer string = registry.outputs.loginServer
