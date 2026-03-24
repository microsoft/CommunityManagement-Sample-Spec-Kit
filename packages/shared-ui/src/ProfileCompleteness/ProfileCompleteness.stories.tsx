import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ProfileCompleteness } from "./index.web.js";
import type { ProfileCompleteness as PCType } from "@acroyoga/shared/types/directory";

const meta: Meta<typeof ProfileCompleteness> = {
  title: "Domain/ProfileCompleteness",
  component: ProfileCompleteness,
};

export default meta;
type Story = StoryObj<typeof ProfileCompleteness>;

const full: PCType = {
  percentage: 100,
  fields: { avatar: true, displayName: true, bio: true, homeCity: true, socialLink: true },
};

const partial: PCType = {
  percentage: 60,
  fields: { avatar: true, displayName: true, bio: true, homeCity: false, socialLink: false },
};

const empty: PCType = {
  percentage: 0,
  fields: { avatar: false, displayName: false, bio: false, homeCity: false, socialLink: false },
};

export const Complete: Story = { args: { completeness: full } };
export const Partial: Story = { args: { completeness: partial } };
export const Empty: Story = { args: { completeness: empty } };
