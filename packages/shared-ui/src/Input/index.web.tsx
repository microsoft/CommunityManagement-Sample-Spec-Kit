import React from "react";
import type { WebInputProps, InputState } from "./Input.js";

const borderColors: Record<InputState, string> = {
  default: "var(--color-neutral-300)",
  error: "var(--color-feedback-error, #ef4444)",
  success: "var(--color-feedback-success, #22c55e)",
};

export function Input({
  label,
  value,
  placeholder,
  state = "default",
  errorMessage,
  disabled = false,
  type = "text",
  name,
  id,
  className,
  style,
  onChange,
  onChangeText,
}: WebInputProps) {
  const inputId = id ?? `input-${name ?? label.toLowerCase().replace(/\s+/g, "-")}`;

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange?.(e);
    onChangeText?.(e.target.value);
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "4px", ...style }}>
      <label
        htmlFor={inputId}
        style={{
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--color-neutral-700)",
        }}
      >
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        aria-invalid={state === "error"}
        aria-describedby={state === "error" && errorMessage ? `${inputId}-error` : undefined}
        style={{
          padding: "var(--spacing-2, 8px) var(--spacing-3, 12px)",
          borderRadius: "var(--radius-md, 6px)",
          border: `1px solid ${borderColors[state]}`,
          fontSize: "1rem",
          outline: "none",
          backgroundColor: disabled ? "var(--color-neutral-100)" : "transparent",
          color: "var(--color-neutral-900)",
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {state === "error" && errorMessage && (
        <span
          id={`${inputId}-error`}
          role="alert"
          style={{ fontSize: "0.75rem", color: "var(--color-feedback-error, #ef4444)" }}
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}
