import React from "react";
import type { WebAvatarProps, AvatarSize } from "./Avatar.js";

const sizeMap: Record<AvatarSize, string> = {
  sm: "32px",
  md: "40px",
  lg: "56px",
  xl: "80px",
};

const fontSizeMap: Record<AvatarSize, string> = {
  sm: "0.75rem",
  md: "0.875rem",
  lg: "1.25rem",
  xl: "1.75rem",
};

export function Avatar({ src, alt, initials, size = "md", className, style }: WebAvatarProps) {
  const dim = sizeMap[size];
  const baseStyle: React.CSSProperties = {
    width: dim,
    height: dim,
    borderRadius: "50%",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "var(--color-neutral-200)",
    color: "var(--color-neutral-700)",
    fontSize: fontSizeMap[size],
    fontWeight: 600,
    ...style,
  };

  if (src) {
    return (
      <div className={className} style={baseStyle} role="img" aria-label={alt ?? "avatar"}>
        <img
          src={src}
          alt={alt ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div className={className} style={baseStyle} role="img" aria-label={alt ?? initials ?? "avatar"}>
      {initials?.slice(0, 2).toUpperCase()}
    </div>
  );
}
