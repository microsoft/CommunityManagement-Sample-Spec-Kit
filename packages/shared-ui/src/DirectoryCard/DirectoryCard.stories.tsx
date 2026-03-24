import type { Meta, StoryObj } from "@storybook/react";
import { DirectoryCard } from "./index.web.js";
import type { DirectoryCardData } from "./DirectoryCard.js";

const sampleMember: DirectoryCardData = {
  id: "profile-1",
  userId: "user-1",
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

const meta: Meta<typeof DirectoryCard> = {
  title: "Components/DirectoryCard",
  component: DirectoryCard,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof DirectoryCard>;

export const Default: Story = {
  args: { member: sampleMember },
};

export const Unnamed: Story = {
  args: { member: { ...sampleMember, displayName: null } },
};

export const NoSocialLinks: Story = {
  args: { member: { ...sampleMember, visibleSocialLinks: [] } },
};

export const FollowsMe: Story = {
  args: { member: { ...sampleMember, relationshipStatus: "follows_me" } },
};

export const NotConnected: Story = {
  args: { member: { ...sampleMember, relationshipStatus: "none", isVerifiedTeacher: false } },
};
