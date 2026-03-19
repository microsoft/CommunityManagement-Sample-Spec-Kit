import type React from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SelectState = "default" | "error" | "success";

export interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  state?: SelectState;
  errorMessage?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}

export interface WebSelectProps extends SelectProps {
  name?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}
