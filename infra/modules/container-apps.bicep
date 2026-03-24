@description('Environment name (staging or production)')
param environmentName string

@description('Azure region')
param location string = resourceGroup().location

@description('ACR login server URL')
param containerRegistryLoginServer string

@description('Container image tag')
param imageTag string

@description('User-assigned managed identity resource ID')
param managedIdentityId string

@description('User-assigned managed identity client ID')
param managedIdentityClientId string

@description('User-assigned managed identity name (for PostgreSQL Entra auth user)')
param managedIdentityName string

@description('Key Vault name for secret references')
param keyVaultName string

@description('Application Insights connection string')
param appInsightsConnectionString string

@description('Log Analytics workspace resource ID')
param logAnalyticsWorkspaceId string

@description('Azure Storage blob endpoint URL for Managed Identity access')
param storageBlobEndpoint string = ''

@description('PostgreSQL server hostname for Managed Identity token auth')
param pgHost string = ''

@description('PostgreSQL database name')
param pgDatabase string = 'acroyoga'

@description('Minimum replicas')
param minReplicas int = 0

@description('Maximum replicas')
param maxReplicas int = 10

@description('CPU cores per instance')
param cpuCores string = '0.5'

@description('Memory per instance')
param memorySize string = '1Gi'

var environmentResourceName = 'cae-acroyoga-${environmentName}'
var appName = 'ca-acroyoga-web-${environmentName}'
var imageName = '${containerRegistryLoginServer}/acroyoga-web:${imageTag}'

resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentResourceName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(logAnalyticsWorkspaceId, '2023-09-01').customerId
        #disable-next-line use-resource-symbol-reference
        sharedKey: listKeys(logAnalyticsWorkspaceId, '2023-09-01').primarySharedKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistryLoginServer
          identity: managedIdentityId
        }
      ]
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/database-url'
          identity: managedIdentityId
        }
        {
          name: 'nextauth-secret'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/nextauth-secret'
          identity: managedIdentityId
        }
        {
          name: 'nextauth-url'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/nextauth-url'
          identity: managedIdentityId
        }
        {
          name: 'stripe-secret-key'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/stripe-secret-key'
          identity: managedIdentityId
        }
        {
          name: 'stripe-webhook-secret'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/stripe-webhook-secret'
          identity: managedIdentityId
        }
        {
          name: 'stripe-client-id'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/stripe-client-id'
          identity: managedIdentityId
        }
        {
          name: 'applicationinsights-connection-string'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/applicationinsights-connection-string'
          identity: managedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: imageName
          resources: {
            cpu: json(cpuCores)
            memory: memorySize
          }
          env: [
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'NEXTAUTH_SECRET', secretRef: 'nextauth-secret' }
            { name: 'NEXTAUTH_URL', secretRef: 'nextauth-url' }
            { name: 'STRIPE_SECRET_KEY', secretRef: 'stripe-secret-key' }
            { name: 'STRIPE_WEBHOOK_SECRET', secretRef: 'stripe-webhook-secret' }
            { name: 'STRIPE_CLIENT_ID', secretRef: 'stripe-client-id' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'applicationinsights-connection-string' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'HOSTNAME', value: '0.0.0.0' }
            { name: 'PORT', value: '3000' }
            { name: 'AZURE_CLIENT_ID', value: managedIdentityClientId }
            { name: 'AZURE_STORAGE_ACCOUNT_URL', value: storageBlobEndpoint }
            { name: 'PGHOST', value: pgHost }
            { name: 'PGDATABASE', value: pgDatabase }
            { name: 'PGUSER', value: managedIdentityName }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/ready'
                port: 3000
              }
              periodSeconds: 5
              timeoutSeconds: 10
              failureThreshold: 10
            }
            {
              type: 'Startup'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              periodSeconds: 5
              timeoutSeconds: 5
              failureThreshold: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '20'
              }
            }
          }
        ]
      }
    }
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
    'azd-service-name': 'web'
  }
}

output fqdn string = containerApp.properties.configuration.ingress.fqdn
output environmentId string = containerAppEnvironment.id
