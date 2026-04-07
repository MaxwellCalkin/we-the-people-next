import { describe, it, expect } from "vitest";
import { parseLegislators, toCrosswalkRow } from "../crosswalk";

describe("toCrosswalkRow", () => {
  it("extracts all id fields when present", () => {
    const row = toCrosswalkRow({
      id: {
        bioguide: "C000127",
        thomas: "00172",
        govtrack: 300018,
        opensecrets: "N00007836",
        icpsr: 39310,
        fec: ["S8WA00194", "H2WA01054"],
        wikipedia: "Maria Cantwell",
      },
    });

    expect(row).toEqual({
      bioguideId: "C000127",
      fecIds: ["S8WA00194", "H2WA01054"],
      opensecretsId: "N00007836",
      govtrackId: 300018,
      thomasId: "00172",
      icpsrId: 39310,
      wikipediaTitle: "Maria Cantwell",
    });
  });

  it("returns null when bioguide is missing", () => {
    expect(toCrosswalkRow({ id: { thomas: "00172" } })).toBeNull();
    expect(toCrosswalkRow({})).toBeNull();
  });

  it("defaults fecIds to empty array when field is missing", () => {
    const row = toCrosswalkRow({ id: { bioguide: "B000001" } });
    expect(row?.fecIds).toEqual([]);
  });

  it("drops non-string entries from fecIds", () => {
    const row = toCrosswalkRow({
      // Simulate dirty data from the source file
      id: { bioguide: "D000001", fec: ["H0TX00001", null as unknown as string, "S2TX00002"] },
    });
    expect(row?.fecIds).toEqual(["H0TX00001", "S2TX00002"]);
  });

  it("leaves optional numeric fields undefined when not numbers", () => {
    const row = toCrosswalkRow({
      id: { bioguide: "X000001", govtrack: "not-a-number" as unknown as number },
    });
    expect(row?.govtrackId).toBeUndefined();
  });
});

describe("parseLegislators", () => {
  it("filters out records without a bioguide ID", () => {
    const rows = parseLegislators([
      { id: { bioguide: "A000001", fec: ["H1CA00001"] } },
      { id: { thomas: "99999" } }, // no bioguide, should be dropped
      { id: { bioguide: "B000002" } },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.bioguideId)).toEqual(["A000001", "B000002"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseLegislators([])).toEqual([]);
  });
});
