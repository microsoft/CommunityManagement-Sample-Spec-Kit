"use client";

/**
 * LoginButtons — social sign-in buttons for the /login page
 * Spec: 011-entra-external-id (T012)
 *
 * When entraConfigured=false: renders Spec 007 MockUserSwitcher for dev environments.
 * When entraConfigured=true: renders social provider buttons for Entra External ID.
 *
 * Constitution V: Accessible, mobile-first, design-token colours.
 * Constitution VIII: All strings from auth-messages.ts.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import { SOCIAL_PROVIDERS } from "@acroyoga/shared/types/auth";
import { AUTH_MESSAGES } from "./auth-messages";
import type { LoginPageConfig } from "@acroyoga/shared/types/auth";

const MockUserSwitcher = dynamic(
  () =>
    import("@/components/dev/MockUserSwitcher").then(
      (m) => ({ default: m.MockUserSwitcher }),
    ),
  { ssr: false },
);

interface LoginButtonsProps extends LoginPageConfig {
  /** Optional error code from the `error` search param (NextAuth error) */
  error?: string | null;
}

/** Map NextAuth error codes to human-readable messages */
function getErrorMessage(error: string | null | undefined): string | null {
  if (!error) return null;
  if (error === "SessionRequired") return AUTH_MESSAGES.signInErrorSessionExpired;
  if (error === "OAuthCallback") return AUTH_MESSAGES.signInErrorOAuthCallback;
  return AUTH_MESSAGES.signInErrorDefault;
}

/**
 * SVG icons for each social provider.
 * Inline SVGs avoid an extra HTTP request and guarantee icon availability.
 */
function ProviderIcon({ iconName }: { iconName: string }) {
  if (iconName === "google") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    );
  }
  if (iconName === "facebook") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="#1877F2"
      >
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }
  if (iconName === "apple") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
      </svg>
    );
  }
  return null;
}

export default function LoginButtons({
  entraConfigured,
  callbackUrl,
  error,
}: LoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const errorMessage = getErrorMessage(error);

  // Dev environment: show mock user switcher
  if (!entraConfigured) {
    return <MockUserSwitcher />;
  }

  async function handleSignIn(provider: string) {
    setLoadingProvider(provider);
    try {
      await signIn("microsoft-entra-id", { callbackUrl });
    } catch {
      setLoadingProvider(null);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "360px",
      }}
    >
      {/* Error message */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: "12px",
            borderRadius: "6px",
            backgroundColor: "var(--color-semantic-error-subtle, #fef2f2)",
            color: "var(--color-semantic-error, #dc2626)",
            fontSize: "14px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Social provider buttons */}
      {SOCIAL_PROVIDERS.map(({ provider, labelKey, iconName }) => {
        const label =
          AUTH_MESSAGES[labelKey as keyof typeof AUTH_MESSAGES] ?? labelKey;
        const isLoading = loadingProvider === provider;
        const isDisabled = loadingProvider !== null;

        return (
          <button
            key={provider}
            type="button"
            disabled={isDisabled}
            aria-label={label}
            aria-busy={isLoading}
            onClick={() => handleSignIn(provider)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              minHeight: "44px",
              minWidth: "44px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--color-border, #e5e7eb)",
              backgroundColor: isDisabled
                ? "var(--color-surface-muted, #f3f4f6)"
                : "var(--color-surface, #ffffff)",
              color: "var(--color-foreground, #111827)",
              fontSize: "15px",
              fontWeight: 500,
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.6 : 1,
              transition: "background-color 150ms ease",
              width: "100%",
            }}
          >
            <ProviderIcon iconName={iconName} />
            <span>
              {isLoading ? AUTH_MESSAGES.signInLoading : label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
