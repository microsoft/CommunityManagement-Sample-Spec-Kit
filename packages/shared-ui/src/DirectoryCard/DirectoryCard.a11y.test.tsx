// @vitest-environment jsdom
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { expectNoA11yViolations } from "../__tests__/a11y-helpers.js";
import { DirectoryCard } from "./index.web.js";

const mockMember = {
  id: "dir-1",
  userId: "user-1",
  displayName: "Alice Chen",
  avatarUrl: null,
  defaultRole: "base",
  homeCity: "London",
  homeCountry: "UK",
  isVerifiedTeacher: false,
  visibleSocialLinks: [],
  relationshipStatus: "none",
};

describe("DirectoryCard axe", () => {
  it("has no a11y violations", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(<DirectoryCard member={mockMember} />);
    await expectNoA11yViolations(div);
  });

  it("has no a11y violations (verified teacher)", async () => {
    const div = document.createElement("div");
    div.innerHTML = renderToStaticMarkup(
      <DirectoryCard member={{ ...mockMember, isVerifiedTeacher: true }} />,
    );
    await expectNoA11yViolations(div);
  });
});
