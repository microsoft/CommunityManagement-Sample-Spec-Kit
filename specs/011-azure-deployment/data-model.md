# Data Model: Azure Production Deployment

**Spec**: 011 | **Date**: 2026-03-22

---

## Infrastructure Resource Overview

This spec defines infrastructure resources (not database entities). The "data model" for an infrastructure deployment spec describes the Azure resources, their relationships, environment configurations, and parameter contracts.

```
┌──────────────────┐     ┌─────────────────────┐
│   Front Door     │────▶│  Container Apps Env  │
│  (global CDN)    │     │                      │
└──────────────────┘     │  ┌─────────────────┐ │
                         │  │  Container App   │ │
                         │  │  (web)           │ │
                         │  └────────┬─────┬──┘ │
                         └───────────┼─────┼────┘
                                     │     │
         ┌───────────────────────────┘     └──────────────────┐
         ▼                                                     ▼
┌──────────────────┐  ┌───────────────┐  ┌────────────────────┐
│   PostgreSQL     │  │   Key Vault   │  │   Blob Storage     │
│ Flexible Server  │  │  (secrets)    │  │   (media)          │
│  + PgBouncer     │  └───────┬───────┘  └────────────────────┘
└──────────────────┘          │
                              │
                    ┌─────────┴──────────┐
                    │  Managed Identity  │
                    │  (user-assigned)   │
                    └────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                     ▼
┌──────────────────┐ ┌───────────────┐ ┌────────────────────┐
│ Container        │ │  Log          │ │  App Insights      │
│ Registry (ACR)   │ │  Analytics    │ │  (telemetry)       │
└──────────────────┘ └───────────────┘ └────────────────────┘
```

---

## Resource Definitions

### 1. Resource Group

Logical container for all resources in an environment.

| Property | Value |
|----------|-------|
| Name pattern | `rg-acroyoga-{env}` |
| Location | `eastus2` (primary), configurable per environment |
| Tags | `environment={env}`, `project=acroyoga-community`, `managedBy=bicep` |

**Environments**: `staging`, `production`

---

### 2. User-Assigned Managed Identity

Central identity for service-to-service authentication. Eliminates credential management.

| Property | Value |
|----------|-------|
| Name pattern | `id-acroyoga-{env}` |
| Assignments | Key Vault Secrets User, ACR Pull, Storage Blob Data Contributor |

**RBAC assignments**:
| Role | Scope | Purpose |
|------|-------|---------|
| Key Vault Secrets User | Key Vault resource | Read secrets at runtime |
| AcrPull | Container Registry | Pull container images |
| Storage Blob Data Contributor | Storage Account | Read/write media blobs |

---

### 3. Azure Container Registry (ACR)

Private registry for container images. Shared across environments.

| Property | Value |
|----------|-------|
| Name pattern | `acracroyoga` (globally unique, no hyphens) |
| SKU | Basic (~$5/mo) |
| Admin user | Disabled (managed identity for pull) |
| Geo-replication | Disabled (single region) |

**Image naming**: `acracroyoga.azurecr.io/acroyoga-web:sha-{gitsha}`

---

### 4. Azure Container Apps Environment

Shared environment (networking, logging) for Container Apps in an environment.

| Property | Value |
|----------|-------|
| Name pattern | `cae-acroyoga-{env}` |
| Workload profile | Consumption (scale-to-zero) |
| Log destination | Azure Monitor (Log Analytics workspace) |
| Internal networking | No (external ingress for simplicity) |

---

### 5. Azure Container App (web)

The Next.js application container.

| Property | Value |
|----------|-------|
| Name pattern | `ca-acroyoga-web-{env}` |
| Image | `acracroyoga.azurecr.io/acroyoga-web:{tag}` |
| CPU | 0.5 per instance (staging), 1.0 per instance (production) |
| Memory | 1Gi per instance (staging), 2Gi per instance (production) |
| Min replicas | 0 (scale-to-zero) |
| Max replicas | 10 |
| Revision mode | Multiple (zero-downtime) |

**Scale rules**:
| Rule | Type | Threshold |
|------|------|-----------|
| HTTP requests | http | 20 concurrent requests per instance |

**Ingress**:
| Property | Value |
|----------|-------|
| External | true |
| Target port | 3000 |
| Transport | HTTP/1.1 |

**Health probes**:
| Probe | Path | Port | Period | Failure threshold |
|-------|------|------|--------|-------------------|
| Liveness | `/api/health` | 3000 | 10s | 3 |
| Readiness | `/api/ready` | 3000 | 5s | 3 |
| Startup | `/api/health` | 3000 | 5s | 30 (allow 2.5min startup) |

**Environment variables** (from Key Vault references):
| Variable | Key Vault Secret | Required |
|----------|-----------------|----------|
| `DATABASE_URL` | `database-url` | Yes |
| `NEXTAUTH_SECRET` | `nextauth-secret` | Yes |
| `NEXTAUTH_URL` | `nextauth-url` | Yes |
| `STRIPE_SECRET_KEY` | `stripe-secret-key` | Yes |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook-secret` | Yes |
| `STRIPE_CLIENT_ID` | `stripe-client-id` | Yes |
| `AZURE_STORAGE_CONNECTION_STRING` | `azure-storage-connection-string` | Yes |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `applicationinsights-connection-string` | Yes |
| `NODE_ENV` | (inline) `production` | Yes |
| `HOSTNAME` | (inline) `0.0.0.0` | Yes |
| `PORT` | (inline) `3000` | Yes |

---

### 6. Azure Database for PostgreSQL Flexible Server

Managed PostgreSQL with built-in PgBouncer connection pooling.

| Property | Staging | Production |
|----------|---------|------------|
| Name pattern | `psql-acroyoga-staging` | `psql-acroyoga-production` |
| SKU | `Standard_B1ms` (1 vCPU, 2GB) | `Standard_B2s` (2 vCPU, 4GB) |
| PostgreSQL version | 16 | 16 |
| Storage | 32GB (auto-grow) | 64GB (auto-grow) |
| PgBouncer | Enabled, transaction mode | Enabled, transaction mode |
| PgBouncer port | 6432 | 6432 |
| SSL | Required | Required |
| Backup retention | 7 days | 14 days |
| Geo-redundant backup | No | No (can enable later) |
| High availability | Disabled | Disabled (can enable later) |
| Firewall | Allow Azure services | Allow Azure services |

**Database**: `acroyoga` (created via Bicep)

**Connection string format**:
```
postgresql://{admin}:{password}@{server}.postgres.database.azure.com:6432/acroyoga?sslmode=require
```

---

### 7. Azure Key Vault

Centralised secrets storage with access auditing.

| Property | Value |
|----------|-------|
| Name pattern | `kv-acroyoga-{env}` |
| SKU | Standard |
| RBAC | Enabled (no access policies) |
| Soft delete | Enabled (90 days) |
| Purge protection | Enabled |
| Network | Public access (restrict to Container Apps VNET later) |
| Diagnostic logs | Enabled → Log Analytics |

**Secrets** (see Container App environment variables table above for the full list).

---

### 8. Azure Blob Storage

Media storage. **Already in use** — this resource may be pre-existing or provisioned fresh.

| Property | Value |
|----------|-------|
| Name pattern | `stacroyoga{env}` (globally unique, no hyphens) |
| SKU | Standard_LRS (locally redundant) |
| Access tier | Hot |
| Public access | Disabled (SAS tokens or managed identity) |
| Container | `media` |

---

### 9. Azure Front Door (Standard)

Global CDN, WAF, and intelligent routing.

| Property | Value |
|----------|-------|
| Name pattern | `afd-acroyoga` |
| Tier | Standard |
| Origin group | Container Apps FQDN |
| WAF policy | `waf-acroyoga` |
| Custom domain | Configurable (e.g., `app.acroyoga.community`) |
| TLS | Managed certificate (auto-renewal) |

**Caching rules**:
| Pattern | Cache behaviour | TTL |
|---------|----------------|-----|
| `/_next/static/*` | Cache | 30 days |
| `/api/*` | No cache | — |
| `/*.ico`, `/*.svg`, `/*.png` | Cache | 7 days |
| Default (`/*`) | Cache | 60s (stale-while-revalidate) |

**WAF rules**: Microsoft Default Rule Set 2.1 + Bot Manager Rule Set 1.0

---

### 10. Azure Monitor (Log Analytics + Application Insights)

Observability stack for logging, metrics, and tracing.

| Resource | Property | Value |
|----------|----------|-------|
| Log Analytics Workspace | Name | `log-acroyoga-{env}` |
| | Retention | 30 days |
| | SKU | PerGB2018 |
| Application Insights | Name | `appi-acroyoga-{env}` |
| | Type | Web |
| | Workspace | `log-acroyoga-{env}` |

**Alert rules** (Bicep-defined):
| Alert | Condition | Severity | Period |
|-------|-----------|----------|--------|
| High error rate | HTTP 5xx > 5% | Sev 2 | 5 min |
| Slow responses | Response p95 > 2s | Sev 3 | 5 min |
| Container restarts | Restart count > 3 | Sev 2 | 10 min |
| DB connection failures | Failed connections > 0 | Sev 1 | 5 min |

---

## Environment Configuration Matrix

| Parameter | Staging | Production |
|-----------|---------|------------|
| Resource group | `rg-acroyoga-staging` | `rg-acroyoga-production` |
| Location | `eastus2` | `eastus2` |
| Container App min replicas | 0 | 1 |
| Container App max replicas | 3 | 10 |
| PostgreSQL SKU | `Standard_B1ms` | `Standard_B2s` |
| PostgreSQL storage | 32GB | 64GB |
| Front Door | Shared | Shared |
| Key Vault | Separate per env | Separate per env |
| Stripe keys | Test keys | Live keys |
| Custom domain | `staging.acroyoga.community` | `app.acroyoga.community` |

---

## Cost Estimate (Low Traffic Baseline)

| Resource | Monthly Cost |
|----------|-------------|
| Container Apps (scale-to-zero) | ~$20 |
| PostgreSQL Flexible Server (B1ms) | ~$30 |
| Front Door Standard | ~$35 |
| Key Vault (operations) | ~$1 |
| Storage (Blob, 10GB) | ~$2 |
| Container Registry (Basic) | ~$5 |
| Log Analytics + App Insights | ~$5 |
| **Total** | **~$98/mo** |

*Meets FR-018 target of <$100/mo during low-traffic periods.*

---

## Bicep Parameter Contract

```bicep
@description('Environment name (staging or production)')
param environmentName string

@description('Azure region for all resources')
param location string = 'eastus2'

@description('Container image tag to deploy')
param imageTag string

@description('PostgreSQL administrator login')
@secure()
param dbAdminLogin string

@description('PostgreSQL administrator password')
@secure()
param dbAdminPassword string

@description('Stripe secret key')
@secure()
param stripeSecretKey string

@description('Stripe webhook signing secret')
@secure()
param stripeWebhookSecret string

@description('Stripe Connect client ID')
@secure()
param stripeClientId string

@description('NextAuth session secret')
@secure()
param nextAuthSecret string

@description('Custom domain hostname (optional)')
param customDomainHostname string = ''

@description('Container App min replicas')
param minReplicas int = 0

@description('Container App max replicas')
param maxReplicas int = 10

@description('PostgreSQL SKU name')
param dbSkuName string = 'Standard_B1ms'

@description('PostgreSQL storage size in GB')
param dbStorageSizeGB int = 32
```
