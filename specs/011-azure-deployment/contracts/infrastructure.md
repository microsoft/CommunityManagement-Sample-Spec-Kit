# Infrastructure Contract: Bicep Module Interfaces

**Spec**: 011 | **Date**: 2026-03-22

---

## Module Interface Overview

Each Bicep module follows a consistent pattern: accepts parameters, creates resources, outputs connection info. The orchestrator (`main.bicep`) wires modules together via outputs.

---

## main.bicep — Orchestrator

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `environmentName` | `string` | Yes | `staging` or `production` |
| `location` | `string` | No | Azure region (default: `eastus2`) |
| `imageTag` | `string` | Yes | Container image tag (git SHA) |
| `dbAdminLogin` | `string` (secure) | Yes | PostgreSQL admin username |
| `dbAdminPassword` | `string` (secure) | Yes | PostgreSQL admin password |
| `stripeSecretKey` | `string` (secure) | Yes | Stripe API secret |
| `stripeWebhookSecret` | `string` (secure) | Yes | Stripe webhook signing secret |
| `stripeClientId` | `string` (secure) | Yes | Stripe Connect client ID |
| `nextAuthSecret` | `string` (secure) | Yes | NextAuth session encryption |
| `customDomainHostname` | `string` | No | Custom domain (empty = no custom domain) |
| `minReplicas` | `int` | No | Min Container App instances (default: 0) |
| `maxReplicas` | `int` | No | Max Container App instances (default: 10) |
| `dbSkuName` | `string` | No | PostgreSQL SKU (default: `Standard_B1ms`) |
| `dbStorageSizeGB` | `int` | No | PostgreSQL storage (default: 32) |

**Outputs**:
| Output | Type | Description |
|--------|------|-------------|
| `containerAppFqdn` | `string` | Container App public URL |
| `frontDoorEndpoint` | `string` | Front Door endpoint hostname |
| `containerRegistryLoginServer` | `string` | ACR login server URL |

**Module invocation order**:
```
1. managed-identity.bicep
2. container-registry.bicep
3. monitoring.bicep (Log Analytics + App Insights)
4. key-vault.bicep (depends on: managed identity, App Insights connection string)
5. database.bicep
6. storage.bicep
7. container-apps.bicep (depends on: ACR, Key Vault, monitoring, managed identity)
8. front-door.bicep (depends on: Container App FQDN)
```

---

## container-apps.bicep

**Inputs**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `environmentName` | `string` | Environment tag |
| `location` | `string` | Azure region |
| `containerRegistryLoginServer` | `string` | ACR URL |
| `imageTag` | `string` | Image tag to deploy |
| `managedIdentityId` | `string` | User-assigned managed identity resource ID |
| `managedIdentityClientId` | `string` | Client ID for Key Vault references |
| `keyVaultName` | `string` | Key Vault name for secret references |
| `appInsightsConnectionString` | `string` | App Insights connection string |
| `logAnalyticsWorkspaceId` | `string` | Log Analytics workspace resource ID |
| `minReplicas` | `int` | Minimum replicas |
| `maxReplicas` | `int` | Maximum replicas |
| `cpuCores` | `string` | CPU cores per instance (default: `'0.5'`) |
| `memorySize` | `string` | Memory per instance (default: `'1Gi'`) |
| `initContainerCommand` | `array` | Init container command for DB migrations (default: `['node', 'apps/web/src/db/migrate.ts']`) |

**Outputs**:
| Output | Type | Description |
|--------|------|-------------|
| `fqdn` | `string` | Container App FQDN |
| `environmentId` | `string` | Container Apps Environment resource ID |

---

## database.bicep

**Inputs**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `environmentName` | `string` | Environment tag |
| `location` | `string` | Azure region |
| `adminLogin` | `string` (secure) | Admin username |
| `adminPassword` | `string` (secure) | Admin password |
| `skuName` | `string` | SKU tier |
| `storageSizeGB` | `int` | Storage allocation |

**Outputs**:
| Output | Type | Description |
|--------|------|-------------|
| `serverFqdn` | `string` | PostgreSQL server FQDN |
| `connectionString` | `string` (secure) | Full connection string with PgBouncer port |
| `databaseName` | `string` | Database name (`acroyoga`) |

---

## key-vault.bicep

**Inputs**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `environmentName` | `string` | Environment tag |
| `location` | `string` | Azure region |
| `managedIdentityPrincipalId` | `string` | Identity to grant Secrets User role |
| `secrets` | `object` | Key-value pairs of secret names and values |
| `logAnalyticsWorkspaceId` | `string` | Log Analytics workspace ID for diagnostic audit logs (optional) |

**Outputs**:
| Output | Type | Description |
|--------|------|-------------|
| `vaultName` | `string` | Key Vault name |
| `vaultUri` | `string` | Key Vault URI |

---

## front-door.bicep

**Inputs**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `originHostname` | `string` | Container App FQDN (backend origin) |
| `customDomainHostname` | `string` | Custom domain (optional) |
| `wafPolicyName` | `string` | WAF policy name |

**Outputs**:
| Output | Type | Description |
|--------|------|-------------|
| `endpoint` | `string` | Front Door endpoint hostname |
| `frontDoorId` | `string` | Front Door resource ID (for Container Apps CORS) |

---

## monitoring.bicep

**Inputs**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `environmentName` | `string` | Environment tag |
| `location` | `string` | Azure region |
| `alertEmailAddress` | `string` | Email for alert action group notifications (optional) |
| `enableAlertRules` | `bool` | Whether to create metric alert rules (default: `true`) |

**Outputs**:
| Output | Type | Description |
|--------|------|-------------|
| `logAnalyticsWorkspaceId` | `string` | Workspace resource ID |
| `appInsightsConnectionString` | `string` | Connection string for SDK |
| `appInsightsInstrumentationKey` | `string` | *(deprecated — use connection string)* Legacy instrumentation key |

---

## managed-identity.bicep

**Inputs**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `environmentName` | `string` | Environment tag |
| `location` | `string` | Azure region |

**Outputs**:
| Output | Type | Description |
|--------|------|-------------|
| `principalId` | `string` | Service principal object ID (for RBAC assignments) |
| `clientId` | `string` | Client ID (for Key Vault references and SDK auth) |
| `resourceId` | `string` | Full resource ID (for Container App identity binding) |

---

## container-registry.bicep

**Inputs**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `location` | `string` | Azure region |
| `managedIdentityPrincipalId` | `string` | Identity to grant AcrPull role |

**Outputs**:
| Output | Type | Description |
|--------|------|-------------|
| `loginServer` | `string` | ACR login server URL (e.g., `acracroyoga.azurecr.io`) |

---

## storage.bicep

**Inputs**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `environmentName` | `string` | Environment tag |
| `location` | `string` | Azure region |
| `managedIdentityPrincipalId` | `string` | Identity to grant Storage Blob Data Contributor role |

**Outputs**:
| Output | Type | Description |
|--------|------|-------------|
| `connectionString` | `string` (secure) | Storage account connection string |
| `blobEndpoint` | `string` | Blob service endpoint URL |

---

## Health Check API Contracts

### GET /api/health (Liveness Probe)

**Purpose**: Confirms the Node.js process is alive and can handle requests.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "version": "sha-abc1234",
  "timestamp": "2026-03-22T10:00:00.000Z"
}
```

**Error response** (503): Not expected — if the process is alive, it returns 200.

### GET /api/ready (Readiness Probe)

**Purpose**: Confirms all dependencies (database, storage) are reachable.

**Response** (200 OK):
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "storage": "ok"
  },
  "timestamp": "2026-03-22T10:00:00.000Z"
}
```

**Error response** (503 Service Unavailable):
```json
{
  "status": "not_ready",
  "checks": {
    "database": "error: connection refused",
    "storage": "ok"
  },
  "timestamp": "2026-03-22T10:00:00.000Z"
}
```
