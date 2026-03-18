import { db } from "@/lib/db/client";
import { isBlocked } from "@/lib/safety/blocks";
import { getRelationship } from "@/lib/follows/relationship";
import { filterSocialLinks } from "@/lib/profiles/visibility";
import type {
  UserProfile,
  UserProfileSelf,
  UserProfilePublic,
  SocialLink,
  UpdateProfileRequest,
  SocialPlatform,
  LinkVisibility,
} from "@acroyoga/shared/types/community";

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  home_city_id: string | null;
  default_role: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface SocialLinkRow {
  id: string;
  user_id: string;
  platform: string;
  url: string;
  visibility: string;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    homeCityId: row.home_city_id,
    defaultRole: row.default_role as UserProfile["defaultRole"],
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSocialLink(row: SocialLinkRow): SocialLink {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform as SocialPlatform,
    url: row.url,
    visibility: row.visibility as LinkVisibility,
  };
}

export async function getMyProfile(userId: string): Promise<UserProfileSelf> {
  let profile: UserProfile;

  const result = await db().query<ProfileRow>(
    `SELECT * FROM user_profiles WHERE user_id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    // Auto-create empty profile
    const insert = await db().query<ProfileRow>(
      `INSERT INTO user_profiles (user_id) VALUES ($1) RETURNING *`,
      [userId],
    );
    profile = rowToProfile(insert.rows[0]);
  } else {
    profile = rowToProfile(result.rows[0]);
  }

  const linksResult = await db().query<SocialLinkRow>(
    `SELECT * FROM social_links WHERE user_id = $1 ORDER BY platform`,
    [userId],
  );

  const cityResult = profile.homeCityId
    ? await db().query<{ name: string }>(
        `SELECT name FROM cities WHERE id = $1`,
        [profile.homeCityId],
      )
    : null;

  return {
    ...profile,
    socialLinks: linksResult.rows.map(rowToSocialLink),
    homeCityName: cityResult?.rows[0]?.name ?? null,
  };
}

export async function getProfile(
  userId: string,
  viewerId: string | null,
): Promise<UserProfilePublic | null> {
  // Block check
  if (viewerId) {
    const blocked = await isBlocked(viewerId, userId);
    if (blocked) return null;
  }

  const result = await db().query<ProfileRow & { city_name: string | null }>(
    `SELECT up.*, c.name as city_name
     FROM user_profiles up
     LEFT JOIN cities c ON c.id = up.home_city_id
     WHERE up.user_id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    // Check if user exists at all
    const userExists = await db().query(
      `SELECT 1 FROM users WHERE id = $1`,
      [userId],
    );
    if (userExists.rows.length === 0) return null;

    // Auto-create empty profile and return
    await db().query(
      `INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    const relationship = await getRelationship(viewerId, userId);
    return {
      userId,
      displayName: null,
      bio: null,
      homeCityName: null,
      defaultRole: null,
      avatarUrl: null,
      socialLinks: [],
      relationship,
    };
  }

  const row = result.rows[0];
  const relationship = await getRelationship(viewerId, userId);

  const linksResult = await db().query<SocialLinkRow>(
    `SELECT * FROM social_links WHERE user_id = $1 ORDER BY platform`,
    [userId],
  );
  const allLinks = linksResult.rows.map(rowToSocialLink);
  const visibleLinks = filterSocialLinks(allLinks, relationship);

  return {
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    homeCityName: row.city_name,
    defaultRole: row.default_role as UserProfilePublic["defaultRole"],
    avatarUrl: row.avatar_url,
    socialLinks: visibleLinks,
    relationship,
  };
}

export async function upsertProfile(
  userId: string,
  data: UpdateProfileRequest,
): Promise<UserProfile> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 2; // $1 is userId

  if (data.displayName !== undefined) {
    fields.push(`display_name = $${idx++}`);
    values.push(data.displayName);
  }
  if (data.bio !== undefined) {
    fields.push(`bio = $${idx++}`);
    values.push(data.bio);
  }
  if (data.homeCityId !== undefined) {
    fields.push(`home_city_id = $${idx++}`);
    values.push(data.homeCityId);
  }
  if (data.defaultRole !== undefined) {
    fields.push(`default_role = $${idx++}`);
    values.push(data.defaultRole);
  }
  if (data.avatarUrl !== undefined) {
    fields.push(`avatar_url = $${idx++}`);
    values.push(data.avatarUrl);
  }

  if (fields.length === 0) {
    const existing = await db().query<ProfileRow>(
      `SELECT * FROM user_profiles WHERE user_id = $1`,
      [userId],
    );
    if (existing.rows.length > 0) return rowToProfile(existing.rows[0]);
    const inserted = await db().query<ProfileRow>(
      `INSERT INTO user_profiles (user_id) VALUES ($1) RETURNING *`,
      [userId],
    );
    return rowToProfile(inserted.rows[0]);
  }

  // Build insert columns/values from the data fields (no updated_at in INSERT)
  const insertColumns = fields.map((f) => f.split(" = ")[0]).join(", ");
  const insertValues = values.map((_, i) => `$${i + 2}`).join(", ");

  // ON CONFLICT SET includes updated_at = now()
  const updateSet = [...fields, `updated_at = now()`].join(", ");

  const result = await db().query<ProfileRow>(
    `INSERT INTO user_profiles (user_id, ${insertColumns})
     VALUES ($1, ${insertValues})
     ON CONFLICT (user_id) DO UPDATE SET ${updateSet}
     RETURNING *`,
    [userId, ...values],
  );

  return rowToProfile(result.rows[0]);
}

export async function setSocialLinks(
  userId: string,
  links: Array<{ platform: SocialPlatform; url: string; visibility: LinkVisibility }>,
): Promise<SocialLink[]> {
  // Delete existing links for this user
  await db().query(`DELETE FROM social_links WHERE user_id = $1`, [userId]);

  const inserted: SocialLink[] = [];
  for (const link of links) {
    const result = await db().query<SocialLinkRow>(
      `INSERT INTO social_links (user_id, platform, url, visibility)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, link.platform, link.url, link.visibility],
    );
    inserted.push(rowToSocialLink(result.rows[0]));
  }

  return inserted;
}

export async function detectHomeCity(
  lat: number,
  lon: number,
): Promise<{ cityId: string | null; cityName: string | null; distance: number | null }> {
  // Haversine distance calculation — same as Spec 001's findNearestCity
  const result = await db().query<{ id: string; name: string; distance: number }>(
    `SELECT id, name,
       (6371 * acos(
         cos(radians($1)) * cos(radians(latitude)) *
         cos(radians(longitude) - radians($2)) +
         sin(radians($1)) * sin(radians(latitude))
       )) as distance
     FROM cities
     ORDER BY distance ASC
     LIMIT 1`,
    [lat, lon],
  );

  if (result.rows.length === 0) {
    return { cityId: null, cityName: null, distance: null };
  }

  const nearest = result.rows[0];
  if (nearest.distance > 100) {
    return { cityId: null, cityName: null, distance: nearest.distance };
  }

  return {
    cityId: nearest.id,
    cityName: nearest.name,
    distance: nearest.distance,
  };
}
