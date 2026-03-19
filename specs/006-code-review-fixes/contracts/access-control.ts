/**
 * Ownership & Admin Access Control Contract — Spec 006
 *
 * Defines the access control changes to existing endpoints.
 * No new endpoints are created.
 */

// ── Ownership Check: Teacher Profile Mutations ────────────────────

/**
 * PATCH /api/teachers/[id]
 * DELETE /api/teachers/[id]
 *
 * Added check: authenticated user must be the profile owner
 * (teacher_profiles.user_id === session.user.id) OR hold an
 * admin scope grant covering the profile's city.
 *
 * Returns 403 Forbidden if neither condition is met.
 */
interface OwnershipCheckContract {
  /** The resource being accessed */
  resource: 'teacher_profiles';
  /** Field that identifies the owner */
  ownerField: 'user_id';
  /** Fallback: admin with scope covering the profile's city */
  adminOverride: {
    role: 'admin';
    scopeField: 'city_id';
  };
  /** Response when caller is not owner and not admin */
  deniedResponse: {
    status: 403;
    body: {
      error: 'Forbidden';
      code: 'FORBIDDEN';
      details: 'Not the profile owner';
    };
  };
}

// ── Admin Permission Check: Privileged Endpoints ──────────────────

/**
 * The following endpoints MUST be wrapped with withPermission('admin'):
 *
 * 1. PATCH /api/teachers/[id]/certifications/[certId]/verify
 *    - Admin verifies a teacher's certification
 *
 * 2. PATCH /api/reviews/[id]/moderate
 *    - Admin moderates (approves/rejects) a review
 *
 * 3. GET /api/teachers/requests/pending
 *    - Admin views pending teacher applications
 *
 * 4. GET /api/teachers/certifications/expiring
 *    - Admin views certifications expiring within 30 days
 *
 * All four currently use requireAuth() only — insufficient
 * for admin operations per Constitution Principle IX.
 */
interface AdminCheckContract {
  /** Middleware wrapper applied to the handler */
  middleware: 'withPermission';
  /** Required role */
  requiredRole: 'admin';
  /** Response when caller lacks admin role */
  deniedResponse: {
    status: 403;
    body: {
      error: 'Forbidden';
      code: 'FORBIDDEN';
      details: 'Insufficient permissions';
    };
  };
}

// ── Error Response Shape (shared, not new) ────────────────────────

/**
 * All 403 responses MUST use the shared error helpers from
 * @/lib/errors to produce this shape:
 */
interface StandardErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}
