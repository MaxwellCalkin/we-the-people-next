// Infinite scrolling on the Newest tab and bill search. The bills API is a
// fake at fetch, and the browser's IntersectionObserver is a fake the tests
// drive to say "the end of the list scrolled into range". jsdom has no
// layout, so `endOfListTop` stands in for where the end of the list sits.
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BillsInfiniteList from "../BillsInfiniteList";
import type { BillResult } from "@/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function bill(number: number, actionDate = "2026-10-01"): BillResult {
  return {
    short_title: `Bill ${number}`,
    title: `Bill ${number}`,
    bill_id: `hr${number}-119`,
    bill_slug: `hr${number}`,
    bill_type: "hr",
    congress: "119",
    introduced_date: "2026-01-01",
    latest_major_action: "Referred to committee.",
    latest_major_action_date: actionDate,
  };
}

/** Bills numbered from..from+count-1. */
const bills = (from: number, count: number) => Array.from({ length: count }, (_, i) => bill(from + i));
const titles = (list: BillResult[]) => list.map((b) => b.title);

const FAR_BELOW = 5000;
const IN_RANGE = 100;
let endOfListTop = FAR_BELOW;

// Observers currently watching. Only scrolling (scrollToEnd) reports to them.
let observers = new Set<FakeIntersectionObserver>();
class FakeIntersectionObserver {
  constructor(readonly callback: IntersectionObserverCallback) {}
  observe() {
    observers.add(this);
  }
  unobserve() {
    observers.delete(this);
  }
  disconnect() {
    observers.delete(this);
  }
  takeRecords() {
    return [];
  }
}

/** The reader scrolls until the end of the list comes into range. */
async function scrollToEnd() {
  endOfListTop = IN_RANGE;
  await act(async () => {
    for (const observer of observers) {
      observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    }
  });
}

type FakeFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Serves /api/bills?offset= from `pages`. Like a real page of cards, each
 * page served pushes the end of the list out of range, unless the screen is
 * tall enough to show it all.
 */
function serveBills(pages: Record<number, BillResult[] | "error">, { tallScreen = false } = {}) {
  const fetchMock = vi.fn<FakeFetch>(async (input) => {
    const page = pages[Number(new URL(String(input), "http://localhost").searchParams.get("offset"))];
    if (!page || page === "error") {
      return { ok: false, status: 500, json: async () => ({ error: "Failed to fetch bills" }) };
    }
    if (!tallScreen) endOfListTop = FAR_BELOW;
    return { ok: true, status: 200, json: async () => ({ bills: page }) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const requestedOffsets = (fetchMock: ReturnType<typeof serveBills>) =>
  fetchMock.mock.calls.map(([url]) => Number(new URL(String(url), "http://localhost").searchParams.get("offset")));

const shownTitles = () =>
  screen.getAllByRole("listitem").map((item) => item.textContent?.match(/Bill \d+/)?.[0]);

beforeEach(() => {
  endOfListTop = FAR_BELOW;
  observers = new Set();
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ top: endOfListTop, bottom: endOfListTop + 80 }) as DOMRect
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BillsInfiniteList", () => {
  it("adds the next page below the bills already shown without reordering them", async () => {
    // The next page has newer actions than the first; it still goes below.
    serveBills({ 20: bills(21, 20).map((b) => ({ ...b, latest_major_action_date: "2026-10-15" })) });
    render(<BillsInfiniteList initialBills={bills(1, 20)} userVotes={{}} />);

    await scrollToEnd();

    await screen.findByText("Bill 40");
    expect(shownTitles()).toEqual(titles(bills(1, 40)));
  });

  it("asks for the page after every bill the server has sent, even ones already on screen", async () => {
    // Overlapping pages: 13 of these 20 are already shown.
    const fetchMock = serveBills({ 20: [...bills(8, 13), ...bills(21, 7)], 40: bills(28, 20) });
    render(<BillsInfiniteList initialBills={bills(1, 20)} userVotes={{}} />);

    await scrollToEnd();
    await screen.findByText("Bill 27");
    expect(shownTitles()).toHaveLength(27);

    await scrollToEnd();
    await screen.findByText("Bill 47");
    expect(requestedOffsets(fetchMock)).toEqual([20, 40]);
    expect(shownTitles()).toEqual(titles(bills(1, 47)));
  });

  it("loads one page at a time, even if the end of the list comes into range again mid-load", async () => {
    let finishLoading = () => {};
    const fetchMock = vi.fn<FakeFetch>(
      () =>
        new Promise((resolve) => {
          finishLoading = () => resolve({ ok: true, status: 200, json: async () => ({ bills: bills(21, 20) }) });
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<BillsInfiniteList initialBills={bills(1, 20)} userVotes={{}} />);

    await scrollToEnd();
    await scrollToEnd();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status", { name: "Loading more bills" })).toBeInTheDocument();

    endOfListTop = FAR_BELOW;
    await act(async () => finishLoading());
    expect(await screen.findByText("Bill 40")).toBeInTheDocument();
  });

  it("keeps loading while a tall screen still shows the end of the list, then says the list has ended", async () => {
    const fetchMock = serveBills({ 20: bills(21, 20), 40: bills(41, 20), 60: bills(61, 3) }, { tallScreen: true });
    endOfListTop = IN_RANGE;

    render(<BillsInfiniteList initialBills={bills(1, 20)} userVotes={{}} />);

    expect(await screen.findByText("You've reached the end of the list.")).toBeInTheDocument();
    expect(requestedOffsets(fetchMock)).toEqual([20, 40, 60]);
    expect(shownTitles()).toHaveLength(63);
  });

  it("stops asking for bills once a short page shows the list has ended", async () => {
    const fetchMock = serveBills({ 20: bills(21, 5) });
    render(<BillsInfiniteList initialBills={bills(1, 20)} userVotes={{}} />);

    await scrollToEnd();
    expect(await screen.findByText("You've reached the end of the list.")).toBeInTheDocument();
    await scrollToEnd();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Load more bills" })).not.toBeInTheDocument();
  });

  it("offers a retry when a page fails, without retrying on its own, and retries the same page", async () => {
    const pages: Record<number, BillResult[] | "error"> = { 20: "error" };
    const fetchMock = serveBills(pages);
    const user = userEvent.setup();
    render(<BillsInfiniteList initialBills={bills(1, 20)} userVotes={{}} />);

    await scrollToEnd();
    expect(await screen.findByText("We couldn't load more bills.")).toBeInTheDocument();
    await scrollToEnd();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    pages[20] = bills(21, 20);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Bill 40")).toBeInTheDocument();
    expect(requestedOffsets(fetchMock)).toEqual([20, 20]);
  });

  it("keeps loaded bills when the same first page arrives again, and starts over for a different one", async () => {
    serveBills({ 20: bills(21, 20) });
    const { rerender } = render(<BillsInfiniteList initialBills={bills(1, 20)} userVotes={{}} />);
    await scrollToEnd();
    await screen.findByText("Bill 40");

    // Switching tabs refetches the page: the same bills in a new array.
    rerender(<BillsInfiniteList initialBills={bills(1, 20)} userVotes={{}} />);
    expect(shownTitles()).toHaveLength(40);

    // A new search brings a different first page.
    rerender(<BillsInfiniteList initialBills={bills(101, 20)} userVotes={{}} search="tax" />);
    expect(shownTitles()).toEqual(titles(bills(101, 20)));
  });

  it("asks for the next page of the same search", async () => {
    const fetchMock = serveBills({ 20: bills(21, 20) });
    render(<BillsInfiniteList initialBills={bills(1, 20)} userVotes={{}} search="farm bill" />);

    await scrollToEnd();
    await screen.findByText("Bill 40");

    expect(new URL(String(fetchMock.mock.calls[0][0]), "http://localhost").searchParams.get("search")).toBe("farm bill");
  });
});
