import { describe, it, expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  teachersKeys,
  buildTeachersPath,
  teachersListOptions,
  teacherDetailOptions,
} from "../useTeachers";
import type { ApiClient } from "../../api/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockClient(): ApiClient {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
}

// ---------------------------------------------------------------------------
// teachersKeys
// ---------------------------------------------------------------------------

describe("teachersKeys", () => {
  it("returns the root key for all teachers", () => {
    expect(teachersKeys.all).toEqual(["teachers"]);
  });

  it("returns list keys without params", () => {
    expect(teachersKeys.list()).toEqual(["teachers", "list", {}]);
  });

  it("returns list keys with filter params", () => {
    const params = { specialty: "flow" as const, search: "yoga" };
    const key = teachersKeys.list(params);
    expect(key).toEqual(["teachers", "list", params]);
  });

  it("returns different keys for different params", () => {
    const key1 = teachersKeys.list({ specialty: "flow" });
    const key2 = teachersKeys.list({ specialty: "icarian" });
    expect(key1).not.toEqual(key2);
  });

  it("returns detail key for a given id", () => {
    expect(teachersKeys.detail("tchr-1")).toEqual([
      "teachers",
      "detail",
      "tchr-1",
    ]);
  });

  it("returns the details group key", () => {
    expect(teachersKeys.details()).toEqual(["teachers", "detail"]);
  });

  it("returns the lists group key", () => {
    expect(teachersKeys.lists()).toEqual(["teachers", "list"]);
  });
});

// ---------------------------------------------------------------------------
// buildTeachersPath
// ---------------------------------------------------------------------------

describe("buildTeachersPath", () => {
  it("returns base path with no params", () => {
    expect(buildTeachersPath()).toBe("/api/teachers");
  });

  it("returns base path for empty params", () => {
    expect(buildTeachersPath({})).toBe("/api/teachers");
  });

  it("encodes search as q", () => {
    const path = buildTeachersPath({ search: "yoga master" });
    expect(path).toContain("q=yoga+master");
  });

  it("encodes specialty param", () => {
    const path = buildTeachersPath({ specialty: "hand_to_hand" });
    expect(path).toBe("/api/teachers?specialty=hand_to_hand");
  });

  it("maps limit to pageSize", () => {
    const path = buildTeachersPath({ limit: 25 });
    expect(path).toContain("pageSize=25");
  });

  it("maps offset to page", () => {
    const path = buildTeachersPath({ offset: 3 });
    expect(path).toContain("page=3");
  });

  it("combines multiple params", () => {
    const path = buildTeachersPath({
      search: "test",
      specialty: "therapeutic",
      limit: 10,
      offset: 1,
    });
    expect(path).toContain("q=test");
    expect(path).toContain("specialty=therapeutic");
    expect(path).toContain("pageSize=10");
    expect(path).toContain("page=1");
  });
});

// ---------------------------------------------------------------------------
// teachersListOptions
// ---------------------------------------------------------------------------

describe("teachersListOptions", () => {
  it("returns correct queryKey without params", () => {
    const client = mockClient();
    const opts = teachersListOptions(client);
    expect(opts.queryKey).toEqual(teachersKeys.list());
  });

  it("returns correct queryKey with params", () => {
    const client = mockClient();
    const params = { specialty: "coaching" as const };
    const opts = teachersListOptions(client, params);
    expect(opts.queryKey).toEqual(teachersKeys.list(params));
  });

  it("queryFn calls client.get with correct path", async () => {
    const client = mockClient();
    const params = { specialty: "flow" as const };
    const opts = teachersListOptions(client, params);
    const queryClient = new QueryClient();

    await opts.queryFn!({
      client: queryClient,
      queryKey: teachersKeys.list(params),
      signal: new AbortController().signal,
      meta: undefined,
    });

    expect(client.get).toHaveBeenCalledWith("/api/teachers?specialty=flow");
  });
});

// ---------------------------------------------------------------------------
// teacherDetailOptions
// ---------------------------------------------------------------------------

describe("teacherDetailOptions", () => {
  it("returns correct queryKey", () => {
    const client = mockClient();
    const opts = teacherDetailOptions(client, "tchr-42");
    expect(opts.queryKey).toEqual(teachersKeys.detail("tchr-42"));
  });

  it("is disabled for empty id", () => {
    const client = mockClient();
    const opts = teacherDetailOptions(client, "");
    expect(opts.enabled).toBe(false);
  });

  it("is enabled for non-empty id", () => {
    const client = mockClient();
    const opts = teacherDetailOptions(client, "tchr-1");
    expect(opts.enabled).toBe(true);
  });

  it("queryFn calls client.get with encoded id", async () => {
    const client = mockClient();
    const opts = teacherDetailOptions(client, "tchr/special");
    const queryClient = new QueryClient();

    await opts.queryFn!({
      client: queryClient,
      queryKey: teachersKeys.detail("tchr/special"),
      signal: new AbortController().signal,
      meta: undefined,
    });

    expect(client.get).toHaveBeenCalledWith("/api/teachers/tchr%2Fspecial");
  });
});
