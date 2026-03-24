import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DirectoryCard } from "./index.web.js";
import type { DirectoryCardData } from "./DirectoryCard.js";

const member: DirectoryCardData = {
  id: "p-1",
  userId: "u-1",
  displayName: "Maya Chen",
  avatarUrl: null,
  defaultRole: "flyer",
  homeCity: "Berlin",
  homeCountry: "Germany",
  isVerifiedTeacher: true,
  visibleSocialLinks: [
    { platform: "instagram", url: "https://instagram.com/maya" },
    { platform: "youtube", url: "https://youtube.com/@maya" },
  ],
  relationshipStatus: "friend",
};

describe("DirectoryCard", () => {
  it("renders display name", () => {
    const html = renderToStaticMarkup(<DirectoryCard member={member} />);
    expect(html).toContain("Maya Chen");
  });

  it("renders initials when no avatar", () => {
    const html = renderToStaticMarkup(<DirectoryCard member={member} />);
    expect(html).toContain("M");
  });

  it("renders location", () => {
    const html = renderToStaticMarkup(<DirectoryCard member={member} />);
    expect(html).toContain("Berlin, Germany");
  });

  it("renders role badge", () => {
    const html = renderToStaticMarkup(<DirectoryCard member={member} />);
    expect(html).toContain("flyer");
  });

  it("renders verified teacher badge", () => {
    const html = renderToStaticMarkup(<DirectoryCard member={member} />);
    expect(html).toContain("Verified Teacher");
  });

  it("hides verified badge when not verified", () => {
    const noTeacher = { ...member, isVerifiedTeacher: false };
    const html = renderToStaticMarkup(<DirectoryCard member={noTeacher} />);
    expect(html).not.toContain("Verified Teacher");
  });

  it("renders relationship badge", () => {
    const html = renderToStaticMarkup(<DirectoryCard member={member} />);
    expect(html).toContain("Friends");
  });

  it("hides relationship badge when none", () => {
    const noRel = { ...member, relationshipStatus: "none" };
    const html = renderToStaticMarkup(<DirectoryCard member={noRel} />);
    expect(html).not.toContain("Friends");
  });

  it("renders follows_me as 'Follows you'", () => {
    const fol = { ...member, relationshipStatus: "follows_me" };
    const html = renderToStaticMarkup(<DirectoryCard member={fol} />);
    expect(html).toContain("Follows you");
  });

  it("renders social links", () => {
    const html = renderToStaticMarkup(<DirectoryCard member={member} />);
    expect(html).toContain("IG");
    expect(html).toContain("YT");
  });

  it("hides social links section when empty", () => {
    const noLinks = { ...member, visibleSocialLinks: [] };
    const html = renderToStaticMarkup(<DirectoryCard member={noLinks} />);
    expect(html).not.toContain("Social links");
  });

  it("renders unnamed member when displayName is null", () => {
    const unnamed = { ...member, displayName: null };
    const html = renderToStaticMarkup(<DirectoryCard member={unnamed} />);
    expect(html).toContain("Unnamed member");
  });

  it("renders avatar image when url provided", () => {
    const withAvatar = { ...member, avatarUrl: "https://example.com/photo.jpg" };
    const html = renderToStaticMarkup(<DirectoryCard member={withAvatar} />);
    expect(html).toContain("photo.jpg");
  });
});
