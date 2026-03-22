# Quickstart: Entra External ID — Social Login Federation

**Spec**: 011 | **Date**: 2026-03-22

---

## Prerequisites

- Node.js 20+
- Spec 004 migrations applied (users, permission_grants tables)
- Spec 007 applied (mock auth for local development)
- An Azure subscription with an Entra External ID (CIAM) tenant provisioned

## Local Development (No Entra Credentials Required)

Spec 007 mock auth remains the default local development experience. You do **not** need an Entra External ID tenant to run the app locally.

```bash
# 1. Clone and install (from repo root, in WSL)
npm install

# 2. Copy environment template
cp .env.example .env.local
# Leave ENTRA_CLIENT_ID, ENTRA_TENANT_ID, ENTRA_TENANT_DOMAIN as-is
# Mock auth activates automatically when ENTRA credentials are absent

# 3. Run database migrations
npm run db:migrate

# 4. Start development server
npm run dev

# 5. Navigate to http://localhost:3000
# → The mock user switcher (Spec 007) replaces the social login buttons
# → No Entra External ID configuration needed
```

---

## Setting Up Entra External ID (Azure Portal)

Follow these steps to provision the Entra External ID tenant and configure social providers.

### Step 1: Create Entra External ID Tenant

1. Go to [Azure Portal](https://portal.azure.com) → Create a resource → **Microsoft Entra External ID**
2. Select **External** tenant type (not Workforce)
3. Choose a subdomain (e.g., `acroyogacommunity`) → this becomes `ENTRA_TENANT_DOMAIN`
4. Note the **Tenant ID** (UUID) → this becomes `ENTRA_TENANT_ID`

### Step 2: Register the Application

1. In the new External ID tenant → **App registrations** → **New registration**
2. Name: `AcroYoga Community Platform`
3. Supported account types: **Accounts in this organizational directory only**
4. Redirect URIs:
   - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (local dev)
   - `https://your-staging-domain/api/auth/callback/microsoft-entra-id` (staging)
   - `https://your-production-domain/api/auth/callback/microsoft-entra-id` (production)
5. Note the **Application (client) ID** → this becomes `ENTRA_CLIENT_ID`
6. Under **Certificates & secrets** → **New client secret** → note the secret value

### Step 3: Configure Social Identity Providers

In the Entra External ID tenant:

**Google**:
1. External Identities → All identity providers → Google
2. Enter your Google Cloud OAuth 2.0 Client ID and Secret
3. (Create at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID → Web application → Authorized redirect URI: `https://{ENTRA_TENANT_DOMAIN}.ciamlogin.com/{ENTRA_TENANT_ID}/federation/oidc/google`)

**Facebook**:
1. External Identities → All identity providers → Facebook
2. Enter your Facebook App ID and Secret
3. (Create at [developers.facebook.com](https://developers.facebook.com) → Add Product → Facebook Login)

**Apple**:
1. External Identities → All identity providers → Apple
2. Enter your Apple Services ID and Key
3. (Create at [developer.apple.com](https://developer.apple.com) → Certificates → Sign In with Apple)

### Step 4: Configure User Attributes and User Flow

1. In the External ID tenant → **User flows** → **New user flow**
2. Type: **Sign up and sign in**
3. Identity providers: Select Google, Facebook, Apple (as configured above)
4. User attributes to collect: Email Address, Display Name
5. Application claims to return: `email`, `name`, `oid` (Object ID)

### Step 5: Update Environment Variables

```bash
# .env.local (never commit real values)
ENTRA_CLIENT_ID=<your-application-client-id>
ENTRA_TENANT_ID=<your-tenant-uuid>
ENTRA_TENANT_DOMAIN=<your-tenant-subdomain>   # e.g., acroyogacommunity
NEXTAUTH_SECRET=<random-32-char-secret>
NEXTAUTH_URL=http://localhost:3000
```

> **Note**: Add `ENTRA_TENANT_DOMAIN` to your `.env.local` and production secrets. Update `apps/web/src/lib/config.ts` to validate this variable (see tasks.md T004).

---

## Running with Entra External ID Configured

```bash
# Set NEXT_PUBLIC_AUTH_CONFIGURED=true to enable social login UI (replaces mock switcher)
NEXT_PUBLIC_AUTH_CONFIGURED=true npm run dev

# Navigate to http://localhost:3000/login
# → Social provider buttons are now visible
# → Clicking them redirects to your Entra External ID tenant's hosted login page
```

---

## Running Tests

```bash
# Unit/integration tests (no Entra credentials needed — uses PGlite + mock tokens)
npm run test -- apps/web/tests/integration/social-user.test.ts
npm run test -- apps/web/tests/integration/link-account.test.ts
npm run test -- apps/web/tests/integration/gdpr-social.test.ts

# All tests
npm run test

# E2E test (requires running dev server + real Entra credentials on staging)
# Set E2E_ENTRA_TEST_USER and E2E_ENTRA_TEST_PASSWORD in test environment
npm run test:e2e -- apps/web/tests/e2e/social-login.spec.ts
```

---

## Key Concepts

### Why Entra External ID vs. Standard Entra ID?

| | Standard Entra ID | Entra External ID |
|--|---|---|
| Purpose | Internal employees | External consumers |
| Social providers | Requires custom OIDC setup | Google, Facebook, Apple built-in |
| Self-service registration | No | Yes |
| Issuer URL | `login.microsoftonline.com/...` | `{domain}.ciamlogin.com/...` |

### Token Flow

```
User → Login page → NextAuth → Entra External ID hosted login → 
Social provider (Google/Facebook/Apple) → Entra issues ID token →
NextAuth signIn callback → upsertSocialUser(oid, email, name) →
JWT callback → { userId: users.id } →
Session callback → session.user.id = userId →
App → getServerSession() → { userId }
```

### userId Stability

The `userId` in the platform is always the UUID from the `users` table (`users.id`). It is **never** the Entra `oid` directly. The `oid` is stored in `users.provider_oid` and used to look up the `userId` on each sign-in. This ensures:
- Changing social providers does not change `userId`
- Account linking gives the same `userId` for all linked identities
- All existing permission grants, bookings, and event history remain associated with the same `userId`

### The `linked_accounts` Table

A user's primary social identity is stored in `users.provider_oid`. Additional linked identities are in `linked_accounts`. On sign-in, both are checked:

```sql
SELECT id FROM users WHERE provider_oid = $oid
UNION ALL
SELECT user_id FROM linked_accounts WHERE provider_oid = $oid
LIMIT 1;
```

### Mock Auth Integration (Spec 007)

When `NEXT_PUBLIC_AUTH_CONFIGURED` is absent (default in local dev without Entra setup), the login page renders the Spec 007 mock user switcher instead of social login buttons. The `getServerSession()` return value is identical in both cases — all permission checks and middleware remain unaffected.

---

## File Locations

| What | Where |
|------|-------|
| Auth config (NextAuth) | `apps/web/src/lib/auth/config.ts` |
| Social user provisioning | `apps/web/src/lib/auth/social-user.ts` |
| Login page | `apps/web/src/app/login/page.tsx` |
| Social login buttons | `apps/web/src/components/auth/LoginButtons.tsx` |
| Account linking endpoint | `apps/web/src/app/api/auth/link/route.ts` |
| Linked accounts UI | `apps/web/src/components/auth/LinkedAccountsList.tsx` |
| Migration 1 | `apps/web/src/db/migrations/011-001-add-social-auth-columns.sql` |
| Migration 2 | `apps/web/src/db/migrations/011-002-create-linked-accounts.sql` |
| Shared types | `packages/shared/src/types/auth.ts` |
| Integration tests | `apps/web/tests/integration/social-user.test.ts` |
| E2E tests | `apps/web/tests/e2e/social-login.spec.ts` |
