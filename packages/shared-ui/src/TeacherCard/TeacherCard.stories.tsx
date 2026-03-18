import type { Meta, StoryObj } from "@storybook/react";
import { TeacherCard } from "./index.web.js";
import type { TeacherCardData } from "./TeacherCard.js";

const sampleTeacher: TeacherCardData = {
  id: "teacher-1",
  user_name: "Elena Rodriguez",
  specialties: ["hand_to_hand", "therapeutic", "flow"],
  badge_status: "verified",
  aggregate_rating: "4.8",
  review_count: 42,
  bio: "Certified AcroYoga teacher with 10 years of experience in therapeutic flying and hand-to-hand balancing.",
};

const meta: Meta<typeof TeacherCard> = {
  title: "Components/TeacherCard",
  component: TeacherCard,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof TeacherCard>;

export const Verified: Story = {
  args: { teacher: sampleTeacher },
};

export const Pending: Story = {
  args: { teacher: { ...sampleTeacher, badge_status: "pending", user_name: "New Teacher" } },
};

export const NoRating: Story = {
  args: { teacher: { ...sampleTeacher, aggregate_rating: null, review_count: 0, user_name: "Fresh Start" } },
};
