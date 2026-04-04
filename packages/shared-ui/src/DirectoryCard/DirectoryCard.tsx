import type { HTMLAttributes } from "react";
import type { SocialPlatform } from "@acroyoga/shared/types/community";

export interface DirectoryCardData {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  defaultRole: string | null;
  homeCity: string | null;
  homeCountry: string | null;
  isVerifiedTeacher: boolean;
  visibleSocialLinks: { platform: SocialPlatform; url: string }[];
  relationshipStatus: string;
}

/** Translatable labels for the DirectoryCard component */
export interface DirectoryCardLabels {
  unnamedMember?: string;
  verifiedTeacher?: string;
  friends?: string;
  followsYou?: string;
}

export interface DirectoryCardProps {
  member: DirectoryCardData;
  onPress?: (userId: string) => void;
  /** Override default English labels for i18n */
  labels?: DirectoryCardLabels;
}

export type WebDirectoryCardProps = DirectoryCardProps & Omit<HTMLAttributes<HTMLDivElement>, "children">;
