import type React from "react";

export type TextAreaState = "default" | "error" | "success";

export interface TextAreaProps {
  label: string;
  value?: string;
  placeholder?: string;
  state?: TextAreaState;
  errorMessage?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  onChangeText?: (text: string) => void;
}

export interface WebTextAreaProps extends TextAreaProps {
  name?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}
