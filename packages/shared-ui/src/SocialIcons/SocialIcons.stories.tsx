import type { Meta, StoryObj } from "@storybook/react";
import { SocialIcons } from "./index.web.js";

const meta: Meta<typeof SocialIcons> = {
  title: "Components/SocialIcons",
  component: SocialIcons,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SocialIcons>;

export const AllPlatforms: Story = {
  args: {
    links: [
      { platform: "instagram", url: "https://instagram.com/user" },
      { platform: "youtube", url: "https://youtube.com/@user" },
      { platform: "facebook", url: "https://facebook.com/user" },
      { platform: "website", url: "https://example.com" },
      { platform: "tiktok", url: "https://tiktok.com/@user" },
      { platform: "twitter_x", url: "https://x.com/user" },
      { platform: "linkedin", url: "https://linkedin.com/in/user" },
      { platform: "threads", url: "https://threads.net/@user" },
    ],
    memberName: "Maya Chen",
  },
};

export const FewLinks: Story = {
  args: {
    links: [
      { platform: "instagram", url: "https://instagram.com/user" },
      { platform: "website", url: "https://example.com" },
    ],
  },
};

export const Empty: Story = {
  args: { links: [] },
};
