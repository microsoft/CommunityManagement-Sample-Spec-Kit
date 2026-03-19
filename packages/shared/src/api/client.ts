/**
 * Platform-agnostic API client for AcroYoga Community.
 * Works with any standards-compliant `fetch` (browser, Node 18+, React Native).
 */

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export class ApiResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.error);
    this.name = "ApiResponseError";
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Optional headers added to every request (e.g. auth tokens). */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
}

export function createApiClient(options: ApiClientOptions) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${options.baseUrl}${path}`;
    const extra = options.headers ? await options.headers() : {};

    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...extra,
      },
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      let parsed: ApiError;
      try {
        parsed = (await res.json()) as ApiError;
      } catch {
        parsed = { error: res.statusText || `HTTP ${res.status}` };
      }
      throw new ApiResponseError(res.status, parsed);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    return (await res.json()) as T;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
