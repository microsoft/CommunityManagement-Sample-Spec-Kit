import { describe, it, expect } from "vitest";
import { computeProfileCompleteness } from "@/lib/directory/completeness";

describe("computeProfileCompleteness", () => {
  const FIELDS = ["avatar", "displayName", "bio", "homeCity", "socialLink"] as const;

  // Generate all 2^5 = 32 combinations
  for (let mask = 0; mask < 32; mask++) {
    const avatar = !!(mask & 16);
    const displayName = !!(mask & 8);
    const bio = !!(mask & 4);
    const homeCity = !!(mask & 2);
    const socialLink = !!(mask & 1);

    const expected =
      (avatar ? 20 : 0) +
      (displayName ? 20 : 0) +
      (bio ? 20 : 0) +
      (homeCity ? 20 : 0) +
      (socialLink ? 20 : 0);

    const label = FIELDS.filter((_, i) => mask & (16 >> i)).join("+") || "none";

    it(`returns ${expected}% for ${label}`, () => {
      const result = computeProfileCompleteness({
        avatarUrl: avatar ? "https://example.com/avatar.jpg" : null,
        displayName: displayName ? "Jane Doe" : null,
        bio: bio ? "Hello world" : null,
        homeCityId: homeCity ? "00000000-0000-0000-0000-000000000001" : null,
        socialLinksCount: socialLink ? 2 : 0,
      });

      expect(result.percentage).toBe(expected);
      expect(result.fields).toEqual({
        avatar,
        displayName,
        bio,
        homeCity,
        socialLink,
      });
    });
  }

  it("treats socialLinksCount=1 as having a social link", () => {
    const result = computeProfileCompleteness({
      avatarUrl: null,
      displayName: null,
      bio: null,
      homeCityId: null,
      socialLinksCount: 1,
    });
    expect(result.percentage).toBe(20);
    expect(result.fields.socialLink).toBe(true);
  });

  it("treats socialLinksCount=0 as no social link", () => {
    const result = computeProfileCompleteness({
      avatarUrl: null,
      displayName: null,
      bio: null,
      homeCityId: null,
      socialLinksCount: 0,
    });
    expect(result.percentage).toBe(0);
    expect(result.fields.socialLink).toBe(false);
  });
});
