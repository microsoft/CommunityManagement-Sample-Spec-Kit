# Data Model: 012-managed-identity-deploy

**Date**: 2026-03-23 | **Spec**: `specs/012-managed-identity-deploy/spec.md`

## Overview

This feature does not introduce new application-level data entities. It is an infrastructure and deployment feature that modifies how existing entities are accessed (Managed Identity instead of connection strings). The "data model" here describes the infrastructure configuration state and the files that constitute the deliverables.

## Infrastructure Configuration Entities

### Devcontainer Configuration

| Field | Type | Description |
|-------|------|-------------|
| `image` | string | Base container image: `mcr.microsoft.com/devcontainers/javascript-node:22` |
| `features` | object | Azure CLI, GitHub CLI, PostgreSQL client features |
| `postCreateCommand` | string | `npm ci --force` |
| `forwardPorts` | number[] | `[3000]` |
| `customizations.vscode.extensions` | string[] | ESLint, Prettier extensions |

**File**: `.devcontainer/devcontainer.json`

---

### Container App Environment Variables (Managed Identity)

New env vars added by this feature (in addition to existing secret-ref vars):

| Variable | Source | Purpose |
|----------|--------|---------|
| `AZURE_CLIENT_ID` | Bicep param `managedIdentityClientId` | Identifies User-Assigned Managed Identity |
| `AZURE_STORAGE_ACCOUNT_URL` | Bicep output `storage.outputs.blobEndpoint` | Blob storage endpoint for DefaultAzureCredential |
| `PGHOST` | Bicep output `database.outputs.serverHost` | PostgreSQL hostname for Entra token auth |
| `PGDATABASE` | Bicep param (default `acroyoga`) | PostgreSQL database name |

**File**: `infra/modules/container-apps.bicep`

---

### Database Entra Admin Configuration

| Field | Type | Description |
|-------|------|-------------|
| `authConfig.activeDirectoryAuth` | string | `Enabled` |
| `authConfig.passwordAuth` | string | `Enabled` (for local dev compatibility) |
| `authConfig.tenantId` | string | `subscription().tenantId` |
| `managedIdentityPrincipalId` | param | Principal ID for Entra admin registration |
| `managedIdentityClientId` | param | Client ID used as database username for token auth |

**File**: `infra/modules/database.bicep`

---

### Storage Account (Managed Identity Access)

| Field | Type | Description |
|-------|------|-------------|
| `storageBlobContributorRole` | RBAC assignment | Grants Storage Blob Data Contributor to managed identity |
| Connection string output | **REMOVED** | Storage no longer outputs connection string; only `blobEndpoint` |

**File**: `infra/modules/storage.bicep`

---

### Key Vault Secrets (Updated)

| Secret | Status | Notes |
|--------|--------|-------|
| `database-url` | **Kept** | Still used for connection string (NextAuth/migrations) |
| `nextauth-secret` | Kept | Session encryption |
| `nextauth-url` | Kept | Auth callback URL |
| `stripe-secret-key` | Kept | Payment processing |
| `stripe-webhook-secret` | Kept | Webhook verification |
| `stripe-client-id` | Kept | Stripe Connect |
| `applicationinsights-connection-string` | Kept | Monitoring |
| `storage-connection-string` | **REMOVED** | Replaced by Managed Identity + `AZURE_STORAGE_ACCOUNT_URL` |

**File**: `infra/modules/key-vault.bicep`

---

## Governance Files

| File | Version | Purpose |
|------|---------|---------|
| `specs/constitution.md` | v1.5.0 | Authoritative constitution (already updated) |
| `.specify/memory/constitution.md` | v1.3.0 → v1.5.0 | Sync target — must be replaced to match authoritative copy |

---

## State Transitions

```
Current State                        Target State
─────────────                        ────────────
.devcontainer/ (missing)         →   .devcontainer/devcontainer.json exists
.specify/memory/constitution.md      
  v1.3.0                         →   v1.5.0 (byte-identical to specs/constitution.md)
Container image (stale)          →   Rebuilt with @azure/identity
Bicep (local changes only)       →   Deployed to rg-acroyoga-stg
Endpoints (unknown state)        →   All return 200
Git remote (behind)              →   All changes pushed
```
