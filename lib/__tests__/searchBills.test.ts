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

// ── Search: GovInfo full text, and bill numbers on Congress.gov ──

/** One GovInfo search result: a printed version of a bill. */
function govInfoResult(packageId: string, title: string, dateIssued: string) {
  return { packageId, title, dateIssued, collectionCode: "BILLS" };
}

/**
 * Serves GovInfo's search (POST /search) with `results`, and Congress.gov
 * bill lookups (GET /v3/bill/{congress}/{type}/{number}) from `bills`.
 */
function serveSearch({
  results = [],
  bills = {},
  status = 200,
}: { results?: unknown[]; bills?: Record<string, unknown>; status?: number } = {}) {
  const fetchMock = vi.fn<FakeFetch>(async (input) => {
    const url = new URL(input);
    if (url.searchParams.get("api_key") !== API_KEY) {
      return { ok: false, status: 403, json: async () => ({ error: "API_KEY_INVALID" }) };
    }
    if (url.host === "api.govinfo.gov") {
      if (status !== 200) return { ok: false, status, json: async () => ({ message: "Search failed" }) };
      return { ok: true, status: 200, json: async () => ({ count: results.length, results }) };
    }
    const path = url.pathname.replace("/v3/bill/", "");
    if (path.endsWith("/summaries")) return { ok: true, status: 200, json: async () => ({ summaries: [] }) };
    const bill = bills[path];
    return bill
      ? { ok: true, status: 200, json: async () => ({ bill }) }
      : { ok: false, status: 404, json: async () => ({ error: "Unknown resource" }) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const govInfoQuery = (fetchMock: ReturnType<typeof serveSearch>) =>
  JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).query;

describe("searchBills with a query", () => {
  it("searches bill text and lists each bill once, in GovInfo's ranking, with its newest version as its status", async () => {
    serveSearch({
      results: [
        govInfoResult("BILLS-119hr10227ih", "Improving Needed Safeguards for Users of Lifesaving Insulin Now Act of 2026; INSULIN Act of 2026", "2026-09-02"),
        govInfoResult("BILLS-119s4189is", "Improving Needed Safeguards for Users of Lifesaving Insulin Now Act of 2026; INSULIN Act of 2026", "2026-03-25"),
        govInfoResult("BILLS-119s4189rs", "Improving Needed Safeguards for Users of Lifesaving Insulin Now Act of 2026; INSULIN Act of 2026", "2026-08-07"),
        govInfoResult("BILLS-119s4512is", "Affordable Insulin Now Act of 2026", "2026-05-13"),
      ],
    });

    const results = await searchBills("insulin");

    expect(results).toMatchObject([
      {
        bill_id: "hr10227-119",
        bill_slug: "hr10227",
        bill_type: "hr",
        congress: "119",
        title: "Improving Needed Safeguards for Users of Lifesaving Insulin Now Act of 2026",
        latest_major_action: "Introduced in the House",
        latest_major_action_date: "2026-09-02",
      },
      { bill_slug: "s4189", bill_type: "s", latest_major_action: "Reported in the Senate", latest_major_action_date: "2026-08-07" },
      { bill_slug: "s4512", title: "Affordable Insulin Now Act of 2026", latest_major_action: "Introduced in the Senate" },
    ]);
  });

  it("puts bills named for the search ahead of bills that only mention it", async () => {
    serveSearch({
      results: [
        govInfoResult("BILLS-119hr9679ih", "Recovery, Enforcement, and Damages to Assure Confidential Treatment Act", "2026-07-15"),
        govInfoResult("BILLS-119s2557is", "Epstein Files Transparency Act", "2025-07-30"),
        govInfoResult("BILLS-119s2746is", "Produce Epstein Treasury Records Act", "2025-09-09"),
        govInfoResult("BILLS-119hr4405ih", "Epstein Files Transparency Act", "2025-07-15"),
      ],
    });

    const results = await searchBills("Epstein files");

    expect(results.map((b) => b.bill_slug)).toEqual(["s2557", "hr4405", "s2746", "hr9679"]);
  });

  it("searches only this Congress's bills, dropping punctuation that GovInfo's query syntax rejects", async () => {
    const fetchMock = serveSearch();

    await searchBills('weird: (input "unbalanced');

    expect(govInfoQuery(fetchMock)).toBe("collection:BILLS AND congress:119 AND (weird input unbalanced)");
  });

  it('keeps "quoted phrases" and treats AND, OR, and NOT as plain words', async () => {
    const fetchMock = serveSearch();

    await searchBills('"Farm Bill" NOT tax');

    expect(govInfoQuery(fetchMock)).toBe('collection:BILLS AND congress:119 AND ("farm bill" not tax)');
  });

  it("returns no bills for a search with no searchable words, without calling GovInfo", async () => {
    const fetchMock = serveSearch();

    expect(await searchBills("?!: ()")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["H.R. 725", "hr725", "HR 725"])("looks up %s on Congress.gov instead of searching text", async (query) => {
    const fetchMock = serveSearch({
      bills: {
        "119/hr/725": {
          title: "Protect Children's Innocence Act",
          introducedDate: "2025-01-23",
          latestAction: { text: "Referred to the House Committee on the Judiciary.", actionDate: "2025-01-23" },
        },
      },
    });

    const results = await searchBills(query);

    expect(results).toMatchObject([
      {
        bill_slug: "hr725",
        title: "Protect Children's Innocence Act",
        latest_major_action: "Referred to the House Committee on the Judiciary.",
      },
    ]);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("govinfo"))).toBe(false);
    // A bill number has one result, so there's no second page.
    expect(await searchBills(query, 20)).toEqual([]);
  });

  it("finds nothing for a bill number that doesn't exist", async () => {
    serveSearch();

    expect(await searchBills("S. 99999")).toEqual([]);
  });

  it("pages through one cached set of results", async () => {
    const fetchMock = serveSearch({
      results: Array.from({ length: 30 }, (_, i) =>
        govInfoResult(`BILLS-119hr${i + 1}ih`, `Broadband Act ${i + 1}`, "2026-01-01")
      ),
    });

    const first = await searchBills("broadband");
    const second = await searchBills("broadband", 20);

    expect(first).toHaveLength(20);
    expect(titles(second)).toEqual(Array.from({ length: 10 }, (_, i) => `Broadband Act ${i + 21}`));
    const [firstCall, secondCall] = fetchMock.mock.calls;
    expect(secondCall[1]?.body).toBe(firstCall[1]?.body);
    expect(firstCall[1]).toMatchObject({ method: "POST", next: { revalidate: 600 } });
  });

  it("fails when GovInfo does, so the search page can say search is unavailable", async () => {
    serveSearch({ status: 500 });

    await expect(searchBills("insulin")).rejects.toThrow("500");
  });
});
