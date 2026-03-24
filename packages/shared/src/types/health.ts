/** Health check response shape (liveness probe) */
export interface HealthResponse {
  status: "healthy";
  version: string;
  timestamp: string;
}

/** Readiness check response shape (readiness probe) */
export interface ReadinessResponse {
  status: "ready" | "not_ready";
  checks: {
    database: string;
    storage: string;
  };
  timestamp: string;
}
