/**
 * API Contract: Permission Requests
 * Spec 004 — Self-service Event Creator role requests with admin approval
 *
 * Base path: /api/permissions/requests
 */

import type { Scope } from './permissions-api';

// ─── Types ──────────────────────────────────────────────────────────

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface PermissionRequest {
  id: string;
  userId: string;
  requestedRole: 'event_creator';
  scopeType: 'city';
  scopeValue: string;
  message: string | null;
  status: RequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null; // ISO 8601
  reviewReason: string | null;
  createdAt: string; // ISO 8601
}

// ─── POST /api/permissions/requests — Submit a request ──────────────

export interface SubmitRequestBody {
  scopeValue: string; // city key (must exist in geography table)
  message?: string;   // optional message to admins
}

export interface SubmitRequestResponse {
  request: PermissionRequest;
}

/** Errors: 400 (invalid city), 403 (not authenticated), 409 (pending request already exists for this scope) */

// ─── GET /api/permissions/requests — List requests ──────────────────

export interface ListRequestsQuery {
  status?: RequestStatus;  // filter by status (default: 'pending' for admin view)
  scopeType?: 'city';
  scopeValue?: string;     // filter by city
  userId?: string;         // filter by requester (for user's own requests)
}

export interface ListRequestsResponse {
  requests: PermissionRequest[];
  total: number;
}

// ─── PATCH /api/permissions/requests/:id — Approve or reject ────────

export interface ReviewRequestBody {
  decision: 'approved' | 'rejected';
  reason?: string; // required for rejection, optional for approval
}

export interface ReviewRequestResponse {
  request: PermissionRequest; // updated status
  grant?: {
    id: string;
    role: 'event_creator';
    scopeType: 'city';
    scopeValue: string;
  }; // included only when approved — the created grant
}

/** Errors: 400 (invalid decision), 403 (caller not admin for scope), 404, 409 (already reviewed) */
