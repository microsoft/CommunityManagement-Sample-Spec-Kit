# Research: Entra External ID — Social Login Federation

**Spec**: 011 | **Date**: 2026-03-22

---

## R-1: Entra External ID vs. Standard Entra ID — Issuer URL Difference

**Decision**: Use the CIAM-specific issuer URL `https://{tenant_domain}.ciamlogin.com/{tenant_id}/v2.0` instead of the enterprise Entra ID URL `https://login.microsoftonline.com/{tenant_id}/v2.0`.

**Rationale**: Entra External ID (Consumer Identity and Access Management, or CIAM) is a separate Azure tenant type designed for external users (consumers/community members), not internal employees. The current `apps/web/src/lib/auth/config.ts` is configured with the enterprise issuer URL and the workforce `MicrosoftEntraID` provider from NextAuth.js.

For External ID (CIAM), the difference is:

| Feature | Standard Entra ID (Enterprise) | Entra External ID (CIAM) |
|---------|-------------------------------|--------------------------|
| Purpose | Internal employees & B2B | External consumers & community |
| Issuer URL | `login.microsoftonline.com/{tenant}/v2.0` | `{tenant}.ciamlogin.com/{tenant_id}/v2.0` |
| Social providers | Not native | Google, Facebook, Apple via federation |
| User flows | Conditional Access | User Flows / User Attributes |
| Self-service registration | No | Yes |
| MFA | Enterprise MFA | Customer-facing MFA (optional) |

The NextAuth.js `MicrosoftEntraID` provider accepts a custom `issuer` field. Setting it to the CIAM URL makes the provider work with External ID without any additional configuration changes.

**Updated auth config**:

```typescript
MicrosoftEntraID({
  clientId: process.env.ENTRA_CLIENT_ID!,
  issuer: `https://${process.env.ENTRA_TENANT_DOMAIN!}.ciamlogin.com/${process.env.ENTRA_TENANT_ID!}/v2.0`,
})
```

**Alternatives considered**:
- **Custom OIDC provider**: Next-auth supports generic OIDC via the `{ type: "oidc" }` provider. Would work but provides less type safety and no built-in claim handling for Microsoft-specific claims (`oid`, `tid`). The `MicrosoftEntraID` provider is purpose-built and preferred.
- **Azure AD B2C provider** (legacy): Entra External ID replaces Azure AD B2C. New implementations should use External ID. The B2C provider has a different claim structure and is being deprecated.

---

## R-2: Social Provider Federation Architecture

**Decision**: Configure Google, Facebook, and Apple as identity providers directly within the Entra External ID tenant portal, not as separate NextAuth.js providers.

**Rationale**: The platform authenticates users through a single OIDC endpoint (the Entra External ID tenant). Social providers are federated *within* Entra — the app never directly speaks to Google's or Facebook's OAuth endpoints. This architecture has several advantages:

1. **Normalised identity claims**: Entra External ID issues a consistent set of claims (`oid`, `email`, `name`) regardless of which social provider the user chose. The app receives identical token structure for Google, Facebook, and Apple users.
2. **Single client registration**: One app registration in Entra. No `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`, or `APPLE_CLIENT_ID` environment variables needed in the app — those are configured in the Entra External ID portal and are Entra's responsibility.
3. **Centralized policy**: MFA policies, conditional access, and consent management are configured once in Entra — not replicated per-provider.
4. **Reduced app complexity**: Adding a new social provider (e.g., LinkedIn) requires only an Entra portal configuration change and a new UI button — zero code changes to the auth layer.

**Portal setup required** (out-of-scope for code, documented for operators):
- Azure Portal → External Identities → All identity providers → Add Google (requires Google Cloud `client_id` + `client_secret`)
- Azure Portal → External Identities → All identity providers → Add Facebook (requires Facebook App ID + secret)
- Azure Portal → External Identities → All identity providers → Add Apple (requires Apple Services ID + key)
- Azure Portal → App registrations → {app} → Authentication → Add redirect URI for each environment

**Alternatives considered**:
- **Direct NextAuth.js social providers** (Google, Facebook, Apple as separate providers): Each provider requires its own client credentials as environment variables. Session `userId` would differ per provider unless manually unified. No Entra policy management. More environment variables to manage. Rejected because it bypasses the centralised identity management goal.

---

## R-3: Stable User Identity — The `oid` Claim

**Decision**: Use the Entra External ID `oid` (Object ID) claim as the canonical `userId` for the platform. Store it in the `users.provider_oid` column and derive the `userId` in the NextAuth JWT callback.

**Rationale**: The NextAuth default `sub` claim for `MicrosoftEntraID` is the `oid` claim in Entra tokens. However, the existing auth config maps `account.providerAccountId` to `token.sub`, and `token.sub` to `session.user.id`. This is correct for standard Entra ID but needs verification for External ID.

For Entra External ID:
- `oid`: Stable Object ID for the user in the External ID tenant. This is the same across all sign-ins for the same user, regardless of which social provider they used. This is the **correct** identifier for account continuity.
- `sub`: In OIDC, `sub` is app-specific — for the same user, different apps get different `sub` values. Not suitable as a cross-provider stable identifier.
- `email`: Not stable (users change emails; Apple hides emails). NOT used as the primary lookup key.

**JWT callback update**: Explicitly extract the `oid` claim from the ID token to ensure it is used as the `userId`:

```typescript
async jwt({ token, account, profile }) {
  if (account && profile) {
    // profile.oid is the stable Entra External ID Object ID
    token.userId = (profile as { oid?: string }).oid ?? token.sub;
  }
  return token;
}
```

**User provisioning flow**:

```
1. User signs in via Entra External ID
2. JWT callback fires → token.userId = profile.oid
3. Session callback fires → session.user.id = token.userId
4. App server receives getServerSession() → { userId: profile.oid }
5. Service layer: SELECT id FROM users WHERE provider_oid = session.user.id
   → If found: return existing userId
   → If not found: INSERT INTO users (provider_oid, email, name, ...) → return new userId
```

**Alternatives considered**:
- **Email-based lookup**: Simpler but fragile — emails change, Apple hides them. Rejected.
- **NextAuth built-in account linking (database adapter)**: NextAuth has a full database adapter with `accounts`, `sessions`, `users` tables. This conflicts with the platform's existing custom `users` table and permission system. We use a JWT strategy (no NextAuth DB tables) and handle user provisioning manually in the `signIn` callback. This is consistent with how Spec 004 designed the auth integration.

---

## R-4: User Provisioning Callback

**Decision**: Handle user provisioning in the NextAuth `signIn` callback, which fires after successful Entra External ID authentication. This callback can access the profile claims and perform a DB upsert.

**Rationale**: The `signIn` callback is the correct hook for provisioning because:
- It fires before the JWT or session callbacks, ensuring the user exists in the DB before the session is issued.
- It can return `false` to reject the sign-in (e.g., if an account is flagged for review).
- It has access to `user`, `account`, and `profile` — all needed for provisioning.

**Provisioning logic**:

```typescript
async signIn({ account, profile }) {
  if (!profile?.oid) return false; // Reject if no stable OID

  await upsertSocialUser({
    providerOid: profile.oid as string,
    email: profile.email ?? null,
    name: profile.name ?? null,
    avatarUrl: (profile as { picture?: string }).picture ?? null,
    provider: account?.provider ?? 'unknown',
  });
  return true;
}
```

The `upsertSocialUser` function performs:
```sql
INSERT INTO users (id, provider_oid, email, display_name, avatar_url, provider, created_at)
VALUES (gen_random_uuid(), $oid, $email, $name, $avatar_url, $provider, now())
ON CONFLICT (provider_oid) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = now();
```

The `ON CONFLICT (provider_oid) DO UPDATE` handles:
- Idempotent re-sign-ins (no duplicates)
- Profile updates when the user changes their Google profile name or photo

---

## R-5: Environment Variable Changes

**Decision**: Add `ENTRA_TENANT_DOMAIN` as a new environment variable. Rename the existing issuer construction to use `ciamlogin.com`. The `ENTRA_CLIENT_ID` and `ENTRA_TENANT_ID` variables remain with no rename.

**Current env vars**:
- `ENTRA_CLIENT_ID` — app registration client ID in Entra External ID (unchanged)
- `ENTRA_TENANT_ID` — Entra External ID tenant UUID (unchanged)

**New env var**:
- `ENTRA_TENANT_DOMAIN` — the subdomain of the Entra External ID tenant (e.g., `acroyogacommunity`). Used to construct the CIAM issuer URL: `https://{ENTRA_TENANT_DOMAIN}.ciamlogin.com/{ENTRA_TENANT_ID}/v2.0`.

**Why a separate domain variable?**: The tenant domain is not derivable from the tenant UUID. It is assigned when the Entra External ID tenant is created (e.g., `acroyogacommunity.onmicrosoft.com` → domain `acroyogacommunity`).

**Updated `apps/web/src/lib/config.ts`** Zod schema adds:
```typescript
ENTRA_TENANT_DOMAIN: z.string().min(1),
```

---

## R-6: Login Page and Redirect Flow

**Decision**: Create a `/login` page that renders social provider buttons. Use NextAuth's `signIn()` client function for each provider. Use the NextAuth `callbackUrl` parameter to return users to their intended destination.

**Implementation**:

```tsx
// app/login/page.tsx (server component for metadata, client sub-component for buttons)
import { LoginButtons } from '@/components/auth/LoginButtons';

// LoginButtons.tsx (client component — needs signIn())
'use client';
import { signIn } from 'next-auth/react';

function LoginButtons() {
  return (
    <div>
      <button onClick={() => signIn('microsoft-entra-id', { callbackUrl })}>
        {t('auth.signInWithGoogle')}  {/* Entra handles Google federation */}
      </button>
    </div>
  );
}
```

**Redirect flow**: NextAuth's `middleware.ts` uses `auth` to protect routes and automatically redirects unauthenticated users to `/login` with `callbackUrl`. The existing `requireAuth()` function returns 401 for API routes — the redirect is handled by the NextAuth middleware for page routes.

**Alternatives considered**:
- **Separate buttons per provider** (Google, Facebook, Apple as distinct NextAuth providers): Would require separate client IDs in the app. Rejected per R-2.
- **Single "Sign In" button** without provider choice: Since all social login goes through Entra External ID's hosted UI, a single button is the simplest approach. Entra's hosted login page shows the available social providers. However, showing recognizable social provider buttons (Google, Facebook, Apple icons) on our login page improves user confidence. The button triggers Entra auth and Entra's page then handles provider selection — OR we can use `login_hint` or `domain_hint` to route directly to a specific provider. Research shows Entra External ID supports `domain_hint` for direct routing.

---

## R-7: Account Linking Implementation

**Decision**: Store linked social accounts in a new `linked_accounts` table. The primary `provider_oid` in `users` is the first identity used. Additional identities add rows to `linked_accounts`. All `provider_oid` values (primary + linked) are looked up to find the `userId`.

**Schema**:
```sql
CREATE TABLE linked_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,      -- 'google', 'facebook', 'apple', etc.
  provider_oid TEXT NOT NULL,     -- Entra External ID oid for this identity
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_oid)           -- one platform account per social identity
);
```

**Lookup on sign-in**:
```sql
-- Primary lookup
SELECT id FROM users WHERE provider_oid = $oid
UNION
-- Linked account lookup
SELECT user_id FROM linked_accounts WHERE provider_oid = $oid
LIMIT 1;
```

**Linking flow**:
1. User is authenticated (has a valid session with `userId`)
2. User clicks "Link [provider] account" in settings
3. Server generates a short-lived CSRF-protected token, stores it in the session
4. Client calls `signIn('microsoft-entra-id', { callbackUrl: '/api/auth/link-callback' })`
5. After Entra authentication, the link callback:
   - Verifies the CSRF token
   - Checks that the returned `oid` is not already in `linked_accounts` for a different `userId` (409 if so)
   - Inserts into `linked_accounts`
6. User is redirected back to profile settings with success confirmation

**Alternatives considered**:
- **Store all identities in `users` table with multiple provider columns**: Does not scale to N providers. Rejected.
- **Use NextAuth database adapter's `accounts` table**: Conflicts with the platform's custom `users` table and JWT-only session strategy. Rejected per R-3.

---

## R-8: Mock Auth Compatibility (Spec 007)

**Decision**: No changes required to Spec 007's mock auth. The mock auth activates when `NODE_ENV=development` AND `ENTRA_CLIENT_ID` is absent from the environment. The social login UI buttons are only rendered when Entra is configured.

**Implementation**:

```tsx
// LoginButtons.tsx
const entraConfigured = Boolean(process.env.NEXT_PUBLIC_AUTH_CONFIGURED);

if (!entraConfigured) {
  return <MockUserSwitcher />; // Spec 007 component, dev only
}
return <SocialLoginButtons />;
```

`NEXT_PUBLIC_AUTH_CONFIGURED=true` is set only when Entra credentials are provided. In development without credentials, the mock switcher replaces social login buttons.

**Constitution compliance**: Mock auth never appears in production (Constitution QG-11 — auth must go through `getServerSession()`, which mock auth does). The `NEXT_PUBLIC_` prefix makes this a build-time configuration — the mock switcher is tree-shaken from production builds when the variable is absent.

---

## R-9: GDPR Compliance — Social Login Data

**Decision**: The `provider_oid` and social `email`/`name`/`avatar_url` fields are PII. The existing GDPR account-deletion function must be updated to hard-delete `linked_accounts` rows and clear `provider_oid`, `avatar_url` from the `users` record.

**Rationale**: Constitution III mandates that every new spec introducing PII-bearing tables updates the GDPR deletion and data-export functions. The `provider_oid` is not a shareable value, but it is a persistent cross-session identifier linked to the user's social profile — it qualifies as PII under GDPR Article 4(1).

**GDPR deletion additions**:
1. `DELETE FROM linked_accounts WHERE user_id = $userId`
2. `UPDATE users SET provider_oid = NULL, avatar_url = NULL, email = '[deleted]', display_name = '[deleted]' WHERE id = $userId`

**GDPR export additions**:
- Include `linked_accounts` rows in the data export
- Include `provider`, `provider_oid`, `avatar_url` from `users`
