import React from "react";
import type { WebTextAreaProps, TextAreaState } from "./TextArea.js";

const borderColors: Record<TextAreaState, string> = {
  default: "var(--color-surface-border, #d1d5db)",
  error: "var(--color-semantic-error, #ef4444)",
  success: "var(--color-semantic-success, #22c55e)",
};

export function TextArea({
  label,
  value,
  placeholder,
  state = "default",
  errorMessage,
  disabled = false,
  rows = 3,
  maxLength,
  name,
  id,
  className,
  style,
  onChange,
  onChangeText,
}: WebTextAreaProps) {
  const textareaId = id ?? `textarea-${name ?? label.toLowerCase().replace(/\s+/g, "-")}`;

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    onChange?.(e);
    onChangeText?.(e.target.value);
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "4px", ...style }}>
      <label
        htmlFor={textareaId}
        style={{
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--color-surface-foreground, #374151)",
        }}
      >
        {label}
      </label>
      <textarea
        id={textareaId}
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        onChange={handleChange}
        aria-invalid={state === "error"}
        aria-describedby={state === "error" && errorMessage ? `${textareaId}-error` : undefined}
        style={{
          padding: "var(--spacing-2, 8px) var(--spacing-3, 12px)",
          borderRadius: "var(--radius-md, 6px)",
          border: `1px solid ${borderColors[state]}`,
          fontSize: "1rem",
          outline: "none",
          resize: "vertical",
          fontFamily: "inherit",
          backgroundColor: disabled ? "var(--color-surface-muted, #f3f4f6)" : "transparent",
          color: "var(--color-surface-foreground, #111827)",
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {state === "error" && errorMessage && (
        <span
          id={`${textareaId}-error`}
          role="alert"
          style={{ fontSize: "0.75rem", color: "var(--color-semantic-error, #ef4444)" }}
        >
          {errorMessage}
        </span>
      )}
      {maxLength != null && (
        <span style={{ fontSize: "0.75rem", color: "var(--color-surface-muted-foreground, #6b7280)", textAlign: "right" }}>
          {(value ?? "").length}/{maxLength}
        </span>
      )}
    </div>
  );
}
