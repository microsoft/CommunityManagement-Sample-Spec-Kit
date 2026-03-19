import type { ReactNode, HTMLAttributes } from "react";

export type CardVariant = "default" | "elevated" | "outlined";

export interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
}

export type WebCardProps = CardProps & Omit<HTMLAttributes<HTMLDivElement>, "children">;
