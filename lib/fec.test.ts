// lib/fec.test.ts
//
// Unit tests for the new election-facing endpoints in lib/fec.ts.
// `fetch` is stubbed so these tests stay deterministic and offline.
// The existing legacy endpoints (totals, contributions) are covered by their
// own integrations elsewhere and are not retested here.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCandidatesByOffice,
  getCandidateDetail,
  getElectionDates,
} from "./fec";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_KEY = process.env.FEC_API_KEY;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function capturedFetchSpy(body: unknown) {
  const spy = vi.fn(async () => jsonResponse(body));
  globalThis.fetch = spy as unknown as typeof fetch;
  return spy;
}

function lastUrl(spy: ReturnType<typeof vi.fn>): URL {
  const arg = spy.mock.calls.at(-1)?.[0];
  return new URL(String(arg));
}

beforeEach(() => {
  process.env.FEC_API_KEY = "test-key";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env.FEC_API_KEY = ORIGINAL_KEY;
  vi.restoreAllMocks();
});

describe("getCandidatesByOffice", () => {
  it("sends state, office, cycle, election_year, candidate_status, and per_page", async () => {
    const spy = capturedFetchSpy({ results: [] });
    await getCandidatesByOffice({
      state: "PA",
      office: "H",
      district: 12,
      cycle: 2026,
      electionYear: 2026,
    });
    const url = lastUrl(spy);
    expect(url.pathname).toBe("/v1/candidates/");
    expect(url.searchParams.get("state")).toBe("PA");
    expect(url.searchParams.get("office")).toBe("H");
    expect(url.searchParams.get("district")).toBe("12");
    expect(url.searchParams.get("cycle")).toBe("2026");
    expect(url.searchParams.get("election_year")).toBe("2026");
    expect(url.searchParams.get("candidate_status")).toBe("C");
    expect(url.searchParams.get("per_page")).toBe("100");
    expect(url.searchParams.get("api_key")).toBe("test-key");
  });

  it("pads single-digit district numbers to two characters", async () => {
    const spy = capturedFetchSpy({ results: [] });
    await getCandidatesByOffice({
      state: "GA",
      office: "H",
      district: 5,
      cycle: 2026,
      electionYear: 2026,
    });
    expect(lastUrl(spy).searchParams.get("district")).toBe("05");
  });

  it("omits district for Senate races", async () => {
    const spy = capturedFetchSpy({ results: [] });
    await getCandidatesByOffice({
      state: "TX",
      office: "S",
      cycle: 2026,
      electionYear: 2026,
    });
    expect(lastUrl(spy).searchParams.get("district")).toBeNull();
    expect(lastUrl(spy).searchParams.get("office")).toBe("S");
  });

  it("maps API rows to CandidateSummary and drops rows missing id or name", async () => {
    capturedFetchSpy({
      results: [
        {
          candidate_id: "H0PA12345",
          name: "Doe, Jane",
          party_full: "DEMOCRATIC PARTY",
          office: "H",
          state: "PA",
          district: "12",
          incumbent_challenge: "I",
        },
        // dropped — no candidate_id
        { name: "Anon", office: "H", state: "PA" },
      ],
    });
    const results = await getCandidatesByOffice({
      state: "PA",
      office: "H",
      district: 12,
      cycle: 2026,
      electionYear: 2026,
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      fecId: "H0PA12345",
      name: "Doe, Jane",
      party: "DEMOCRATIC PARTY",
      office: "H",
      state: "PA",
      district: "12",
      incumbentChallenge: "I",
    });
  });

  it("falls back to short party code when party_full is missing", async () => {
    capturedFetchSpy({
      results: [
        {
          candidate_id: "H0PA12345",
          name: "Doe",
          party: "REP",
          office: "H",
          state: "PA",
          district: "01",
        },
      ],
    });
    const [c] = await getCandidatesByOffice({
      state: "PA",
      office: "H",
      district: 1,
      cycle: 2026,
      electionYear: 2026,
    });
    expect(c.party).toBe("REP");
    expect(c.incumbentChallenge).toBeNull();
  });
});

describe("getCandidateDetail", () => {
  it("returns null when the API returns no results", async () => {
    capturedFetchSpy({ results: [] });
    const bio = await getCandidateDetail("H0XX00000");
    expect(bio).toBeNull();
  });

  it("maps committee IDs and election years from the response", async () => {
    capturedFetchSpy({
      results: [
        {
          candidate_id: "S0CA00123",
          name: "Roe, John",
          party_full: "REPUBLICAN PARTY",
          office: "S",
          state: "CA",
          incumbent_challenge: "C",
          candidate_status: "C",
          election_years: [2018, 2024, 2026],
          principal_committees: [
            { committee_id: "C00111111" },
            { committee_id: "C00222222" },
          ],
        },
      ],
    });
    const bio = await getCandidateDetail("S0CA00123");
    expect(bio).not.toBeNull();
    expect(bio).toMatchObject({
      fecId: "S0CA00123",
      name: "Roe, John",
      party: "REPUBLICAN PARTY",
      office: "S",
      state: "CA",
      district: null,
      incumbentChallenge: "C",
      candidateStatus: "C",
      electionYears: [2018, 2024, 2026],
      principalCommitteeIds: ["C00111111", "C00222222"],
    });
  });
});

describe("getElectionDates", () => {
  it("omits election_state when no state is passed (national scope)", async () => {
    const spy = capturedFetchSpy({ results: [] });
    await getElectionDates({ electionYear: 2026 });
    const url = lastUrl(spy);
    expect(url.pathname).toBe("/v1/election-dates/");
    expect(url.searchParams.get("election_state")).toBeNull();
    expect(url.searchParams.get("election_year")).toBe("2026");
    expect(url.searchParams.get("sort")).toBe("election_date");
  });

  it("passes the state code when scoped", async () => {
    const spy = capturedFetchSpy({ results: [] });
    await getElectionDates({ state: "NJ", electionYear: 2026 });
    expect(lastUrl(spy).searchParams.get("election_state")).toBe("NJ");
  });

  it("maps election_type_id codes to friendly types", async () => {
    capturedFetchSpy({
      results: [
        {
          election_state: "NJ",
          election_type_id: "PR",
          election_date: "2026-06-02",
          office_sought: "S",
        },
        {
          election_state: null,
          election_type_id: "G",
          election_date: "2026-11-03",
        },
        {
          election_state: "GA",
          election_type_id: "R",
          election_date: "2026-12-01",
        },
        {
          election_state: "XX",
          election_type_id: "ZZZ",
          election_date: "2026-07-04",
        },
      ],
    });
    const dates = await getElectionDates({ electionYear: 2026 });
    const types = dates.map((d) => d.type);
    expect(types).toEqual(["primary", "general", "runoff", "other"]);
  });

  it("drops rows without an election_date", async () => {
    capturedFetchSpy({
      results: [
        { election_state: "NJ", election_type_id: "G" },
        { election_state: "NJ", election_type_id: "G", election_date: "2026-11-03" },
      ],
    });
    const dates = await getElectionDates({ state: "NJ", electionYear: 2026 });
    expect(dates).toHaveLength(1);
    expect(dates[0].date).toBe("2026-11-03");
  });
});

describe("FEC_API_KEY guard", () => {
  it("throws FecApiError when no key is configured", async () => {
    delete process.env.FEC_API_KEY;
    await expect(
      getCandidatesByOffice({
        state: "PA",
        office: "H",
        district: 1,
        cycle: 2026,
        electionYear: 2026,
      })
    ).rejects.toMatchObject({ name: "FecApiError" });
  });
});
