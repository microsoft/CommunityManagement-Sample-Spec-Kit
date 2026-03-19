/**
 * API Contract: Concession Status
 * Spec 003 — User concession status application, admin approval, checkout integration
 *
 * Base paths:
 *   /api/concessions
 *   /api/concessions/me
 *   /api/admin/concessions
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ConcessionStatusValue = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface ConcessionStatus {
  id: string;
  userId: string;
  status: ConcessionStatusValue;
  evidenceNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;      // ISO 8601
  rejectedBy: string | null;
  rejectedAt: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── POST /api/concessions/me — Apply for concession status ────────

export interface ApplyConcessionRequest {
  /** Description of concession eligibility (e.g., student ID, disability) */
  evidenceNotes?: string;
}

export interface ApplyConcessionResponse {
  concession: ConcessionStatus;
}

/**
 * Auth: Authenticated member.
 * Validation:
 *   - User must not already have a pending or approved concession status
 *   - Users with rejected/revoked status MAY reapply (creates a new record)
 * Errors: 403 (not authenticated), 409 (already pending/approved)
 */

// ─── GET /api/concessions/me — Get own concession status ────────────

export interface GetMyConcessionResponse {
  /** Current active concession status, or null if none */
  concession: ConcessionStatus | null;
  /** History of all concession applications */
  history: ConcessionStatus[];
}

/** Auth: Authenticated member. */

// ─── GET /api/admin/concessions — List concession applications (admin)

export interface ListConcessionsQuery {
  status?: ConcessionStatusValue;
  page?: number;
  pageSize?: number;               // default 20
}

export interface ListConcessionsResponse {
  concessions: ConcessionStatusWithUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConcessionStatusWithUser extends ConcessionStatus {
  userDisplayName: string;
  userEmail: string;
  userHomeCity: string | null;
}

/**
 * Auth: City Admin or higher (via withPermission('approveConcession', scope)).
 * Returns concession applications for users within the admin's scope.
 * Errors: 403
 */

// ─── PATCH /api/admin/concessions/:id — Approve/reject/revoke ──────

export type ConcessionAction = 'approve' | 'reject' | 'revoke';

export interface ReviewConcessionRequest {
  action: ConcessionAction;
  reason?: string;                 // optional admin note
}

export interface ReviewConcessionResponse {
  concession: ConcessionStatus;
}

/**
 * Auth: City Admin or higher (via withPermission('approveConcession', scope)).
 * State transitions:
 *   pending → approved  (action = 'approve')
 *   pending → rejected  (action = 'reject')
 *   approved → revoked  (action = 'revoke')
 * Invalid transitions return 422.
 * Errors: 403, 404, 422 (invalid state transition)
 */

// ─── Internal: Concession check at checkout ─────────────────────────

/**
 * Not a public endpoint. Used by RSVP service (Spec 001) and booking service
 * (Spec 003) during checkout.
 *
 * Logic:
 *   1. Query: SELECT id FROM concession_statuses
 *             WHERE user_id = $userId AND status = 'approved' LIMIT 1
 *   2. If found AND ticket/event has non-null concession_cost → apply concession tier
 *   3. Otherwise → standard tier
 */
export interface ConcessionCheckResult {
  eligible: boolean;
  concessionStatusId: string | null;
}
