@description('Environment name (staging or production)')
param environmentName string

@description('Azure region')
param location string = resourceGroup().location

@description('GitHub repository owner (organisation) numeric ID (e.g. "6154722"). When set together with githubRepoId, OIDC federated identity credentials are created using the org-level customised subject format (Constitution XIV).')
param githubOwnerId string = ''

@description('GitHub repository numeric ID (e.g. "1182392763"). Required when githubOwnerId is set.')
param githubRepoId string = ''

@description('When true, add a federated credential for the main branch push event (used by the build-and-push CI job). Only set to true for the staging environment.')
param addMainBranchFic bool = false

var identityName = 'id-acroyoga-${environmentName}'
var gitHubIssuer = 'https://token.actions.githubusercontent.com'
var ficAudiences = ['api://AzureADTokenExchange']

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

// Federated Identity Credential — GitHub Actions environment (deploy job)
// Subject uses org-level customised OIDC claim template:
// repository_owner_id:<owner_id>:repository_id:<repo_id>:environment:<env>
resource ficEnvironment 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = if (!empty(githubOwnerId) && !empty(githubRepoId)) {
  parent: managedIdentity
  name: 'github-actions-env-${environmentName}'
  properties: {
    issuer: gitHubIssuer
    subject: 'repository_owner_id:${githubOwnerId}:repository_id:${githubRepoId}:environment:${environmentName}'
    audiences: ficAudiences
  }
}

// Federated Identity Credential — GitHub Actions main branch (build-and-push job)
// Subject uses org-level customised OIDC claim template:
// repository_owner_id:<owner_id>:repository_id:<repo_id>:ref:refs/heads/main
resource ficMainBranch 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = if (addMainBranchFic && !empty(githubOwnerId) && !empty(githubRepoId)) {
  parent: managedIdentity
  name: 'github-actions-main-branch'
  properties: {
    issuer: gitHubIssuer
    subject: 'repository_owner_id:${githubOwnerId}:repository_id:${githubRepoId}:ref:refs/heads/main'
    audiences: ficAudiences
  }
}

output principalId string = managedIdentity.properties.principalId
output clientId string = managedIdentity.properties.clientId
output resourceId string = managedIdentity.id
output name string = managedIdentity.name
