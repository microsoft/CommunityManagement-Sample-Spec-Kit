import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileCompleteness } from "./index.web.js";
import type { ProfileCompleteness as ProfileCompletenessType } from "@acroyoga/shared/types/directory";

const FULL: ProfileCompletenessType = {
  percentage: 100,
  fields: { avatar: true, displayName: true, bio: true, homeCity: true, socialLink: true },
};

const PARTIAL: ProfileCompletenessType = {
  percentage: 40,
  fields: { avatar: true, displayName: true, bio: false, homeCity: false, socialLink: false },
};

const EMPTY: ProfileCompletenessType = {
  percentage: 0,
  fields: { avatar: false, displayName: false, bio: false, homeCity: false, socialLink: false },
};

describe("ProfileCompleteness", () => {
  it("renders 100% with all checkmarks", () => {
    const html = renderToStaticMarkup(
      <ProfileCompleteness completeness={FULL} />,
    );
    expect(html).toContain("100%");
    expect(html).toContain("aria-valuenow=\"100\"");
    // All 5 fields should show ✓
    expect(html.match(/✓/g)?.length).toBe(5);
  });

  it("renders 40% with 2 checks and 3 circles", () => {
    const html = renderToStaticMarkup(
      <ProfileCompleteness completeness={PARTIAL} />,
    );
    expect(html).toContain("40%");
    expect(html.match(/✓/g)?.length).toBe(2);
    expect(html.match(/○/g)?.length).toBe(3);
  });

  it("renders 0% with all circles", () => {
    const html = renderToStaticMarkup(
      <ProfileCompleteness completeness={EMPTY} />,
    );
    expect(html).toContain("0%");
    expect(html.match(/○/g)?.length).toBe(5);
  });

  it("renders default field labels", () => {
    const html = renderToStaticMarkup(
      <ProfileCompleteness completeness={EMPTY} />,
    );
    expect(html).toContain("Profile photo");
    expect(html).toContain("Display name");
    expect(html).toContain("Bio");
    expect(html).toContain("Home city");
    expect(html).toContain("Social link");
  });

  it("accepts custom field labels", () => {
    const html = renderToStaticMarkup(
      <ProfileCompleteness
        completeness={EMPTY}
        fieldLabels={{ avatar: "Photo", bio: "About you" }}
      />,
    );
    expect(html).toContain("Photo");
    expect(html).toContain("About you");
    expect(html).toContain("Display name");
  });

  it("has accessible progressbar role", () => {
    const html = renderToStaticMarkup(
      <ProfileCompleteness completeness={PARTIAL} />,
    );
    expect(html).toContain("role=\"progressbar\"");
    expect(html).toContain("aria-valuemin=\"0\"");
    expect(html).toContain("aria-valuemax=\"100\"");
    expect(html).toContain("aria-label=\"Profile 40% complete\"");
  });
});
