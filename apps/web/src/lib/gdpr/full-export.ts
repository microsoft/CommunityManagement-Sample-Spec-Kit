import { db } from "@/lib/db/client";
import { exportUserData as exportPermissionData } from "@/lib/gdpr/export";
import type { DataExportRow, ExportFileSchema, ExportStatus } from "@acroyoga/shared/types/community";

export async function requestExport(
  userId: string,
): Promise<{ exportId: string; status: ExportStatus }> {
  // Check for existing active export
  const active = await db().query(
    `SELECT 1 FROM data_exports WHERE user_id = $1 AND status IN ('pending','processing')`,
    [userId],
  );
  if (active.rows.length > 0) {
    throw new Error("An export is already in progress");
  }

  const result = await db().query<{ id: string; status: string }>(
    `INSERT INTO data_exports (user_id) VALUES ($1) RETURNING id, status`,
    [userId],
  );

  return {
    exportId: result.rows[0].id,
    status: result.rows[0].status as ExportStatus,
  };
}

export async function processExport(exportId: string): Promise<ExportFileSchema> {
  await db().query(
    `UPDATE data_exports SET status = 'processing' WHERE id = $1`,
    [exportId],
  );

  const exportRow = await db().query<{ user_id: string }>(
    `SELECT user_id FROM data_exports WHERE id = $1`,
    [exportId],
  );
  const userId = exportRow.rows[0].user_id;

  const profileResult = await db().query(
    `SELECT * FROM user_profiles WHERE user_id = $1`,
    [userId],
  );
  const profile = profileResult.rows.length > 0
    ? {
        id: profileResult.rows[0].id,
        userId: profileResult.rows[0].user_id,
        displayName: profileResult.rows[0].display_name,
        bio: profileResult.rows[0].bio,
        homeCityId: profileResult.rows[0].home_city_id,
        defaultRole: profileResult.rows[0].default_role,
        avatarUrl: profileResult.rows[0].avatar_url,
        createdAt: profileResult.rows[0].created_at,
        updatedAt: profileResult.rows[0].updated_at,
      }
    : null;

  const socialLinks = await db().query(
    `SELECT * FROM social_links WHERE user_id = $1`,
    [userId],
  );

  const rsvps = await db().query(
    `SELECT * FROM rsvps WHERE user_id = $1`,
    [userId],
  );

  const interests = await db().query(
    `SELECT * FROM event_interests WHERE user_id = $1`,
    [userId],
  );

  const credits = await db().query(
    `SELECT * FROM credits WHERE user_id = $1`,
    [userId],
  );

  const messages = await db().query(
    `SELECT * FROM messages WHERE author_id = $1 AND is_deleted = false`,
    [userId],
  );

  const followers = await db().query<{ follower_id: string }>(
    `SELECT follower_id FROM follows WHERE followee_id = $1`,
    [userId],
  );

  const following = await db().query<{ followee_id: string }>(
    `SELECT followee_id FROM follows WHERE follower_id = $1`,
    [userId],
  );

  const blocks = await db().query<{ blocked_id: string }>(
    `SELECT blocked_id FROM blocks WHERE blocker_id = $1`,
    [userId],
  );

  const mutes = await db().query<{ muted_id: string }>(
    `SELECT muted_id FROM mutes WHERE muter_id = $1`,
    [userId],
  );

  const exportData: ExportFileSchema = {
    profile,
    socialLinks: socialLinks.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      platform: r.platform,
      url: r.url,
      visibility: r.visibility,
    })),
    rsvps: rsvps.rows,
    eventInterests: interests.rows,
    credits: credits.rows,
    messagesAuthored: messages.rows,
    follows: {
      followers: followers.rows.map((r) => r.follower_id),
      following: following.rows.map((r) => r.followee_id),
    },
    blocks: blocks.rows.map((r) => r.blocked_id),
    mutes: mutes.rows.map((r) => r.muted_id),
  };

  // Also include permission data from Spec 004
  let permissionData;
  try {
    permissionData = await exportPermissionData(userId);
  } catch {
    permissionData = null;
  }

  await db().query(
    `UPDATE data_exports
     SET status = 'completed', completed_at = now(),
         expires_at = now() + interval '7 days'
     WHERE id = $1`,
    [exportId],
  );

  return exportData;
}

export async function getExports(userId: string): Promise<DataExportRow[]> {
  const result = await db().query<{
    id: string;
    user_id: string;
    status: string;
    file_url: string | null;
    expires_at: string | null;
    created_at: string;
    completed_at: string | null;
  }>(
    `SELECT * FROM data_exports WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );

  return result.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    status: r.status as ExportStatus,
    fileUrl: r.file_url,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  }));
}

export async function getExportById(
  exportId: string,
  userId: string,
): Promise<DataExportRow | null> {
  const result = await db().query<{
    id: string;
    user_id: string;
    status: string;
    file_url: string | null;
    expires_at: string | null;
    created_at: string;
    completed_at: string | null;
  }>(
    `SELECT * FROM data_exports WHERE id = $1 AND user_id = $2`,
    [exportId, userId],
  );

  if (result.rows.length === 0) return null;

  const r = result.rows[0];
  return {
    id: r.id,
    userId: r.user_id,
    status: r.status as ExportStatus,
    fileUrl: r.file_url,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}
