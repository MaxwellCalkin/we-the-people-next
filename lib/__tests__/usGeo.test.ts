// lib/__tests__/usGeo.test.ts
import { describe, it, expect } from "vitest";
import { districtKey, stateToFips, fipsToState } from "../usGeo";

describe("usGeo", () => {
  it("builds a district key from state abbr + cd", () => {
    expect(districtKey("TX", "21")).toBe("TX-21");
    expect(districtKey("tx", "21")).toBe("TX-21"); // normalizes case
  });
  it("treats at-large/blank cd as 00", () => {
    expect(districtKey("AK", "")).toBe("AK-00");
    expect(districtKey("AK", "AL")).toBe("AK-00");
  });
  it("maps state abbr to 2-digit FIPS and back", () => {
    expect(stateToFips("CA")).toBe("06");
    expect(fipsToState("06")).toBe("CA");
    expect(stateToFips("ZZ")).toBeUndefined();
  });
});
