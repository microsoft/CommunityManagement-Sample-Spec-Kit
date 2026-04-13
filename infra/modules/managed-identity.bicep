@description('Environment name (staging or production)')
param environmentName string

@description('Azure region')
param location string = resourceGroup().location

@description('GitHub organisation name (e.g. "microsoft"). When set, OIDC federated identity credentials are created on the managed identity so GitHub Actions can authenticate without stored secrets (Constitution XIV).')
param githubOrg string = ''

@description('GitHub repository name (e.g. "CommunityManagement-Sample-Spec-Kit"). Required when githubOrg is set.')
param githubRepo string = ''

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
// Subject: repo:<org>/<repo>:environment:<env>  (protected by GH environment rules)
resource ficEnvironment 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = if (!empty(githubOrg) && !empty(githubRepo)) {
  parent: managedIdentity
  name: 'github-actions-env-${environmentName}'
  properties: {
    issuer: gitHubIssuer
    subject: 'repo:${githubOrg}/${githubRepo}:environment:${environmentName}'
    audiences: ficAudiences
  }
}

// Federated Identity Credential — GitHub Actions main branch (build-and-push job)
// Subject: repo:<org>/<repo>:ref:refs/heads/main  (only granted on staging identity)
resource ficMainBranch 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = if (addMainBranchFic && !empty(githubOrg) && !empty(githubRepo)) {
  parent: managedIdentity
  name: 'github-actions-main-branch'
  properties: {
    issuer: gitHubIssuer
    subject: 'repo:${githubOrg}/${githubRepo}:ref:refs/heads/main'
    audiences: ficAudiences
  }
}

output principalId string = managedIdentity.properties.principalId
output clientId string = managedIdentity.properties.clientId
output resourceId string = managedIdentity.id
output name string = managedIdentity.name
