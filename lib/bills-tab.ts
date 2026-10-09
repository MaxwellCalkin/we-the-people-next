export type BillsTab = "trending" | "top" | "new";

export function isBillsTab(value: unknown): value is BillsTab {
  return value === "trending" || value === "top" || value === "new";
}

/**
 * An explicit ?tab= wins. Otherwise open on Trending only when something is
 * trending, so a quiet week doesn't greet people with an empty list.
 */
export function initialBillsTab(param: string | string[] | undefined, trendingCount: number): BillsTab {
  const value = Array.isArray(param) ? param[0] : param;
  if (isBillsTab(value)) return value;
  return trendingCount > 0 ? "trending" : "new";
}
