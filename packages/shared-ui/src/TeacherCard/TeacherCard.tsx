import type { HTMLAttributes } from "react";

export interface TeacherCardData {
  id: string;
  user_name: string;
  specialties: string[];
  badge_status: "pending" | "verified" | "expired" | "revoked";
  aggregate_rating: string | null;
  review_count: number;
  bio: string | null;
}

export interface TeacherCardProps {
  teacher: TeacherCardData;
  onPress?: (id: string) => void;
}

export type WebTeacherCardProps = TeacherCardProps & Omit<HTMLAttributes<HTMLDivElement>, "children">;
