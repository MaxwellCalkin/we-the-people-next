import { describe, expect, it } from "vitest";
import { initialBillsTab } from "@/lib/bills-tab";

describe("initialBillsTab", () => {
  it("opens on Trending when bills are trending", () => {
    expect(initialBillsTab(undefined, 12)).toBe("trending");
  });

  it("opens on Newest instead of an empty Trending list", () => {
    expect(initialBillsTab(undefined, 0)).toBe("new");
  });

  it("respects an explicit tab in the URL", () => {
    expect(initialBillsTab("top", 0)).toBe("top");
    expect(initialBillsTab("trending", 0)).toBe("trending");
    expect(initialBillsTab(["new", "top"], 5)).toBe("new");
  });

  it("ignores unknown tab values", () => {
    expect(initialBillsTab("popular", 3)).toBe("trending");
  });
});
