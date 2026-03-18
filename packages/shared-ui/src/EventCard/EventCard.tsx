import type { HTMLAttributes } from "react";

export interface EventCardData {
  id: string;
  title: string;
  startDatetime: string;
  venueName: string;
  cityName: string;
  category: string;
  skillLevel: string;
  cost: number;
  currency: string;
  confirmedCount: number;
  capacity: number;
  posterImageUrl: string | null;
  userRsvpStatus?: string | null;
}

export interface EventCardProps {
  event: EventCardData;
  onPress?: (id: string) => void;
}

export type WebEventCardProps = EventCardProps & Omit<HTMLAttributes<HTMLDivElement>, "children">;
