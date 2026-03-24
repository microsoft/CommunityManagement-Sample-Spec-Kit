import type { HTMLAttributes } from "react";
import type { ProfileCompleteness } from "@acroyoga/shared/types/directory";

export interface ProfileCompletenessProps {
  completeness: ProfileCompleteness;
  fieldLabels?: Partial<Record<keyof ProfileCompleteness["fields"], string>>;
}

export type WebProfileCompletenessProps = ProfileCompletenessProps &
  Omit<HTMLAttributes<HTMLDivElement>, "children">;

export const DEFAULT_FIELD_LABELS: Record<keyof ProfileCompleteness["fields"], string> = {
  avatar: "Profile photo",
  displayName: "Display name",
  bio: "Bio",
  homeCity: "Home city",
  socialLink: "Social link",
};
