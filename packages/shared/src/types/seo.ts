// Spec 017: SEO & Social Sharing — shared type contracts

export type SchemaEventStatus =
  | "https://schema.org/EventScheduled"
  | "https://schema.org/EventCancelled"
  | "https://schema.org/EventPostponed"
  | "https://schema.org/EventRescheduled";

export type SchemaAvailability =
  | "https://schema.org/InStock"
  | "https://schema.org/SoldOut"
  | "https://schema.org/PreOrder";

export type ShareSource =
  | "twitter"
  | "whatsapp"
  | "facebook"
  | "linkedin"
  | "clipboard"
  | "native";

export type ShareMedium = "social" | "referral" | "messaging";

export type HreflangLocale = "en" | "es" | "ar" | "x-default";

export interface EventOGMetadata {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  type: "website";
  twitterCard: "summary_large_image";
  locale: string;
  updatedAt: string;
  noindex: boolean;
}

export interface TeacherOGMetadata {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  type: "profile";
  twitterCard: "summary";
  locale: string;
  noindex: boolean;
}

export interface EventStructuredData {
  "@context": "https://schema.org";
  "@type": "Event";
  name: string;
  startDate: string;
  endDate: string;
  description: string | null;
  eventStatus: SchemaEventStatus;
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode";
  location: {
    "@type": "Place";
    name: string;
    address: {
      "@type": "PostalAddress";
      addressLocality: string;
    };
  };
  offers: {
    "@type": "Offer";
    price: number;
    priceCurrency: string;
    availability: SchemaAvailability;
    url: string;
  };
  image: string[] | null;
  organizer: {
    "@type": "Organization";
    name: "AcroYoga Community";
    url: string;
  };
}

export interface TeacherStructuredData {
  "@context": "https://schema.org";
  "@type": "Person";
  name: string;
  description: string | null;
  url: string;
  image: string | undefined;
  jobTitle: "AcroYoga Teacher";
  knowsAbout: string[];
}

export interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
}

export interface ShareMetaResponse {
  url: string;
  title: string;
  description: string;
  ogTags: Record<string, string>;
  updatedAt: string;
  locale: string;
}

export interface ShareURL {
  source: ShareSource;
  medium: ShareMedium;
  campaign: string;
  url: string;
}
