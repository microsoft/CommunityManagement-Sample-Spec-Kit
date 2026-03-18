import type React from "react";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  initials?: string;
  size?: AvatarSize;
}

export interface WebAvatarProps extends AvatarProps {
  className?: string;
  style?: React.CSSProperties;
}
