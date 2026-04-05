import { queryOptions, useQuery } from "@tanstack/react-query";
import type { ApiClient } from "../api/client";
import type {
  TeacherProfile,
  TeacherProfileDetail,
  TeacherSpecialty,
} from "../types/teachers";

// ---------------------------------------------------------------------------
// Filter params
// ---------------------------------------------------------------------------

export interface TeachersFilterParams {
  search?: string;
  specialty?: TeacherSpecialty;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Response type (mirrors paginated API contract)
// ---------------------------------------------------------------------------

export interface ListTeachersResponse {
  teachers: TeacherProfile[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Query-key factory
// ---------------------------------------------------------------------------

export const teachersKeys = {
  all: ["teachers"] as const,
  lists: () => [...teachersKeys.all, "list"] as const,
  list: (params?: TeachersFilterParams) =>
    [...teachersKeys.lists(), params ?? {}] as const,
  details: () => [...teachersKeys.all, "detail"] as const,
  detail: (id: string) => [...teachersKeys.details(), id] as const,
} as const;

// ---------------------------------------------------------------------------
// Path builder (exported for testing)
// ---------------------------------------------------------------------------

export function buildTeachersPath(params?: TeachersFilterParams): string {
  if (!params) return "/api/teachers";

  const entries: [string, string][] = [];

  if (params.search) entries.push(["q", params.search]);
  if (params.specialty) entries.push(["specialty", params.specialty]);
  if (params.limit !== undefined)
    entries.push(["pageSize", String(params.limit)]);
  if (params.offset !== undefined)
    entries.push(["page", String(params.offset)]);

  if (entries.length === 0) return "/api/teachers";

  const searchParams = new URLSearchParams(entries);
  return `/api/teachers?${searchParams.toString()}`;
}

// ---------------------------------------------------------------------------
// Query-option factories
// ---------------------------------------------------------------------------

export function teachersListOptions(
  client: ApiClient,
  params?: TeachersFilterParams,
) {
  return queryOptions({
    queryKey: teachersKeys.list(params),
    queryFn: () => client.get<ListTeachersResponse>(buildTeachersPath(params)),
  });
}

export function teacherDetailOptions(client: ApiClient, id: string) {
  return queryOptions({
    queryKey: teachersKeys.detail(id),
    queryFn: () =>
      client.get<TeacherProfileDetail>(
        `/api/teachers/${encodeURIComponent(id)}`,
      ),
    enabled: id.length > 0,
  });
}

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

export function useTeachers(
  client: ApiClient,
  params?: TeachersFilterParams,
) {
  return useQuery(teachersListOptions(client, params));
}

export function useTeacherDetail(client: ApiClient, id: string) {
  return useQuery(teacherDetailOptions(client, id));
}
