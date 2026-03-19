import type { ReactNode, ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
  onPress?: () => void;
}

export type WebButtonProps = ButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "disabled">;
