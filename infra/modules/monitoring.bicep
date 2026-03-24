@description('Environment name (staging or production)')
param environmentName string

@description('Azure region')
param location string = resourceGroup().location

@description('Email address for alert action group notifications')
param alertEmailAddress string = ''

@description('Whether to create metric alert rules')
param enableAlertRules bool = true

@description('Application Insights resource ID for alert scoping')
param appInsightsResourceId string = ''

var logAnalyticsName = 'log-acroyoga-${environmentName}'
var appInsightsName = 'appi-acroyoga-${environmentName}'
var actionGroupName = 'ag-acroyoga-${environmentName}'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

// Action group for alerts
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = if (enableAlertRules && alertEmailAddress != '') {
  name: actionGroupName
  location: 'global'
  properties: {
    groupShortName: 'acroyoga'
    enabled: true
    emailReceivers: [
      {
        name: 'ops-email'
        emailAddress: alertEmailAddress
      }
    ]
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

// Alert: HTTP 5xx > 5% over 5 min (Sev2)
resource http5xxAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (enableAlertRules && appInsightsResourceId != '') {
  name: 'alert-http5xx-${environmentName}'
  location: 'global'
  properties: {
    severity: 2
    enabled: true
    scopes: [
      appInsightsResourceId != '' ? appInsightsResourceId : appInsights.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'http5xx'
          metricName: 'requests/failed'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: alertEmailAddress != '' ? [
      {
        actionGroupId: actionGroup.id
      }
    ] : []
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

// Alert: Response p95 > 2s over 5 min (Sev3)
resource responseTimeAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (enableAlertRules && appInsightsResourceId != '') {
  name: 'alert-response-time-${environmentName}'
  location: 'global'
  properties: {
    severity: 3
    enabled: true
    scopes: [
      appInsightsResourceId != '' ? appInsightsResourceId : appInsights.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'responseTime'
          metricName: 'requests/duration'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: 2000
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: alertEmailAddress != '' ? [
      {
        actionGroupId: actionGroup.id
      }
    ] : []
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

// Alert: Container restarts > 3 in 10 min (Sev2)
resource containerRestartAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (enableAlertRules && appInsightsResourceId != '') {
  name: 'alert-container-restart-${environmentName}'
  location: 'global'
  properties: {
    severity: 2
    enabled: true
    scopes: [
      appInsightsResourceId != '' ? appInsightsResourceId : appInsights.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT10M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'containerRestarts'
          metricName: 'exceptions/count'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: 3
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: alertEmailAddress != '' ? [
      {
        actionGroupId: actionGroup.id
      }
    ] : []
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

// Alert: DB connection failures > 0 in 5 min (Sev1)
resource dbConnectionAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (enableAlertRules && appInsightsResourceId != '') {
  name: 'alert-db-connection-${environmentName}'
  location: 'global'
  properties: {
    severity: 1
    enabled: true
    scopes: [
      appInsightsResourceId != '' ? appInsightsResourceId : appInsights.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'dbConnectionFailures'
          metricName: 'dependencies/failed'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: 0
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: alertEmailAddress != '' ? [
      {
        actionGroupId: actionGroup.id
      }
    ] : []
  }
  tags: {
    environment: environmentName
    project: 'acroyoga-community'
    managedBy: 'bicep'
  }
}

output logAnalyticsWorkspaceId string = logAnalytics.id
output appInsightsResourceId string = appInsights.id
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
