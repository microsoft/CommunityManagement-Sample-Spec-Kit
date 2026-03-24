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

export interface DirectoryCardProps {
  member: DirectoryCardData;
  onPress?: (userId: string) => void;
}

export type WebDirectoryCardProps = DirectoryCardProps & Omit<HTMLAttributes<HTMLDivElement>, "children">;
