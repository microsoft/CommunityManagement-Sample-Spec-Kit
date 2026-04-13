@description('Environment name (staging or production)')
param environmentName string

@description('Azure region')
param location string = resourceGroup().location

@description('PostgreSQL admin username')
@secure()
param adminLogin string

@description('PostgreSQL admin password')
@secure()
param adminPassword string

@description('PostgreSQL SKU name')
param skuName string = 'Standard_B1ms'

@description('Storage size in GB')
param storageSizeGB int = 32

@description('Principal ID of the managed identity for Entra admin')
param managedIdentityPrincipalId string

@description('Deploy the DB Wake custom role and assignment. Set to false when the deploying identity does not have subscription-level Microsoft.Authorization/roleDefinitions/write permission (e.g. nightly).')
param deployDbWakeRole bool = true

var uniqueSuffix = uniqueString(resourceGroup().id)
var serverName = 'psql-acro-${environmentName}-${uniqueSuffix}'
var databaseName = 'acroyoga'

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  sku: {
    name: skuName
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Enabled'
      tenantId: subscription().tenantId
    }
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: environmentName == 'production' ? 14 : 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

// Register the managed identity as a Microsoft Entra administrator
resource entraAdmin 'Microsoft.DBforPostgreSQL/flexibleServers/administrators@2023-12-01-preview' = {
  parent: postgresServer
  name: managedIdentityPrincipalId
  properties: {
    principalName: 'id-acroyoga-${environmentName}'
    principalType: 'ServicePrincipal'
    tenantId: subscription().tenantId
  }
  dependsOn: [sslEnforcement]
}

// SSL enforcement
resource sslEnforcement 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = {
  parent: postgresServer
  name: 'require_secure_transport'
  properties: {
    value: 'on'
    source: 'user-override'
  }
}

// Firewall rule: allow Azure services
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Database
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ── Custom Role: DB Wake (start + read) ──────────────────────────────────────
// Minimal-privilege role for the Managed Identity's database wake capability.
// Only grants start and read on this specific PostgreSQL server.
// (Constitution XIV — least-privilege Managed Identity access)

resource dbWakeCustomRole 'Microsoft.Authorization/roleDefinitions@2022-04-01' = if (deployDbWakeRole) {
  name: guid('db-wake-role', subscription().subscriptionId, resourceGroup().id)
  properties: {
    roleName: 'AcroYoga DB Wake - ${environmentName}'
    description: 'Allows starting and reading the AcroYoga PostgreSQL Flexible Server. Assigned to the Container App Managed Identity for database wake functionality.'
    type: 'CustomRole'
    permissions: [
      {
        actions: [
          'Microsoft.DBforPostgreSQL/flexibleServers/read'
          'Microsoft.DBforPostgreSQL/flexibleServers/start/action'
        ]
        notActions: []
        dataActions: []
        notDataActions: []
      }
    ]
    assignableScopes: [
      postgresServer.id
    ]
  }
}

resource dbWakeRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployDbWakeRole) {
  name: guid(postgresServer.id, managedIdentityPrincipalId, 'db-wake')
  scope: postgresServer
  properties: {
    roleDefinitionId: dbWakeCustomRole.id
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output serverFqdn string = postgresServer.properties.fullyQualifiedDomainName
#disable-next-line outputs-should-not-contain-secrets
output connectionString string = 'postgresql://${adminLogin}:${adminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require'
output databaseName string = databaseName
output serverHost string = postgresServer.properties.fullyQualifiedDomainName
