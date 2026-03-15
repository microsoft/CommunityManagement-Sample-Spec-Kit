/**
 * API Contract: Certifications
 * Spec 005 — Certification CRUD, proof document management, expiry tracking
 *
 * Base path: /api/teachers/:teacherId/certifications
 */

// ─── Certification Types ────────────────────────────────────────────

export type CertificationStatus = 'pending' | 'verified' | 'expired' | 'revoked';

export interface Certification {
  id: string;
  teacherProfileId: string;
  name: string;
  issuingBody: string;
  expiryDate: string | null;    // ISO date
  status: CertificationStatus;
  /** Never contains proof document URL — admin-only access */
  hasProofDocument: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Admin view includes additional fields */
export interface CertificationAdminView extends Certification {
  verifiedByAdminId: string | null;
  /** Proof document accessible via GET .../proof endpoint (SAS URL) */
  proofDocumentMimeType: string | null;
}

// ─── GET /api/teachers/:teacherId/certifications — List certs ───────

export interface ListCertificationsResponse {
  certifications: Certification[];
}

/**
 * Auth: Public
 * Returns certifications for the teacher. No proof document URLs.
 * hasProofDocument: true/false indicates if a proof doc was uploaded.
 * Errors: 404 (teacher not found)
 */

// ─── POST /api/teachers/:teacherId/certifications — Add cert ────────

export interface AddCertificationRequest {
  name: string;                 // max 255 chars
  issuingBody: string;          // max 255 chars
  expiryDate?: string;          // ISO date, optional (null = no expiry)
}

export interface AddCertificationResponse {
  certification: Certification;
}

/**
 * Auth: Authenticated — must be the teacher profile owner
 * New certifications start with status = 'pending' until admin verifies.
 * Proof document uploaded separately via POST .../proof endpoint.
 *
 * Errors: 400 (validation), 403 (not owner), 404 (teacher not found)
 */

// ─── PATCH /api/teachers/:teacherId/certifications/:certId — Update ─

export interface UpdateCertificationRequest {
  name?: string;
  issuingBody?: string;
  expiryDate?: string | null;
}

export interface UpdateCertificationResponse {
  certification: Certification;
}

/**
 * Auth: Authenticated — must be the teacher profile owner
 * Updating an expired cert does NOT automatically re-verify — admin must re-approve.
 * Changing expiry_date to a future date on an expired cert: status remains 'expired'
 * until admin reviews.
 *
 * Errors: 400, 403 (not owner), 404
 */

// ─── DELETE /api/teachers/:teacherId/certifications/:certId — Remove ─

export interface DeleteCertificationResponse {
  deleted: true;
}

/**
 * Auth: Authenticated — must be the teacher profile owner OR scoped admin
 * Side effects: proof document blob hard-deleted from Azure Blob Storage.
 * If this was the teacher's last verified cert, badge_status may transition.
 *
 * Errors: 403, 404
 */

// ─── POST .../certifications/:certId/proof — Upload proof document ──

export interface RequestProofUploadResponse {
  /** SAS URL for uploading the proof document (write-only, 30-min expiry) */
  uploadUrl: string;
  /** Blob path where the document will be stored */
  blobPath: string;
  /** Expiry time of the SAS token */
  expiresAt: string;
}

/**
 * Auth: Authenticated — must be the teacher profile owner
 * Flow:
 *  1. Validate certification exists and belongs to caller
 *  2. Generate write-only SAS URL for blob path:
 *     teacher-proof-docs/{teacherProfileId}/{certId}/{filename}
 *  3. Return SAS URL to client
 *  4. Client uploads directly to Blob Storage using SAS URL
 *  5. Client calls PATCH .../certifications/:certId to confirm upload
 *
 * Accepted MIME types: image/jpeg, image/png, application/pdf
 * Max file size: 10 MB
 *
 * Errors: 403 (not owner), 404 (cert not found)
 */

// ─── GET .../certifications/:certId/proof — View proof document ─────

export interface GetProofDocumentResponse {
  /** SAS URL for reading the proof document (read-only, 15-min expiry) */
  downloadUrl: string;
  mimeType: string;
  expiresAt: string;
}

/**
 * Auth: Scoped admin ONLY (via withPermission('viewProofDocument', teacherScope))
 * Teachers can view their own proof docs.
 *
 * The response is NOT the document itself — it's a signed URL.
 * Client follows the URL to download/view the document.
 *
 * Errors: 403 (not admin or owner), 404 (cert or proof doc not found)
 */

// ─── GET /api/admin/certifications/expiring — Expiring certs ────────

export interface ListExpiringCertificationsQuery {
  daysUntilExpiry?: number;     // default: 30 — certs expiring within N days
  includeExpired?: boolean;     // default: true — include already-expired
  page?: number;
  pageSize?: number;
}

export interface ListExpiringCertificationsResponse {
  certifications: (CertificationAdminView & {
    teacherDisplayName: string;
    teacherCityName: string | null;
    daysUntilExpiry: number;    // negative = already expired
  })[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Auth: Scoped admin (sees certs within their geographic scope)
 * Sorted by expiry date ascending (most urgent first)
 *
 * Errors: 403 (not admin)
 */

// ─── PATCH /api/teachers/:teacherId/certifications/:certId/verify ───

export interface VerifyCertificationRequest {
  decision: 'verified' | 'revoked';
  reason?: string;
}

export interface VerifyCertificationResponse {
  certification: CertificationAdminView;
  /** If all certs now verified, teacher badge transitions to 'verified' */
  teacherBadgeStatus: string;
}

/**
 * Auth: Scoped admin
 * On verify: status → verified, verified_by_admin_id set
 * On revoke: status → revoked
 * Side effects: if this is the teacher's last verified cert and it's revoked/expired,
 * teacher badge_status may transition to 'expired' or 'revoked'.
 *
 * Errors: 403, 404, 409 (already in target status)
 */
