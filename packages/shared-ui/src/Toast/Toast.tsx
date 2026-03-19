export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  visible: boolean;
  onDismiss?: () => void;
}
