// Shared Request Types — per contracts/requests-api.ts

export type RequestStatus = "pending" | "approved" | "rejected";

export interface PermissionRequest {
  id: string;
  userId: string;
  requestedRole: "event_creator";
  scopeType: "city";
  scopeValue: string;
  message: string | null;
  status: RequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  createdAt: string;
}

export interface SubmitRequestBody {
  scopeValue: string;
  message?: string;
}

export interface SubmitRequestResponse {
  request: PermissionRequest;
}

export interface ListRequestsQuery {
  status?: RequestStatus;
  scopeType?: "city";
  scopeValue?: string;
  userId?: string;
}

export interface ListRequestsResponse {
  requests: PermissionRequest[];
  total: number;
}

export interface ReviewRequestBody {
  decision: "approved" | "rejected";
  reason?: string;
}

export interface ReviewRequestResponse {
  request: PermissionRequest;
  grant?: {
    id: string;
    role: "event_creator";
    scopeType: "city";
    scopeValue: string;
  };
}
