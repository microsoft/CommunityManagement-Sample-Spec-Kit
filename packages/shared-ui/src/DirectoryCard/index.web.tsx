import React from "react";
import type { WebDirectoryCardProps } from "./DirectoryCard.js";

const roleColors: Record<string, string> = {
  base: "var(--color-primary-base)",
  flyer: "var(--color-primary-flyer, var(--color-semantic-info))",
  hybrid: "var(--color-primary-hybrid, var(--color-semantic-warning))",
};

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "IG",
  youtube: "YT",
  facebook: "FB",
  website: "\uD83C\uDF10",
  tiktok: "TT",
  twitter_x: "X",
  linkedin: "in",
  threads: "@",
};

export function DirectoryCard({ member, onPress, style, ...rest }: WebDirectoryCardProps) {
  const initials = (member.displayName ?? "?")[0]?.toUpperCase() ?? "?";
  const location = [member.homeCity, member.homeCountry].filter(Boolean).join(", ");

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={() => onPress?.(member.userId)}
      onKeyDown={(e) => e.key === "Enter" && onPress?.(member.userId)}
      aria-label={`Member card for ${member.displayName ?? "unnamed member"}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-3)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-surface-border)",
        backgroundColor: "var(--color-surface-card)",
        color: "var(--color-surface-card-foreground)",
        padding: "var(--spacing-4)",
        cursor: onPress ? "pointer" : "default",
        fontFamily: "var(--font-family-sans)",
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--spacing-3)" }}>
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={`${member.displayName ?? "member"} avatar`}
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-full)",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-surface-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-semibold)" as string,
              color: "var(--color-primary-base, var(--color-surface-muted-foreground))",
            }}
          >
            {initials}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)" as string,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {member.displayName ?? "Unnamed member"}
          </h3>
          {location && (
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-xs)",
                color: "var(--color-surface-muted-foreground)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {location}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-1)", marginTop: "var(--spacing-1)" }}>
            {member.defaultRole && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)" as string,
                  padding: "0 var(--spacing-2)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--color-surface-muted)",
                  color: roleColors[member.defaultRole] ?? "var(--color-surface-muted-foreground)",
                  textTransform: "capitalize",
                }}
              >
                {member.defaultRole}
              </span>
            )}
            {member.isVerifiedTeacher && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)" as string,
                  padding: "0 var(--spacing-2)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--color-surface-muted)",
                  color: "var(--color-semantic-success)",
                }}
              >
                ✓ Verified Teacher
              </span>
            )}
            {member.relationshipStatus !== "none" && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)" as string,
                  padding: "0 var(--spacing-2)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--color-surface-muted)",
                  color: "var(--color-semantic-info)",
                  textTransform: "capitalize",
                }}
              >
                {member.relationshipStatus === "friend"
                  ? "Friends"
                  : member.relationshipStatus === "follows_me"
                    ? "Follows you"
                    : member.relationshipStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {member.visibleSocialLinks.length > 0 && (
        <ul
          style={{ display: "flex", gap: "var(--spacing-2)", listStyle: "none", padding: 0, margin: 0 }}
          aria-label="Social links"
        >
          {member.visibleSocialLinks.map((link) => (
            <li key={link.platform}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.displayName ?? "member"} on ${link.platform}`}
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-surface-muted-foreground)",
                  padding: "var(--spacing-0) var(--spacing-1)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-surface-border)",
                  textDecoration: "none",
                }}
              >
                {SOCIAL_LABELS[link.platform] ?? link.platform}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
