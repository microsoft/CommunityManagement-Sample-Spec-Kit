/**
 * Auth Migration Contract — Spec 006
 *
 * Defines the authentication change applied to all 32+ routes
 * currently using header-based auth (x-user-id).
 *
 * No new endpoints are created. All changes are to the auth
 * mechanism of existing endpoints.
 */

// ── Before (vulnerable pattern, to be removed everywhere) ─────────

/**
 * @deprecated REMOVED by Spec 006. All routes using this pattern
 * must migrate to session-based auth.
 *
 * Pattern:
 *   const userId = request.headers.get('x-user-id');
 *   if (!userId) return 401;
 */
type HeaderAuthPattern = {
  /** Client-supplied header — spoofable, MUST NOT be trusted */
  source: 'x-user-id header';
  /** The header value is used directly as user identity */
  identity: string;
};

// ── After (secure pattern, applied to all routes) ─────────────────

/**
 * All protected routes MUST use one of these two patterns:
 *
 * 1. requireAuth() wrapper — for routes where auth is mandatory
 *    export const POST = requireAuth(async (request, { user }) => { ... });
 *
 * 2. getServerSession() — for routes with optional auth (e.g., public
 *    endpoints that show extra data for logged-in users)
 *    const session = await getServerSession();
 *    const userId = session?.user?.id; // may be null
 */
type SessionAuthPattern = {
  /** Server-verified session from next-auth / @auth/core */
  source: 'server-session';
  /** Identity resolved from encrypted session cookie — not spoofable */
  identity: string;
};

// ── Affected Routes ───────────────────────────────────────────────

/**
 * Routes requiring migration (grouped by spec):
 *
 * Spec 001 — Events, Venues, RSVPs, Cities, Credits:
 *   POST   /api/events
 *   PATCH  /api/events/[id]
 *   DELETE /api/events/[id]
 *   POST   /api/events/[id]/rsvp
 *   DELETE /api/events/[id]/rsvp
 *   GET    /api/events/[id]/rsvp/status
 *   POST   /api/venues
 *   PATCH  /api/venues/[id]
 *   DELETE /api/venues/[id]
 *   GET    /api/venues/mine
 *   POST   /api/credits/redeem
 *   GET    /api/credits/balance
 *
 * Spec 002 — Profiles, Follows, Threads, Messages, Safety:
 *   GET    /api/profiles/me
 *   PATCH  /api/profiles/me
 *   POST   /api/follows
 *   DELETE /api/follows/[id]
 *   GET    /api/follows/followers
 *   GET    /api/follows/following
 *   POST   /api/threads
 *   GET    /api/threads
 *   GET    /api/threads/[id]/messages
 *   POST   /api/threads/[id]/messages
 *   POST   /api/threads/[id]/messages/[msgId]/reactions
 *   POST   /api/safety/block
 *   DELETE /api/safety/block/[id]
 *   POST   /api/safety/report
 *
 * Spec 003 — Bookings, Recurrence:
 *   POST   /api/bookings
 *   DELETE /api/bookings/[id]
 *   GET    /api/bookings/mine
 *   POST   /api/events/[id]/recurrence
 *   PATCH  /api/events/[id]/recurrence
 *
 * Note: Spec 004 and 005 routes already use requireAuth()
 *       or withPermission() — no changes needed.
 */

// ── Response contract (unchanged) ─────────────────────────────────

/** 401 response when no valid session exists */
interface AuthErrorResponse {
  error: string;    // "Unauthorized"
  code: string;     // "UNAUTHORIZED"
}

/**
 * Migration does NOT change any successful response shapes.
 * All existing API contracts remain identical — only the auth
 * mechanism changes from header to session.
 */
