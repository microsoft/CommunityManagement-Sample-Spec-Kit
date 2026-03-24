@description('Azure region')
param location string = resourceGroup().location

@description('Principal ID of managed identity for AcrPull role')
param managedIdentityPrincipalId string

var uniqueSuffix = uniqueString(resourceGroup().id)
var registryName = 'acracroyoga${uniqueSuffix}'

// AcrPull role definition ID
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
  tags: {
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, managedIdentityPrincipalId, acrPullRoleId)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// AcrPush role — allows the managed identity to push images from CI
// (GitHub Actions OIDC uses this identity to run `docker build && docker push`)
var acrPushRoleId = '8311e382-0749-4cb8-b61a-304f252e45ec'

resource acrPushRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, managedIdentityPrincipalId, acrPushRoleId)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPushRoleId)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output loginServer string = registry.properties.loginServer
