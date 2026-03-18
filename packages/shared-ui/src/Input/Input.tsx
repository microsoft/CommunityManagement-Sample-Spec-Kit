import type React from "react";

export type InputState = "default" | "error" | "success";

export interface InputProps {
  label: string;
  value?: string;
  placeholder?: string;
  state?: InputState;
  errorMessage?: string;
  disabled?: boolean;
  type?: string;
  onChangeText?: (text: string) => void;
}

export interface WebInputProps extends InputProps {
  name?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}
