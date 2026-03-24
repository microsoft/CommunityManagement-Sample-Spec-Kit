import type { Role, ScopeType } from "@acroyoga/shared/types/permissions";

export interface SampleGrant {
  role: Role;
  scopeType: ScopeType;
  scopeValue: string | null;
}

export interface SampleUser {
  id: string;
  slug: string;
  name: string;
  email: string;
  displayRole: string;
  grants: SampleGrant[];
}

export const ANONYMOUS_SLUG = "anonymous";

export const SAMPLE_USERS: SampleUser[] = [
  {
    id: "00000000-0000-4000-a000-000000000001",
    slug: "global-admin",
    name: "Alice Global",
    email: "alice@example.com",
    displayRole: "Global Admin",
    grants: [
      { role: "global_admin", scopeType: "global", scopeValue: null },
    ],
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    slug: "uk-country-admin",
    name: "Bob United Kingdom",
    email: "bob@example.com",
    displayRole: "Country Admin (UK)",
    grants: [
      { role: "country_admin", scopeType: "country", scopeValue: "uk" },
    ],
  },
  {
    id: "00000000-0000-4000-a000-000000000003",
    slug: "bristol-city-admin",
    name: "Charlie Bristol",
    email: "charlie@example.com",
    displayRole: "City Admin (Bristol)",
    grants: [
      { role: "city_admin", scopeType: "city", scopeValue: "bristol" },
    ],
  },
  {
    id: "00000000-0000-4000-a000-000000000004",
    slug: "bristol-creator",
    name: "Diana Creator",
    email: "diana@example.com",
    displayRole: "Event Creator (Bristol)",
    grants: [
      { role: "event_creator", scopeType: "city", scopeValue: "bristol" },
    ],
  },
  {
    id: "00000000-0000-4000-a000-000000000005",
    slug: "regular-member",
    name: "Eve Member",
    email: "eve@example.com",
    displayRole: "Member",
    grants: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000006",
    slug: "teacher-frank",
    name: "Frank Teacher",
    email: "frank@example.com",
    displayRole: "Teacher (Verified)",
    grants: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000007",
    slug: "teacher-grace",
    name: "Grace Yogi",
    email: "grace@example.com",
    displayRole: "Teacher (SF)",
    grants: [
      { role: "event_creator", scopeType: "city", scopeValue: "san-francisco" },
    ],
  },
  {
    id: "00000000-0000-4000-a000-000000000008",
    slug: "teacher-hiro",
    name: "Hiro Tanaka",
    email: "hiro@example.com",
    displayRole: "Teacher (Bangkok)",
    grants: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000009",
    slug: "teacher-isla",
    name: "Isla Santos",
    email: "isla@example.com",
    displayRole: "Teacher (Pending)",
    grants: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000010",
    slug: "teacher-javier",
    name: "Javier Cruz",
    email: "javier@example.com",
    displayRole: "Member / New Teacher",
    grants: [],
  },
];

export const DEFAULT_MOCK_USER = SAMPLE_USERS[0]; // Alice Global

export function findUserBySlug(slug: string): SampleUser | undefined {
  return SAMPLE_USERS.find((u) => u.slug === slug);
}

export function findUserById(id: string): SampleUser | undefined {
  return SAMPLE_USERS.find((u) => u.id === id);
}

export function isMockAuthEnabled(): boolean {
  return (
    (process.env.NODE_ENV === "development" && !process.env.ENTRA_CLIENT_ID) ||
    process.env.MOCK_AUTH_ENABLED === "true"
  );
}
