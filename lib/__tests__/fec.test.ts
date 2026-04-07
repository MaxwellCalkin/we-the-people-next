import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  currentCycle,
  getCandidateTotals,
  getTopIndividualContributions,
  getTopPacContributions,
  FecApiError,
} from "../fec";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubEnv("FEC_API_KEY", "test-fec-key");

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe("currentCycle", () => {
  it("returns the next even year when called in an odd year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15"));
    expect(currentCycle()).toBe(2026);
    vi.useRealTimers();
  });

  it("returns the current year when called in an even year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07"));
    expect(currentCycle()).toBe(2026);
    vi.useRealTimers();
  });
});

describe("getCandidateTotals", () => {
  it("maps FEC totals response to CandidateTotals shape", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        results: [
          {
            candidate_id: "S8WA00194",
            cycle: 2026,
            receipts: 5_000_000,
            disbursements: 3_200_000,
            last_cash_on_hand_end_period: 1_800_000,
            individual_contributions: 4_100_000,
            other_political_committee_contributions: 850_000,
            coverage_end_date: "2026-03-31",
          },
        ],
      })
    );

    const totals = await getCandidateTotals("S8WA00194", 2026);

    expect(totals).toEqual({
      candidateId: "S8WA00194",
      cycle: 2026,
      receipts: 5_000_000,
      disbursements: 3_200_000,
      cashOnHand: 1_800_000,
      individualContributions: 4_100_000,
      pacContributions: 850_000,
      coverageEndDate: "2026-03-31",
    });

    // URL construction sanity-check: api_key, cycle, per_page, candidate path
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/candidate/S8WA00194/totals/");
    expect(calledUrl).toContain("api_key=test-fec-key");
    expect(calledUrl).toContain("cycle=2026");
  });

  it("returns null when FEC has no totals for the cycle", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
    const totals = await getCandidateTotals("S8WA00194", 2030);
    expect(totals).toBeNull();
  });

  it("treats missing numeric fields as zero", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        results: [{ candidate_id: "X", cycle: 2026 }],
      })
    );
    const totals = await getCandidateTotals("X", 2026);
    expect(totals?.receipts).toBe(0);
    expect(totals?.disbursements).toBe(0);
    expect(totals?.cashOnHand).toBe(0);
    expect(totals?.coverageEndDate).toBeNull();
  });

  it("throws FecApiError on non-2xx response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 429));
    try {
      await getCandidateTotals("X", 2026);
      throw new Error("expected to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(FecApiError);
      expect((e as FecApiError).status).toBe(429);
    }
  });

  it("throws when FEC_API_KEY is missing", async () => {
    vi.stubEnv("FEC_API_KEY", "");
    await expect(getCandidateTotals("X", 2026)).rejects.toBeInstanceOf(FecApiError);
    vi.stubEnv("FEC_API_KEY", "test-fec-key");
  });
});

describe("getTopIndividualContributions", () => {
  it("looks up principal committees, then queries Schedule A with is_individual=true", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          results: [{ committee_id: "C00111111" }, { committee_id: "C00222222" }],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { contributor_name: "SMITH, JOHN", contribution_receipt_amount: 6600 },
            { contributor_name: "DOE, JANE", contribution_receipt_amount: 3300 },
          ],
        })
      );

    const rows = await getTopIndividualContributions("S8WA00194", 2026, 2);

    expect(rows).toEqual([
      { contributor: "SMITH, JOHN", amount: 6600 },
      { contributor: "DOE, JANE", amount: 3300 },
    ]);

    // Second call (Schedule A) should include both committee IDs and is_individual=true
    const scheduleAUrl = mockFetch.mock.calls[1][0] as string;
    expect(scheduleAUrl).toContain("/schedules/schedule_a/");
    expect(scheduleAUrl).toContain("committee_id=C00111111%2CC00222222");
    expect(scheduleAUrl).toContain("is_individual=true");
    expect(scheduleAUrl).toContain("two_year_transaction_period=2026");
    expect(scheduleAUrl).toContain("sort=-contribution_receipt_amount");
  });

  it("returns empty array when candidate has no principal committees", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
    const rows = await getTopIndividualContributions("X", 2026);
    expect(rows).toEqual([]);
    // Should NOT have called Schedule A
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("filters out rows missing name or amount", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ results: [{ committee_id: "C00111111" }] }))
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { contributor_name: "VALID, DONOR", contribution_receipt_amount: 1000 },
            { contributor_name: "MISSING AMOUNT" },
            { contribution_receipt_amount: 500 },
          ],
        })
      );

    const rows = await getTopIndividualContributions("X", 2026);
    expect(rows).toHaveLength(1);
    expect(rows[0].contributor).toBe("VALID, DONOR");
  });
});

describe("getTopPacContributions", () => {
  it("queries Schedule A with is_individual=false", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ results: [{ committee_id: "C00111111" }] }))
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { contributor_name: "BIG INDUSTRY PAC", contribution_receipt_amount: 5000 },
          ],
        })
      );

    const rows = await getTopPacContributions("S8WA00194", 2026);

    expect(rows).toEqual([{ contributor: "BIG INDUSTRY PAC", amount: 5000 }]);
    const scheduleAUrl = mockFetch.mock.calls[1][0] as string;
    expect(scheduleAUrl).toContain("is_individual=false");
  });
});
