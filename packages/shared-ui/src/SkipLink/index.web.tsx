import React from "react";
import type { SkipLinkProps } from "./SkipLink.js";

export function SkipLink({ targetId, label }: SkipLinkProps) {
  return (
    <a href={`#${targetId}`} className="skip-link">
      {label}
    </a>
  );
}
