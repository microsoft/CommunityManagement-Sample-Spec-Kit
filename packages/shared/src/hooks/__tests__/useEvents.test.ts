import { describe, it, expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  eventsKeys,
  buildEventsPath,
  eventsListOptions,
  eventDetailOptions,
} from "../useEvents";
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
// eventsKeys
// ---------------------------------------------------------------------------

describe("eventsKeys", () => {
  it("returns the root key for all events", () => {
    expect(eventsKeys.all).toEqual(["events"]);
  });

  it("returns list keys without params", () => {
    expect(eventsKeys.list()).toEqual(["events", "list", {}]);
  });

  it("returns list keys with filter params", () => {
    const params = { category: "jam" as const, search: "acro" };
    const key = eventsKeys.list(params);
    expect(key).toEqual(["events", "list", params]);
  });

  it("returns different keys for different params", () => {
    const key1 = eventsKeys.list({ category: "jam" });
    const key2 = eventsKeys.list({ category: "workshop" });
    expect(key1).not.toEqual(key2);
  });

  it("returns detail key for a given id", () => {
    expect(eventsKeys.detail("evt-123")).toEqual([
      "events",
      "detail",
      "evt-123",
    ]);
  });

  it("returns the details group key", () => {
    expect(eventsKeys.details()).toEqual(["events", "detail"]);
  });

  it("returns the lists group key", () => {
    expect(eventsKeys.lists()).toEqual(["events", "list"]);
  });
});

// ---------------------------------------------------------------------------
// buildEventsPath
// ---------------------------------------------------------------------------

describe("buildEventsPath", () => {
  it("returns base path with no params", () => {
    expect(buildEventsPath()).toBe("/api/events");
  });

  it("returns base path for empty params", () => {
    expect(buildEventsPath({})).toBe("/api/events");
  });

  it("encodes category param", () => {
    const path = buildEventsPath({ category: "workshop" });
    expect(path).toBe("/api/events?category=workshop");
  });

  it("encodes search param as q", () => {
    const path = buildEventsPath({ search: "acro flow" });
    expect(path).toContain("q=acro+flow");
  });

  it("maps limit to pageSize", () => {
    const path = buildEventsPath({ limit: 20 });
    expect(path).toContain("pageSize=20");
  });

  it("maps offset to page", () => {
    const path = buildEventsPath({ offset: 2 });
    expect(path).toContain("page=2");
  });

  it("includes dateFrom when upcoming is true", () => {
    const path = buildEventsPath({ upcoming: true });
    expect(path).toMatch(/dateFrom=\d{4}-\d{2}-\d{2}/);
  });

  it("does not include dateFrom when upcoming is false", () => {
    const path = buildEventsPath({ upcoming: false });
    expect(path).toBe("/api/events");
  });

  it("combines multiple params", () => {
    const path = buildEventsPath({
      category: "jam",
      search: "test",
      limit: 10,
      offset: 0,
    });
    expect(path).toContain("category=jam");
    expect(path).toContain("q=test");
    expect(path).toContain("pageSize=10");
    expect(path).toContain("page=0");
  });
});

// ---------------------------------------------------------------------------
// eventsListOptions
// ---------------------------------------------------------------------------

describe("eventsListOptions", () => {
  it("returns correct queryKey without params", () => {
    const client = mockClient();
    const opts = eventsListOptions(client);
    expect(opts.queryKey).toEqual(eventsKeys.list());
  });

  it("returns correct queryKey with params", () => {
    const client = mockClient();
    const params = { category: "festival" as const };
    const opts = eventsListOptions(client, params);
    expect(opts.queryKey).toEqual(eventsKeys.list(params));
  });

  it("queryFn calls client.get with correct path", async () => {
    const client = mockClient();
    const params = { category: "jam" as const };
    const opts = eventsListOptions(client, params);
    const queryClient = new QueryClient();

    await opts.queryFn!({
      client: queryClient,
      queryKey: eventsKeys.list(params),
      signal: new AbortController().signal,
      meta: undefined,
    });

    expect(client.get).toHaveBeenCalledWith("/api/events?category=jam");
  });
});

// ---------------------------------------------------------------------------
// eventDetailOptions
// ---------------------------------------------------------------------------

describe("eventDetailOptions", () => {
  it("returns correct queryKey", () => {
    const client = mockClient();
    const opts = eventDetailOptions(client, "evt-42");
    expect(opts.queryKey).toEqual(eventsKeys.detail("evt-42"));
  });

  it("is disabled for empty id", () => {
    const client = mockClient();
    const opts = eventDetailOptions(client, "");
    expect(opts.enabled).toBe(false);
  });

  it("is enabled for non-empty id", () => {
    const client = mockClient();
    const opts = eventDetailOptions(client, "evt-1");
    expect(opts.enabled).toBe(true);
  });

  it("queryFn calls client.get with encoded id", async () => {
    const client = mockClient();
    const opts = eventDetailOptions(client, "evt/special");
    const queryClient = new QueryClient();

    await opts.queryFn!({
      client: queryClient,
      queryKey: eventsKeys.detail("evt/special"),
      signal: new AbortController().signal,
      meta: undefined,
    });

    expect(client.get).toHaveBeenCalledWith("/api/events/evt%2Fspecial");
  });
});
