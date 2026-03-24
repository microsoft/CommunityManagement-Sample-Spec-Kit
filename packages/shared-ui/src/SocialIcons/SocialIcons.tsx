import type { HTMLAttributes } from "react";
import type { SocialPlatform } from "@acroyoga/shared/types/community";

export interface SocialIconsProps {
  links: { platform: SocialPlatform; url: string }[];
  memberName?: string;
}

export type WebSocialIconsProps = SocialIconsProps & Omit<HTMLAttributes<HTMLUListElement>, "children">;
