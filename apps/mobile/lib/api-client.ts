/**
 * Typed API client for mobile app
 * Spec: 016-mobile-app (T010)
 *
 * Provides authenticated HTTP methods with automatic JWT injection,
 * 401 interception with token refresh, and typed responses.
 */
import { getToken, refreshToken, signOut } from "./auth";

export interface ApiClientConfig {
  baseUrl: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

let _config: ApiClientConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
};

/**
 * Configure the API client base URL
 */
export function configureApiClient(config: Partial<ApiClientConfig>): void {
  _config = { ..._config, ...config };
}

/**
 * Get current API client config (useful for tests)
 */
export function getApiClientConfig(): ApiClientConfig {
  return { ..._config };
}

/**
 * Internal fetch with JWT header injection and 401 retry
 */
async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${_config.baseUrl}${path}`;
  const response = await fetch(url, { ...options, headers });

  // 401 — attempt token refresh once
  if (response.status === 401 && !retried && token) {
    const refreshed = await refreshToken(_config.baseUrl);
    if (refreshed) {
      return authenticatedFetch(path, options, true);
    }
    // Refresh failed — sign out
    await signOut();
  }

  return response;
}

/**
 * Parse response into ApiResponse shape
 */
async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const body = await response.json();
    if (!response.ok) {
      return {
        data: null,
        error: body.error ?? `Request failed with status ${response.status}`,
        status: response.status,
      };
    }
    return { data: body as T, error: null, status: response.status };
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Unknown parse error";
    return {
      data: null,
      error: `Response parse error (status ${response.status}): ${detail}`,
      status: response.status,
    };
  }
}

/**
 * HTTP GET with typed response
 */
export async function get<T>(
  path: string,
  params?: Record<string, string>,
): Promise<ApiResponse<T>> {
  const url = params
    ? `${path}?${new URLSearchParams(params).toString()}`
    : path;
  const response = await authenticatedFetch(url);
  return parseResponse<T>(response);
}

/**
 * HTTP POST with typed request/response
 */
export async function post<T>(
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await authenticatedFetch(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(response);
}

/**
 * HTTP PUT with typed request/response
 */
export async function put<T>(
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await authenticatedFetch(path, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(response);
}

/**
 * HTTP DELETE with typed response
 */
export async function del<T>(path: string): Promise<ApiResponse<T>> {
  const response = await authenticatedFetch(path, { method: "DELETE" });
  return parseResponse<T>(response);
}
