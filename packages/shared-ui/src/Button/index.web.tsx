import React from "react";
import type { WebButtonProps, ButtonVariant, ButtonSize } from "./Button.js";

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "var(--color-brand-primary)",
    color: "#ffffff",
    border: "none",
  },
  secondary: {
    backgroundColor: "transparent",
    color: "var(--color-brand-primary)",
    border: "1px solid var(--color-brand-primary)",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--color-surface-foreground)",
    border: "1px solid transparent",
  },
  danger: {
    backgroundColor: "var(--color-semantic-error)",
    color: "#ffffff",
    border: "none",
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: "var(--spacing-1) var(--spacing-3)",
    fontSize: "var(--font-size-sm)",
    minHeight: 32,
  },
  md: {
    padding: "var(--spacing-2) var(--spacing-4)",
    fontSize: "var(--font-size-base)",
    minHeight: 40,
  },
  lg: {
    padding: "var(--spacing-3) var(--spacing-6)",
    fontSize: "var(--font-size-lg)",
    minHeight: 48,
  },
};

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  children,
  onPress,
  style,
  ...rest
}: WebButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onPress}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--spacing-2)",
        borderRadius: "var(--radius-md)",
        fontFamily: "var(--font-family-sans)",
        fontWeight: "var(--font-weight-semibold)" as string,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.5 : 1,
        transition: `background-color var(--global-transition-fast), opacity var(--global-transition-fast)`,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          style={{
            width: 16,
            height: 16,
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "var(--radius-full)",
            animation: "spin 0.6s linear infinite",
          }}
        />
      )}
      {children}
    </button>
  );
}
