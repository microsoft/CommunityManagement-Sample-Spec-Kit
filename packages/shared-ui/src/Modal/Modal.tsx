import type React from "react";

export interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export interface WebModalProps extends ModalProps {
  className?: string;
  style?: React.CSSProperties;
}
