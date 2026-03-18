import type { SocialLink, LinkVisibility, Relationship } from "../types/community";

const VISIBILITY_RANK: Record<LinkVisibility, number> = {
  everyone: 0,
  followers: 1,
  friends: 2,
  hidden: 3,
};

const RELATIONSHIP_ACCESS: Record<Relationship, number> = {
  self: 3,
  friend: 2,
  follower: 1,
  following: 1,
  none: 0,
};

export function filterSocialLinks(
  links: SocialLink[],
  relationship: Relationship,
): SocialLink[] {
  const access = RELATIONSHIP_ACCESS[relationship];
  return links.filter((link) => {
    const required = VISIBILITY_RANK[link.visibility];
    return access >= required;
  });
}
