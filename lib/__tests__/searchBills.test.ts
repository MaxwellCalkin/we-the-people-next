import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchBills } from "../congress";

// Congress.gov is an external API, not our DB, so a fake stands in for it.
const API_KEY = "test-key";

type FakeFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

function apiBill(number: number, actionDate: string) {
  return {
    type: "HR",
    number: String(number),
    congress: 119,
    title: `Bill ${number}`,
    introducedDate: "2025-02-01",
    latestAction: { actionDate, text: "Referred to committee." },
  };
}

/**
 * Serves /v3/bill/{congress} the way Congress.gov does: `limit` bills from
 * `offset` of a list ordered by update time, never by action date.
 */
function serveLatestBills(byUpdateTime: unknown[], { status = 200 } = {}) {
  const fetchMock = vi.fn<FakeFetch>(async (input) => {
    const url = new URL(input);
    if (status !== 200 || url.searchParams.get("api_key") !== API_KEY) {
      return { ok: false, status: status === 200 ? 403 : status, json: async () => ({ error: "unavailable" }) };
    }
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 250);
    return { ok: true, status: 200, json: async () => ({ bills: byUpdateTime.slice(offset, offset + limit) }) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const titles = (bills: { title: string }[]) => bills.map((b) => b.title);

beforeEach(() => {
  vi.stubEnv("CONGRESS_KEY", API_KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("searchBills without a query (the Newest tab)", () => {
  it("lists the latest bills newest action first, though Congress.gov orders them by update time", async () => {
    serveLatestBills([
      apiBill(1, "2025-01-16"),
      apiBill(2, "2026-10-15"),
      apiBill(3, "2026-04-22"),
    ]);

    expect(titles(await searchBills(null))).toEqual(["Bill 2", "Bill 3", "Bill 1"]);
  });

  it("serves every page of the first 240 bills from one sorted batch, so pages never overlap or skip", async () => {
    // Action dates scattered across 2025-2026, in update-time order.
    const byUpdateTime = Array.from({ length: 300 }, (_, i) =>
      apiBill(i + 1, `202${5 + (i % 2)}-${String((i * 7) % 12 + 1).padStart(2, "0")}-${String((i * 11) % 28 + 1).padStart(2, "0")}`)
    );
    const fetchMock = serveLatestBills(byUpdateTime);

    const pages = [];
    for (let offset = 0; offset < 240; offset += 20) pages.push(await searchBills(null, offset));
    const listed = pages.flat();

    expect(pages.every((page) => page.length === 20)).toBe(true);
    expect(new Set(titles(listed)).size).toBe(240);
    const dates = listed.map((b) => b.latest_major_action_date);
    expect(dates).toEqual([...dates].sort().reverse());
    // Every page came from the same request for the first 240 bills.
    const batches = new Set(fetchMock.mock.calls.map(([url]) => new URL(url).searchParams.get("offset")));
    expect([...batches]).toEqual(["0"]);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("limit")).toBe("240");
  });

  it("starts the next batch of 240 for the bills after that", async () => {
    const fetchMock = serveLatestBills(Array.from({ length: 300 }, (_, i) => apiBill(i + 1, "2026-01-01")));

    const page = await searchBills(null, 240);

    expect(titles(page)).toEqual(Array.from({ length: 20 }, (_, i) => `Bill ${241 + i}`));
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("offset")).toBe("240");
  });

  it("asks Next to cache each batch for ten minutes instead of refetching on every scroll", async () => {
    const fetchMock = serveLatestBills([apiBill(1, "2026-10-15")]);

    await searchBills(null);

    expect(fetchMock.mock.calls[0][1]).toEqual({ next: { revalidate: 600 } });
  });

  it("fails when Congress.gov does, so the list can offer a retry instead of ending early", async () => {
    serveLatestBills([apiBill(1, "2026-10-15")], { status: 503 });

    await expect(searchBills(null, 20)).rejects.toThrow("503");
  });
});
