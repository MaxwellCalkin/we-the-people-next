import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBillDetails } from "../congress";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubEnv("CONGRESS_KEY", "test-key");

beforeEach(() => {
  mockFetch.mockReset();
});

function billResponse(bill: unknown) {
  return { ok: true, json: async () => ({ bill }) };
}
function summariesResponse(summaries: unknown[]) {
  return { ok: true, json: async () => ({ summaries }) };
}

describe("fetchBillDetails — cboCostEstimates", () => {
  it("extracts CBO cost estimates from the bill response", async () => {
    mockFetch
      .mockResolvedValueOnce(
        billResponse({
          title: "A bill to do things",
          introducedDate: "2026-01-01",
          latestAction: { text: "Referred", actionDate: "2026-01-02" },
          cboCostEstimates: [
            {
              title: "CBO Estimate for H.R. 100",
              description: "As ordered reported by the Committee on Energy",
              pubDate: "2026-02-15T00:00:00Z",
              url: "https://www.cbo.gov/publication/57356",
            },
            {
              title: "CBO Estimate for H.R. 100 (revised)",
              description: "As passed by the House",
              pubDate: "2026-03-10T00:00:00Z",
              url: "https://www.cbo.gov/publication/57400",
            },
          ],
        })
      )
      .mockResolvedValueOnce(summariesResponse([]));

    const bill = await fetchBillDetails("119", "hr100");

    expect(bill).not.toBeNull();
    expect(bill!.cboCostEstimates).toHaveLength(2);
    expect(bill!.cboCostEstimates![0]).toEqual({
      title: "CBO Estimate for H.R. 100",
      description: "As ordered reported by the Committee on Energy",
      pubDate: "2026-02-15T00:00:00Z",
      url: "https://www.cbo.gov/publication/57356",
    });
    expect(bill!.cboCostEstimates![1].url).toBe(
      "https://www.cbo.gov/publication/57400"
    );
  });

  it("filters out CBO entries with no url", async () => {
    mockFetch
      .mockResolvedValueOnce(
        billResponse({
          title: "Bill",
          cboCostEstimates: [
            { title: "Real one", url: "https://www.cbo.gov/publication/1" },
            { title: "No url", description: "missing link" },
          ],
        })
      )
      .mockResolvedValueOnce(summariesResponse([]));

    const bill = await fetchBillDetails("119", "s50");

    expect(bill!.cboCostEstimates).toHaveLength(1);
    expect(bill!.cboCostEstimates![0].title).toBe("Real one");
  });

  it("returns undefined cboCostEstimates when the API field is missing", async () => {
    mockFetch
      .mockResolvedValueOnce(billResponse({ title: "Bill with no CBO score" }))
      .mockResolvedValueOnce(summariesResponse([]));

    const bill = await fetchBillDetails("119", "hr1");

    expect(bill!.cboCostEstimates).toBeUndefined();
  });

  it("returns undefined when cboCostEstimates is an empty array", async () => {
    mockFetch
      .mockResolvedValueOnce(
        billResponse({ title: "Bill", cboCostEstimates: [] })
      )
      .mockResolvedValueOnce(summariesResponse([]));

    const bill = await fetchBillDetails("119", "hr2");

    expect(bill!.cboCostEstimates).toBeUndefined();
  });
});
