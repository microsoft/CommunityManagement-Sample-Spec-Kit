import React from "react";
import type { WebSocialIconsProps } from "./SocialIcons";
import { PLATFORM_ICONS } from "./icons";

const LABELS: Record<string, string> = {
  instagram: "IG",
  youtube: "YT",
  facebook: "FB",
  website: "\uD83C\uDF10",
  tiktok: "TT",
  twitter_x: "X",
  linkedin: "in",
  threads: "@",
};

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  website: "Website",
  tiktok: "TikTok",
  twitter_x: "X (Twitter)",
  linkedin: "LinkedIn",
  threads: "Threads",
};

function PlatformIcon({ platform }: { platform: string }) {
  const icon = PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS];
  if (!icon) return <span>{LABELS[platform] ?? platform}</span>;

  return (
    <svg
      viewBox={icon.viewBox}
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function SocialIcons({ links, memberName, style, ...rest }: WebSocialIconsProps) {
  if (links.length === 0) return null;

  return (
    <ul
      style={{ display: "flex", gap: "var(--spacing-2)", listStyle: "none", padding: 0, margin: 0, ...style }}
      aria-label="Social links"
      {...rest}
    >
      {links.map((link) => {
        const displayName = PLATFORM_DISPLAY_NAMES[link.platform] ?? link.platform;
        return (
          <li key={link.platform}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${memberName ?? "member"} ${displayName} profile`}
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-surface-muted-foreground)",
                padding: "var(--spacing-0) var(--spacing-1)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-surface-border)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PlatformIcon platform={link.platform} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
