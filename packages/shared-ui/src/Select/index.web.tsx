import React from "react";
import type { WebSelectProps, SelectState } from "./Select.js";

const borderColors: Record<SelectState, string> = {
  default: "var(--color-surface-border, #d1d5db)",
  error: "var(--color-semantic-error, #ef4444)",
  success: "var(--color-semantic-success, #22c55e)",
};

export function Select({
  label,
  options,
  value,
  placeholder,
  state = "default",
  errorMessage,
  disabled = false,
  name,
  id,
  className,
  style,
  onChange,
  onValueChange,
}: WebSelectProps) {
  const selectId = id ?? `select-${name ?? label.toLowerCase().replace(/\s+/g, "-")}`;

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    onChange?.(e);
    onValueChange?.(e.target.value);
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "4px", ...style }}>
      <label
        htmlFor={selectId}
        style={{
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--color-surface-foreground, #374151)",
        }}
      >
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        aria-invalid={state === "error"}
        aria-describedby={state === "error" && errorMessage ? `${selectId}-error` : undefined}
        style={{
          padding: "var(--spacing-2, 8px) var(--spacing-3, 12px)",
          borderRadius: "var(--radius-md, 6px)",
          border: `1px solid ${borderColors[state]}`,
          fontSize: "1rem",
          outline: "none",
          backgroundColor: disabled ? "var(--color-surface-muted, #f3f4f6)" : "var(--color-surface-background, #fff)",
          color: "var(--color-surface-foreground, #111827)",
          opacity: disabled ? 0.6 : 1,
          appearance: "none",
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27%3E%3Cpath fill=%27%236b7280%27 d=%27M2 4l4 4 4-4%27/%3E%3C/svg%3E")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          paddingRight: "36px",
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {state === "error" && errorMessage && (
        <span
          id={`${selectId}-error`}
          role="alert"
          style={{ fontSize: "0.75rem", color: "var(--color-semantic-error, #ef4444)" }}
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}
