// test/fake-congress.ts — stands in for Congress.gov's list of current
// members. Congress.gov is an external API, not our DB, so tests fake it at
// fetch.
import { vi } from "vitest";

const API_KEY = "test-key";

type FakeFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Serves GET /v3/member?currentMember=true the way Congress.gov does: pages of
 * `limit` members (250 at most) with a `pagination.next` link while members
 * remain, and an error for a wrong api_key. `failPage` makes that page
 * (counting from 0) answer 503. Returns the fetch mock so tests can inspect
 * calls.
 */
export function serveCurrentMembers(
  members: unknown[],
  { failPage }: { failPage?: number } = {}
) {
  const fetchMock = vi.fn<FakeFetch>(async (input) => {
    const url = new URL(input);
    if (url.pathname !== "/v3/member" || url.searchParams.get("currentMember") !== "true") {
      return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
    }
    if (url.searchParams.get("api_key") !== API_KEY) {
      return { ok: false, status: 403, json: async () => ({ error: { code: "API_KEY_INVALID" } }) };
    }
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 250);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (failPage !== undefined && offset === failPage * limit) {
      return { ok: false, status: 503, json: async () => ({ error: "Service Unavailable" }) };
    }
    const end = offset + limit;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        members: members.slice(offset, end),
        pagination: {
          count: members.length,
          ...(end < members.length && {
            next: `${url.origin}${url.pathname}?currentMember=true&offset=${end}&limit=${limit}&format=json`,
          }),
        },
      }),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("CONGRESS_KEY", API_KEY);
  return fetchMock;
}

/** A current House member as Congress.gov lists one; at-large members have no district. */
export function houseMember(
  bioguideId: string,
  name: string,
  state: string,
  district?: number,
  extra: Record<string, unknown> = {}
) {
  return {
    bioguideId,
    name,
    partyName: "Democratic",
    state,
    ...(district !== undefined && { district }),
    terms: { item: [{ chamber: "House of Representatives", startYear: 2023 }] },
    ...extra,
  };
}

export function senator(
  bioguideId: string,
  name: string,
  state: string,
  extra: Record<string, unknown> = {}
) {
  return {
    bioguideId,
    name,
    partyName: "Republican",
    state,
    terms: { item: [{ chamber: "Senate", startYear: 2021 }] },
    ...extra,
  };
}
