import { db } from "@/lib/db/client";
import { filterSocialLinks } from "@/lib/profiles/visibility";
import type {
  DirectoryEntry,
  DirectoryQueryParams,
  DirectoryResponse,
  RelationshipStatus,
  VisibleSocialLink,
} from "@acroyoga/shared/types/directory";
import type { SocialLink, Relationship, DefaultRole } from "@acroyoga/shared/types/community";

interface DirectoryRow {
  profile_id: string;
  user_id: string;
  display_name: string | null;
  home_city_name: string | null;
  home_country_name: string | null;
  home_city_id: string | null;
  default_role: string | null;
  avatar_url: string | null;
  created_at: string;
  is_verified_teacher: boolean;
  social_links: SocialLinkRaw[] | null;
  relationship: string;
}

interface SocialLinkRaw {
  id: string;
  userId: string;
  platform: string;
  url: string;
  visibility: string;
}

interface CursorPayload {
  /** Sort value (display_name for alphabetical, created_at for recent, tier+name for proximity) */
  s: string | null;
  id: string;
  /** Proximity tier (only for proximity sort) */
  t?: number;
}

function encodeCursor(sortValue: string | null, userId: string, tier?: number): string {
  const payload: CursorPayload = { s: sortValue, id: userId };
  if (tier !== undefined) payload.t = tier;
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const raw = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(raw) as CursorPayload;
    if (typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Map internal Relationship to contract RelationshipStatus */
function toRelationshipStatus(rel: string): RelationshipStatus {
  switch (rel) {
    case "friend": return "friend";
    case "following": return "following";
    case "follower": return "follows_me";
    case "blocked": return "blocked";
    default: return "none";
  }
}

function rowToEntry(row: DirectoryRow): DirectoryEntry {
  const relationship = row.relationship as Relationship;
  const rawLinks: SocialLink[] = (row.social_links ?? []).map((sl) => ({
    id: sl.id,
    userId: sl.userId,
    platform: sl.platform as SocialLink["platform"],
    url: sl.url,
    visibility: sl.visibility as SocialLink["visibility"],
  }));
  const visibleLinks = filterSocialLinks(rawLinks, relationship);

  const visibleSocialLinks: VisibleSocialLink[] = visibleLinks.map((l) => ({
    platform: l.platform,
    url: l.url,
  }));

  return {
    id: row.profile_id,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    defaultRole: row.default_role as DefaultRole | null,
    homeCity: row.home_city_name,
    homeCountry: row.home_country_name,
    isVerifiedTeacher: row.is_verified_teacher,
    visibleSocialLinks,
    relationshipStatus: toRelationshipStatus(row.relationship),
    createdAt: row.created_at,
  };
}

/**
 * Search the community directory.
 * Returns paginated entries with relationship info, social links, and teacher badge.
 * Uses a single SQL query with JOINs + json_agg() to avoid N+1.
 */
export async function searchDirectory(
  viewerId: string,
  params: DirectoryQueryParams,
): Promise<DirectoryResponse> {
  const {
    search,
    city,
    country,
    continent,
    role,
    teachersOnly,
    relationship: relationshipFilter,
    sort = "alphabetical",
    cursor,
    pageSize = 20,
  } = params;

  const conditions: string[] = [
    "up.user_id != $1",
  ];
  const queryParams: unknown[] = [viewerId];
  let idx = 2;

  // For the "blocked" filter, we show blocked users instead of excluding them
  const isBlockedFilter = relationshipFilter === "blocked";

  if (!isBlockedFilter) {
    // Standard: hide blocked users symmetrically
    conditions.push(
      `NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = $1 AND b.blocked_id = up.user_id)
           OR (b.blocker_id = up.user_id AND b.blocked_id = $1)
      )`,
    );
    conditions.push("up.directory_visible = true");
  } else {
    // Blocked filter: show users the viewer has blocked
    conditions.push(
      `EXISTS (SELECT 1 FROM blocks b WHERE b.blocker_id = $1 AND b.blocked_id = up.user_id)`,
    );
  }

  // Text search: case-insensitive prefix match on display_name (FR-009)
  if (search) {
    conditions.push(`lower(up.display_name) LIKE lower($${idx}) || '%'`);
    queryParams.push(search);
    idx++;
  }

  // Location filters via geography table
  if (city) {
    conditions.push(`up.home_city_id = $${idx++}`);
    queryParams.push(city);
  } else if (country) {
    conditions.push(`g.country = $${idx++}`);
    queryParams.push(country);
  } else if (continent) {
    conditions.push(`g.continent = $${idx++}`);
    queryParams.push(continent);
  }

  if (role) {
    conditions.push(`up.default_role = $${idx++}`);
    queryParams.push(role);
  }

  if (teachersOnly) {
    conditions.push(`tp.badge_status = 'verified'`);
  }

  // Relationship filters
  if (relationshipFilter === "following") {
    conditions.push(`f_out.followee_id IS NOT NULL`);
  } else if (relationshipFilter === "followers") {
    conditions.push(`f_in.follower_id IS NOT NULL`);
  } else if (relationshipFilter === "friends") {
    conditions.push(`f_out.followee_id IS NOT NULL AND f_in.follower_id IS NOT NULL`);
  }

  const whereBase = conditions.join(" AND ");

  // Build ORDER BY and cursor condition based on sort mode
  let orderBy: string;
  let cursorCondition = "";

  if (sort === "recent") {
    orderBy = `ORDER BY u.created_at DESC, up.user_id DESC`;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        cursorCondition = `AND (u.created_at < $${idx} OR (u.created_at = $${idx} AND up.user_id < $${idx + 1}))`;
        queryParams.push(decoded.s, decoded.id);
        idx += 2;
      }
    }
  } else if (sort === "proximity") {
    // 4-tier proximity: same city (1) → same country (2) → same continent (3) → global (4)
    orderBy = `ORDER BY
      CASE
        WHEN g.id = (SELECT home_city_id FROM user_profiles WHERE user_id = $1) THEN 1
        WHEN g.country = (
          SELECT g2.country FROM user_profiles up2
          LEFT JOIN geography g2 ON g2.id = up2.home_city_id
          WHERE up2.user_id = $1
        ) THEN 2
        WHEN g.continent = (
          SELECT g3.continent FROM user_profiles up3
          LEFT JOIN geography g3 ON g3.id = up3.home_city_id
          WHERE up3.user_id = $1
        ) THEN 3
        ELSE 4
      END ASC,
      up.display_name ASC NULLS LAST,
      up.user_id ASC`;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded && decoded.t !== undefined) {
        // For proximity cursor we use tier + name + id
        if (decoded.s === null) {
          cursorCondition = `AND (
            CASE
              WHEN g.id = (SELECT home_city_id FROM user_profiles WHERE user_id = $1) THEN 1
              WHEN g.country = (SELECT g2.country FROM user_profiles up2 LEFT JOIN geography g2 ON g2.id = up2.home_city_id WHERE up2.user_id = $1) THEN 2
              WHEN g.continent = (SELECT g3.continent FROM user_profiles up3 LEFT JOIN geography g3 ON g3.id = up3.home_city_id WHERE up3.user_id = $1) THEN 3
              ELSE 4
            END > $${idx}
            OR (
              CASE
                WHEN g.id = (SELECT home_city_id FROM user_profiles WHERE user_id = $1) THEN 1
                WHEN g.country = (SELECT g2.country FROM user_profiles up2 LEFT JOIN geography g2 ON g2.id = up2.home_city_id WHERE up2.user_id = $1) THEN 2
                WHEN g.continent = (SELECT g3.continent FROM user_profiles up3 LEFT JOIN geography g3 ON g3.id = up3.home_city_id WHERE up3.user_id = $1) THEN 3
                ELSE 4
              END = $${idx}
              AND (up.display_name IS NULL AND up.user_id > $${idx + 2})
            )
            OR (
              CASE
                WHEN g.id = (SELECT home_city_id FROM user_profiles WHERE user_id = $1) THEN 1
                WHEN g.country = (SELECT g2.country FROM user_profiles up2 LEFT JOIN geography g2 ON g2.id = up2.home_city_id WHERE up2.user_id = $1) THEN 2
                WHEN g.continent = (SELECT g3.continent FROM user_profiles up3 LEFT JOIN geography g3 ON g3.id = up3.home_city_id WHERE up3.user_id = $1) THEN 3
                ELSE 4
              END = $${idx}
              AND up.display_name > $${idx + 1}
            )
            OR (
              CASE
                WHEN g.id = (SELECT home_city_id FROM user_profiles WHERE user_id = $1) THEN 1
                WHEN g.country = (SELECT g2.country FROM user_profiles up2 LEFT JOIN geography g2 ON g2.id = up2.home_city_id WHERE up2.user_id = $1) THEN 2
                WHEN g.continent = (SELECT g3.continent FROM user_profiles up3 LEFT JOIN geography g3 ON g3.id = up3.home_city_id WHERE up3.user_id = $1) THEN 3
                ELSE 4
              END = $${idx}
              AND up.display_name = $${idx + 1}
              AND up.user_id > $${idx + 2}
            )
          )`;
        queryParams.push(decoded.t, decoded.s, decoded.id);
        idx += 3;
        } else {
          cursorCondition = `AND (
            CASE
              WHEN g.id = (SELECT home_city_id FROM user_profiles WHERE user_id = $1) THEN 1
              WHEN g.country = (SELECT g2.country FROM user_profiles up2 LEFT JOIN geography g2 ON g2.id = up2.home_city_id WHERE up2.user_id = $1) THEN 2
              WHEN g.continent = (SELECT g3.continent FROM user_profiles up3 LEFT JOIN geography g3 ON g3.id = up3.home_city_id WHERE up3.user_id = $1) THEN 3
              ELSE 4
            END > $${idx}
            OR (
              CASE
                WHEN g.id = (SELECT home_city_id FROM user_profiles WHERE user_id = $1) THEN 1
                WHEN g.country = (SELECT g2.country FROM user_profiles up2 LEFT JOIN geography g2 ON g2.id = up2.home_city_id WHERE up2.user_id = $1) THEN 2
                WHEN g.continent = (SELECT g3.continent FROM user_profiles up3 LEFT JOIN geography g3 ON g3.id = up3.home_city_id WHERE up3.user_id = $1) THEN 3
                ELSE 4
              END = $${idx}
              AND up.display_name > $${idx + 1}
            )
            OR (
              CASE
                WHEN g.id = (SELECT home_city_id FROM user_profiles WHERE user_id = $1) THEN 1
                WHEN g.country = (SELECT g2.country FROM user_profiles up2 LEFT JOIN geography g2 ON g2.id = up2.home_city_id WHERE up2.user_id = $1) THEN 2
                WHEN g.continent = (SELECT g3.continent FROM user_profiles up3 LEFT JOIN geography g3 ON g3.id = up3.home_city_id WHERE up3.user_id = $1) THEN 3
                ELSE 4
              END = $${idx}
              AND up.display_name = $${idx + 1}
              AND up.user_id > $${idx + 2}
            )
          )`;
        queryParams.push(decoded.t, decoded.s, decoded.id);
        idx += 3;
        }
      }
    }
  } else {
    // alphabetical (default)
    orderBy = `ORDER BY up.display_name ASC NULLS LAST, up.user_id ASC`;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        if (decoded.s === null) {
          cursorCondition = `AND (up.display_name IS NULL AND up.user_id > $${idx++})`;
          queryParams.push(decoded.id);
        } else {
          cursorCondition = `AND (
            up.display_name > $${idx}
            OR (up.display_name = $${idx} AND up.user_id > $${idx + 1})
            OR up.display_name IS NULL
          )`;
          queryParams.push(decoded.s, decoded.id);
          idx += 2;
        }
      }
    }
  }

  const whereWithCursor = `WHERE ${whereBase} ${cursorCondition}`;

  const boundedPageSize = Math.min(pageSize, 100);

  const joins = `
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    LEFT JOIN geography g
           ON g.id = up.home_city_id
    LEFT JOIN teacher_profiles tp
           ON tp.user_id = up.user_id
          AND tp.is_deleted = false
          AND tp.badge_status = 'verified'
    LEFT JOIN social_links sl
           ON sl.user_id = up.user_id
    LEFT JOIN follows f_out
           ON f_out.follower_id = $1
          AND f_out.followee_id = up.user_id
    LEFT JOIN follows f_in
           ON f_in.follower_id = up.user_id
          AND f_in.followee_id = $1
  `;

  const limitParam = idx;
  queryParams.push(boundedPageSize + 1);
  idx++;

  const dataSql = `
    SELECT
      up.id            AS profile_id,
      up.user_id,
      up.display_name,
      g.display_name_city    AS home_city_name,
      g.display_name_country AS home_country_name,
      up.home_city_id,
      up.default_role,
      up.avatar_url,
      u.created_at,
      COALESCE(tp.badge_status = 'verified', false) AS is_verified_teacher,
      COALESCE(
        json_agg(
          json_build_object(
            'id',         sl.id,
            'userId',     sl.user_id,
            'platform',   sl.platform,
            'url',        sl.url,
            'visibility', sl.visibility
          ) ORDER BY sl.platform
        ) FILTER (WHERE sl.id IS NOT NULL),
        '[]'::json
      ) AS social_links,
      CASE
        WHEN f_out.followee_id IS NOT NULL AND f_in.follower_id IS NOT NULL THEN 'friend'
        WHEN f_out.followee_id IS NOT NULL THEN 'following'
        WHEN f_in.follower_id IS NOT NULL  THEN 'follower'
        ELSE 'none'
      END AS relationship
    ${joins}
    ${whereWithCursor}
    GROUP BY
      up.id, up.user_id, up.display_name,
      g.display_name_city, g.display_name_country, g.id, g.country, g.continent,
      up.home_city_id,
      up.default_role, up.avatar_url, u.created_at,
      tp.badge_status,
      f_out.followee_id, f_in.follower_id
    ${orderBy}
    LIMIT $${limitParam}
  `;

  const dataResult = await db().query<DirectoryRow>(dataSql, queryParams);

  const rows = dataResult.rows;
  const hasMore = rows.length > boundedPageSize;
  const pageRows = hasMore ? rows.slice(0, boundedPageSize) : rows;

  let nextCursor: string | null = null;
  if (hasMore && pageRows.length > 0) {
    const lastRow = pageRows[pageRows.length - 1];
    if (sort === "recent") {
      nextCursor = encodeCursor(lastRow.created_at, lastRow.user_id);
    } else {
      nextCursor = encodeCursor(lastRow.display_name, lastRow.user_id);
    }
  }

  return {
    entries: pageRows.map(rowToEntry),
    nextCursor,
    hasNextPage: hasMore,
  };
}

/** Toggle the current user's directory opt-in flag. */
export async function setDirectoryVisibility(
  userId: string,
  visible: boolean,
): Promise<boolean> {
  await db().query(
    `INSERT INTO user_profiles (user_id, directory_visible)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET directory_visible = $2, updated_at = now()`,
    [userId, visible],
  );
  return visible;
}

/** Get the current directory visibility setting for a user. */
export async function getDirectoryVisibility(userId: string): Promise<boolean> {
  const result = await db().query<{ directory_visible: boolean }>(
    `SELECT directory_visible FROM user_profiles WHERE user_id = $1`,
    [userId],
  );
  if (result.rows.length === 0) return false;
  return result.rows[0].directory_visible;
}
