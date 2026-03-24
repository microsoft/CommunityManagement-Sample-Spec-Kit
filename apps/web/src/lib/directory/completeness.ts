import type { ProfileCompleteness } from "@acroyoga/shared/types/directory";

interface CompletenessInput {
  avatarUrl: string | null;
  displayName: string | null;
  bio: string | null;
  homeCityId: string | null;
  socialLinksCount: number;
}

/** FR-026/FR-027: 5 × 20 % formula, computed at render time, not stored. */
export function computeProfileCompleteness(input: CompletenessInput): ProfileCompleteness {
  const fields = {
    avatar: !!input.avatarUrl,
    displayName: !!input.displayName,
    bio: !!input.bio,
    homeCity: !!input.homeCityId,
    socialLink: input.socialLinksCount > 0,
  };

  const percentage =
    (fields.avatar ? 20 : 0) +
    (fields.displayName ? 20 : 0) +
    (fields.bio ? 20 : 0) +
    (fields.homeCity ? 20 : 0) +
    (fields.socialLink ? 20 : 0);

  return { percentage, fields };
}
