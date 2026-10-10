import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRepresentatives } from "../congress";

// Congress.gov is an external API, not our DB, so a fake stands in for it.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const API_KEY = "test-key";

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubEnv("CONGRESS_KEY", API_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── Fake Congress.gov ────────────────────────────────────

/**
 * Serves /member/{state} and /member/{state}/{district} the way Congress.gov
 * pages list results: 20 per page unless `limit` asks for more, never more
 * than `maxPageSize`, with a `pagination.next` link while members remain.
 * Like the real API, it rejects any request whose api_key isn't exactly
 * right. It reads the URL the way fetch does, so a raw string gets the
 * WHATWG URL parser's cleanup.
 */
function serveMembers(
  membersByPath: Record<string, unknown[]>,
  { maxPageSize = 250 } = {}
) {
  mockFetch.mockImplementation(async (input: string | URL) => {
    const url = new URL(input);
    if (url.searchParams.get("api_key") !== API_KEY) {
      return {
        ok: false,
        json: async () => ({
          error: { code: "API_KEY_INVALID", message: "An invalid api_key was supplied." },
        }),
      };
    }
    const members = membersByPath[url.pathname.replace("/v3/member/", "")] ?? [];
    const limit = Math.min(
      Number(url.searchParams.get("limit") ?? 20),
      maxPageSize
    );
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const end = offset + limit;
    return {
      ok: true,
      json: async () => ({
        members: members.slice(offset, end),
        pagination: {
          count: members.length,
          ...(end < members.length && {
            next: `${url.origin}${url.pathname}?offset=${end}&limit=${limit}&format=json`,
          }),
        },
      }),
    };
  });
}

function houseMember(bioguideId: string, name: string, district: number) {
  return {
    bioguideId,
    name,
    district,
    terms: { item: [{ chamber: "House of Representatives", startYear: 2023 }] },
  };
}

function senator(bioguideId: string, name: string) {
  return {
    bioguideId,
    name,
    terms: { item: [{ chamber: "Senate", startYear: 2021 }] },
  };
}

// ── Tests ────────────────────────────────────────────────

describe("fetchRepresentatives", () => {
  it.each([
    { maxPageSize: 250, label: "serves the requested page size" },
    { maxPageSize: 20, label: "only serves its default page size of 20" },
  ])(
    "finds both senators in a state with more members than one page when the API $label",
    async ({ maxPageSize }) => {
      // California: 52 House members listed ahead of its 2 senators.
      const houseMembers = Array.from({ length: 52 }, (_, i) =>
        houseMember(`H${i + 1}`, `Rep ${i + 1}`, i + 1)
      );
      serveMembers(
        {
          CA: [
            ...houseMembers,
            senator("S1", "Senator One"),
            senator("S2", "Senator Two"),
          ],
          "CA/12": [houseMember("H12", "Rep 12", 12)],
        },
        { maxPageSize }
      );

      const { senators, houseRep } = await fetchRepresentatives("ca", "12");

      expect(senators.map((s) => s.name)).toEqual([
        "Senator One",
        "Senator Two",
      ]);
      expect(houseRep?.name).toBe("Rep 12");
    }
  );

  it("does not mistake an at-large House member (district 0) for a senator", async () => {
    serveMembers({
      VT: [
        houseMember("H1", "At-Large Rep", 0),
        senator("S1", "Senator One"),
        senator("S2", "Senator Two"),
      ],
      "VT/0": [houseMember("H1", "At-Large Rep", 0)],
    });

    const { senators, houseRep } = await fetchRepresentatives("vt", "0");

    expect(senators.map((s) => s.name)).toEqual([
      "Senator One",
      "Senator Two",
    ]);
    expect(houseRep?.name).toBe("At-Large Rep");
  });

  it("treats a senator who used to serve in the House as a senator, not as the district's House member", async () => {
    const formerRepNowSenator = {
      bioguideId: "S1",
      name: "Former Rep, Now Senator",
      district: 3,
      terms: {
        item: [
          { chamber: "House of Representatives", startYear: 2015, endYear: 2025 },
          { chamber: "Senate", startYear: 2025 },
        ],
      },
    };
    serveMembers({
      AZ: [
        formerRepNowSenator,
        senator("S2", "Senator Two"),
        houseMember("H3", "Current Rep", 3),
      ],
      "AZ/3": [formerRepNowSenator, houseMember("H3", "Current Rep", 3)],
    });

    const { senators, houseRep } = await fetchRepresentatives("az", "3");

    expect(senators.map((s) => s.name)).toEqual([
      "Former Rep, Now Senator",
      "Senator Two",
    ]);
    expect(houseRep?.name).toBe("Current Rep");
  });

  it("still finds representatives when the CONGRESS_KEY env var ends with a newline", async () => {
    // e.g. saved with `echo "$KEY" | vercel env add CONGRESS_KEY`
    vi.stubEnv("CONGRESS_KEY", `${API_KEY}\n`);
    serveMembers({
      VT: [
        houseMember("H1", "At-Large Rep", 0),
        senator("S1", "Senator One"),
        senator("S2", "Senator Two"),
      ],
      "VT/0": [houseMember("H1", "At-Large Rep", 0)],
    });

    const { senators, houseRep } = await fetchRepresentatives("vt", "0");

    expect(senators.map((s) => s.name)).toEqual([
      "Senator One",
      "Senator Two",
    ]);
    expect(houseRep?.name).toBe("At-Large Rep");
  });

  it("returns no representatives when Congress.gov responds with an error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { code: "OVER_RATE_LIMIT", message: "Try again later" },
      }),
    });

    const reps = await fetchRepresentatives("ca", "12");

    expect(reps).toEqual({ senators: [], houseRep: null });
  });
});
