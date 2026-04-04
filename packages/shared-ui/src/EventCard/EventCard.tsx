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

/** Translatable labels for the EventCard component */
export interface EventCardLabels {
  free?: string;
  spots?: string;
}

export interface EventCardProps {
  event: EventCardData;
  onPress?: (id: string) => void;
  /** Override default English labels for i18n */
  labels?: EventCardLabels;
}

export type WebEventCardProps = EventCardProps & Omit<HTMLAttributes<HTMLDivElement>, "children">;
