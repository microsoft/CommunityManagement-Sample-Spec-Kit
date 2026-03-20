import { db } from "@/lib/db/client";
import { escapeIlike } from "@/lib/db/utils";
import { filterSocialLinks } from "@/lib/profiles/visibility";
import type {
  DirectoryEntry,
  DirectorySearchParams,
  DirectorySearchResponse,
} from "@acroyoga/shared/types/directory";
import type { SocialLink, Relationship, DefaultRole } from "@acroyoga/shared/types/community";

interface DirectoryRow {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  home_city_name: string | null;
  home_city_id: string | null;
  home_country_id: string | null;
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
  n: string | null;
  id: string;
}

function encodeCursor(displayName: string | null, userId: string): string {
  const payload: CursorPayload = { n: displayName, id: userId };
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

function computeCompleteness(row: DirectoryRow): number {
  let score = 0;
  if (row.display_name) score += 20;
  if (row.bio) score += 20;
  if (row.avatar_url) score += 20;
  if (row.home_city_name) score += 20;
  if (row.default_role) score += 10;
  if (row.social_links && row.social_links.length > 0) score += 10;
  return score;
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

  return {
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    homeCityName: row.home_city_name,
    defaultRole: row.default_role as DefaultRole | null,
    avatarUrl: row.avatar_url,
    socialLinks: visibleLinks,
    relationship,
    isVerifiedTeacher: row.is_verified_teacher,
    profileCompleteness: computeCompleteness(row),
    joinedAt: row.created_at,
  };
}

/**
 * Search the community directory.
 * Returns paginated entries with relationship info, social links, and teacher badge.
 * Uses a single SQL query with JOINs + json_agg() to avoid N+1.
 */
export async function searchDirectory(
  viewerId: string,
  params: DirectorySearchParams,
): Promise<DirectorySearchResponse> {
  const {
    q,
    cityId,
    role,
    verifiedTeacher,
    relationship: relationshipFilter,
    sort = "name",
    cursor,
    limit = 20,
  } = params;

  const conditions: string[] = [
    "up.directory_visible = true",
    "up.user_id != $1",
    `NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = $1 AND b.blocked_id = up.user_id)
         OR (b.blocker_id = up.user_id AND b.blocked_id = $1)
    )`,
  ];
  const queryParams: unknown[] = [viewerId];
  let idx = 2;

  if (q) {
    const like = `%${escapeIlike(q)}%`;
    conditions.push(`(up.display_name ILIKE $${idx} OR up.bio ILIKE $${idx})`);
    queryParams.push(like);
    idx++;
  }

  if (cityId) {
    conditions.push(`up.home_city_id = $${idx++}`);
    queryParams.push(cityId);
  }

  if (role) {
    conditions.push(`up.default_role = $${idx++}`);
    queryParams.push(role);
  }

  if (verifiedTeacher) {
    conditions.push(`tp.badge_status = 'verified'`);
  }

  if (relationshipFilter === "following") {
    conditions.push(`f_out.followee_id IS NOT NULL`);
  } else if (relationshipFilter === "followers") {
    conditions.push(`f_in.follower_id IS NOT NULL`);
  } else if (relationshipFilter === "friends") {
    conditions.push(`f_out.followee_id IS NOT NULL AND f_in.follower_id IS NOT NULL`);
  }

  const whereBase = conditions.join(" AND ");

  // Track the index at which base params end (before cursor params)
  const baseParamCount = idx - 1; // params $1 through $(idx-1) are base params

  // Cursor pagination
  let cursorCondition = "";
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      if (decoded.n === null) {
        cursorCondition = `AND (up.display_name IS NULL AND up.user_id > $${idx++})`;
        queryParams.push(decoded.id);
      } else {
        cursorCondition = `AND (
          up.display_name > $${idx}
          OR (up.display_name = $${idx} AND up.user_id > $${idx + 1})
          OR up.display_name IS NULL
        )`;
        queryParams.push(decoded.n, decoded.id);
        idx += 2;
      }
    }
  }

  const whereWithCursor = `WHERE ${whereBase} ${cursorCondition}`;
  const whereWithoutCursor = `WHERE ${whereBase}`;

  const orderBy =
    sort === "proximity"
      ? `ORDER BY
          CASE
            WHEN up.home_city_id = (
              SELECT home_city_id FROM user_profiles WHERE user_id = $1
            ) THEN 0
            WHEN c.country_id = (
              SELECT c2.country_id FROM user_profiles up2
              LEFT JOIN cities c2 ON c2.id = up2.home_city_id
              WHERE up2.user_id = $1
            ) THEN 1
            ELSE 2
          END ASC,
          up.display_name ASC NULLS LAST,
          up.user_id ASC`
      : `ORDER BY up.display_name ASC NULLS LAST, up.user_id ASC`;

  const pageSize = Math.min(limit, 50);

  const joins = `
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    LEFT JOIN cities c
           ON c.id = up.home_city_id
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

  const countSql = `
    SELECT COUNT(DISTINCT up.user_id) AS cnt
    ${joins}
    ${whereWithoutCursor}
  `;

  const limitParam = idx;
  queryParams.push(pageSize + 1); // fetch one extra to detect next page
  idx++;

  const dataSql = `
    SELECT
      up.user_id,
      up.display_name,
      up.bio,
      c.name           AS home_city_name,
      up.home_city_id,
      c.country_id     AS home_country_id,
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
      up.user_id, up.display_name, up.bio,
      c.name, up.home_city_id, c.country_id,
      up.default_role, up.avatar_url, u.created_at,
      tp.badge_status,
      f_out.followee_id, f_in.follower_id
    ${orderBy}
    LIMIT $${limitParam}
  `;

  const countParams = queryParams.slice(0, baseParamCount);
  const [countResult, dataResult] = await Promise.all([
    db().query<{ cnt: string }>(countSql, countParams),
    db().query<DirectoryRow>(dataSql, queryParams),
  ]);

  const total = parseInt(countResult.rows[0].cnt, 10);
  const rows = dataResult.rows;
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? encodeCursor(lastRow.display_name, lastRow.user_id)
      : null;

  return {
    entries: pageRows.map(rowToEntry),
    nextCursor,
    total,
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
