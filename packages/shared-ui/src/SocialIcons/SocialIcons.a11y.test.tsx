// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { SocialIcons } from "./index.web.js";
import type { SocialPlatform } from "@acroyoga/shared/types/community";

const mockLinks = [
  { platform: "instagram" as SocialPlatform, url: "https://instagram.com/acro_teacher" },
  { platform: "youtube" as SocialPlatform, url: "https://youtube.com/acro_teacher" },
];

describe("SocialIcons axe", () => {
  it("has no a11y violations", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <SocialIcons links={mockLinks} memberName="Jane Smith" />,
    );
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (empty links)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<SocialIcons links={[]} memberName="Jane Smith" />);
    await expectNoA11yViolations(div);
  });
});
