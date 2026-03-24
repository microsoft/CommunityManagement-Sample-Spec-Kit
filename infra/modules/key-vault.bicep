@description('Environment name (staging or production)')
param environmentName string

@description('Azure region')
param location string = resourceGroup().location

@description('Principal ID of managed identity for Key Vault Secrets User role')
param managedIdentityPrincipalId string

@description('Secrets to populate in Key Vault (key-value pairs)')
@secure()
param secrets object = {}

@description('Log Analytics workspace ID for diagnostic audit logs')
param logAnalyticsWorkspaceId string = ''

var uniqueSuffix = uniqueString(resourceGroup().id)
var vaultName = take('kv-acro-${environmentName}-${uniqueSuffix}', 24)

// Key Vault Secrets User role definition ID
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

resource kvSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, managedIdentityPrincipalId, kvSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Populate secrets
resource databaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (contains(secrets, 'databaseUrl')) {
  parent: keyVault
  name: 'database-url'
  properties: {
    value: secrets.?databaseUrl ?? ''
  }
}

resource nextAuthSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (contains(secrets, 'nextAuthSecret')) {
  parent: keyVault
  name: 'nextauth-secret'
  properties: {
    value: secrets.?nextAuthSecret ?? ''
  }
}

resource nextAuthUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (contains(secrets, 'nextAuthUrl')) {
  parent: keyVault
  name: 'nextauth-url'
  properties: {
    value: secrets.?nextAuthUrl ?? ''
  }
}

resource stripeSecretKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (contains(secrets, 'stripeSecretKey')) {
  parent: keyVault
  name: 'stripe-secret-key'
  properties: {
    value: secrets.?stripeSecretKey ?? ''
  }
}

resource stripeWebhookSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (contains(secrets, 'stripeWebhookSecret')) {
  parent: keyVault
  name: 'stripe-webhook-secret'
  properties: {
    value: secrets.?stripeWebhookSecret ?? ''
  }
}

resource stripeClientIdSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (contains(secrets, 'stripeClientId')) {
  parent: keyVault
  name: 'stripe-client-id'
  properties: {
    value: secrets.?stripeClientId ?? ''
  }
}

resource appInsightsConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (contains(secrets, 'applicationInsightsConnectionString')) {
  parent: keyVault
  name: 'applicationinsights-connection-string'
  properties: {
    value: secrets.?applicationInsightsConnectionString ?? ''
  }
}

// Diagnostic settings for audit logging
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (logAnalyticsWorkspaceId != '') {
  name: 'kv-diagnostics'
  scope: keyVault
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        categoryGroup: 'audit'
        enabled: true
      }
    ]
  }
}

output vaultName string = keyVault.name
output vaultUri string = keyVault.properties.vaultUri
