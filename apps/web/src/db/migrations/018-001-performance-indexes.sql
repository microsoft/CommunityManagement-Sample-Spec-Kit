-- ============================================================
-- Spec 018: Performance Indexes
-- No schema changes — indexes only.
-- IF NOT EXISTS makes these idempotent.
-- Note: CONCURRENTLY omitted for PGlite test compatibility;
-- in production PostgreSQL you may add CONCURRENTLY for non-blocking creation.
-- ============================================================

-- 1. Event list filtering: status + date range scan
-- Supports: listEvents() WHERE status = 'published' AND start_datetime >= ...
CREATE INDEX IF NOT EXISTS idx_events_status_start
  ON events (status, start_datetime);

-- 2. RSVP count aggregations (sub-selects inside listEvents)
-- Supports: SELECT COUNT(*) FROM rsvps WHERE event_id = $1 AND status IN (...)
CREATE INDEX IF NOT EXISTS idx_rsvps_event_status
  ON rsvps (event_id, status);

-- 3. Event interest count aggregation (sub-select inside listEvents)
-- Supports: SELECT COUNT(*) FROM event_interests WHERE event_id = $1
CREATE INDEX IF NOT EXISTS idx_event_interests_event_id
  ON event_interests (event_id);

-- 4. Teacher browse: non-deleted teachers sorted by badge status
-- Supports: listTeachers() WHERE is_deleted = false ORDER BY badge_status
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_active_badge
  ON teacher_profiles (is_deleted, badge_status);

-- 5. Directory alphabetical sort (default sort order)
-- Supports: listDirectory() ORDER BY display_name ASC NULLS LAST
CREATE INDEX IF NOT EXISTS idx_profiles_display_name
  ON user_profiles (display_name ASC NULLS LAST);
