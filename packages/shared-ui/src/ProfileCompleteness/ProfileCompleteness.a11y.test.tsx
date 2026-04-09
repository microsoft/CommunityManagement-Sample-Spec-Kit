// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { ProfileCompleteness } from "./index.web.js";
import type { ProfileCompleteness as ProfileCompletenessData } from "@acroyoga/shared/types/directory";

const mockCompleteness: ProfileCompletenessData = {
  percentage: 60,
  fields: {
    avatar: true,
    displayName: true,
    bio: false,
    homeCity: true,
    socialLink: false,
  },
};

describe("ProfileCompleteness axe", () => {
  it("has no a11y violations (60%)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <ProfileCompleteness completeness={mockCompleteness} />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (100%)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <ProfileCompleteness
        completeness={{
          percentage: 100,
          fields: { avatar: true, displayName: true, bio: true, homeCity: true, socialLink: true },
        }}
      />,
    );
    await expectNoA11yViolations(div);
  });
});
