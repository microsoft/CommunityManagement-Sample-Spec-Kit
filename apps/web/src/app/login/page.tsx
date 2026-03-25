/**
 * /login page — social sign-in entry point
 * Spec: 011-entra-external-id (T011)
 *
 * Server component: resolves callbackUrl from search params (with
 * open-redirect validation), determines if Entra is configured,
 * and passes a LoginPageConfig to the LoginButtons client sub-component.
 *
 * Constitution IV: Server-side resolution of env vars and URL validation.
 * Constitution V: WCAG 2.1 AA, mobile-first, design tokens.
 */

import type { Metadata } from "next";
import LoginButtons from "@/components/auth/LoginButtons";
import { AUTH_MESSAGES } from "@/components/auth/auth-messages";
import { validateCallbackUrl } from "@/lib/auth/callback-url";

export const metadata: Metadata = {
  title: "Sign in — AcroYoga Community",
};

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  // R-8: Entra is "configured" when ENTRA_CLIENT_ID is present
  const entraConfigured = Boolean(process.env.ENTRA_CLIENT_ID);

  // T015: Validate callbackUrl to prevent open redirects
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const callbackUrl = validateCallbackUrl(params.callbackUrl, baseUrl);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "24px",
        backgroundColor: "var(--color-background, #f9fafb)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "var(--color-surface, #ffffff)",
          borderRadius: "12px",
          padding: "32px 24px",
          boxShadow:
            "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)",
        }}
      >
        {/* Page heading */}
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "8px",
            color: "var(--color-foreground, #111827)",
          }}
        >
          {AUTH_MESSAGES.loginPageTitle}
        </h1>
        <p
          style={{
            fontSize: "14px",
            textAlign: "center",
            color: "var(--color-surface-muted-foreground, #6b7280)",
            marginBottom: "28px",
          }}
        >
          {AUTH_MESSAGES.loginPageSubtitle}
        </p>

        {/* Social sign-in buttons (client component) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <LoginButtons
            entraConfigured={entraConfigured}
            callbackUrl={callbackUrl}
            error={params.error}
          />
        </div>
      </div>
    </main>
  );
}
