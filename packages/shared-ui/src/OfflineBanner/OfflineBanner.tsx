import type React from "react";

export interface OfflineBannerProps {
  message?: string;
  visible?: boolean;
}

export interface WebOfflineBannerProps extends OfflineBannerProps {
  className?: string;
  style?: React.CSSProperties;
}
