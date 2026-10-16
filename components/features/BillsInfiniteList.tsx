"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import BillCard from "./BillCard";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import type { BillResult } from "@/types";

/** Bills per request. The API returns fewer only at the end of the list. */
const PAGE_SIZE = 20;
/** Start loading the next page once the end of the list is this close below the viewport. */
const PRELOAD_PX = 600;

type Status = "idle" | "loading" | "failed" | "done";

const statusAfter = (pageLength: number): Status => (pageLength < PAGE_SIZE ? "done" : "idle");

interface BillsInfiniteListProps {
  initialBills: BillResult[];
  userVotes: Record<string, "Yea" | "Nay">;
  search?: string | null;
}

export function BillCardSkeleton() {
  return (
    <div aria-hidden="true" className="card flex h-48 flex-col p-5">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="mt-4 h-4 w-11/12" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-3 h-3 w-2/3" />
      <Skeleton className="mt-auto h-3 w-1/2" />
    </div>
  );
}

export default function BillsInfiniteList({ initialBills, userVotes, search }: BillsInfiniteListProps) {
  // Bills stay in the order the API sent them, and new pages only go below.
  // Re-sorting on each page moved cards the reader had already passed.
  const [bills, setBills] = useState(initialBills);
  // Where the next page starts. It counts every bill the API has returned,
  // including ones already shown, so a page of duplicates can't stall the
  // list on the same request.
  const [nextOffset, setNextOffset] = useState(initialBills.length);
  const [status, setStatus] = useState<Status>(statusAfter(initialBills.length));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);

  // Start over when the first page changes (e.g. a new search). Compared by
  // content, so refetching the same first page keeps the bills loaded since.
  const initialKey = initialBills.map((b) => b.bill_id).join(",");
  const [prevKey, setPrevKey] = useState(initialKey);
  if (prevKey !== initialKey) {
    setPrevKey(initialKey);
    setBills(initialBills);
    setNextOffset(initialBills.length);
    setStatus(statusAfter(initialBills.length));
  }
  // A page requested for the old list must not land in the new one.
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [initialKey]
  );

  async function loadMore() {
    if (request.current || status === "done") return;
    const controller = new AbortController();
    request.current = controller;
    setStatus("loading");

    const params = new URLSearchParams({ offset: String(nextOffset) });
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/bills?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error(String(res.status));
      const page: BillResult[] = (await res.json()).bills ?? [];
      if (controller.signal.aborted) return;
      setBills((shown) => {
        const seen = new Set(shown.map((b) => b.bill_id));
        return [...shown, ...page.filter((b) => !seen.has(b.bill_id))];
      });
      setNextOffset((offset) => offset + page.length);
      setStatus(statusAfter(page.length));
    } catch {
      if (!controller.signal.aborted) setStatus("failed");
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  // Load the next page while the end of the list is within PRELOAD_PX below
  // the viewport, or anywhere above it (a fast scroll can land in the footer,
  // which is taller than a phone screen). Measured on the spot, so a page that
  // just rendered and pushed the end away doesn't set off another load.
  const loadIfNearEnd = useEffectEvent(() => {
    const sentinel = sentinelRef.current;
    if (status !== "idle" || !sentinel) return;
    if (sentinel.getBoundingClientRect().top > window.innerHeight + PRELOAD_PX) return;
    void loadMore();
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadIfNearEnd();
      },
      { rootMargin: `${PRELOAD_PX}px 0px` }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // When a page lands, keep filling if the list still ends near the viewport
  // (a tall screen can fit more than one page).
  useEffect(() => {
    loadIfNearEnd();
  }, [bills, status]);

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bills.map((bill) => (
          <li key={bill.bill_id}>
            <BillCard bill={bill} userVote={userVotes[bill.bill_slug]} />
          </li>
        ))}
      </ul>

      {/* Never a scroll anchor (nor is the footer): otherwise the browser keeps
          a reader parked at the bottom while pages are added above, and the
          list keeps loading. */}
      <div ref={sentinelRef} className="pt-6 [overflow-anchor:none]">
        {status === "loading" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading more bills">
            {Array.from({ length: 3 }).map((_, i) => (
              <BillCardSkeleton key={i} />
            ))}
          </div>
        )}
        {status === "failed" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-ink-2">We couldn&apos;t load more bills.</p>
            <Button variant="secondary" size="sm" onClick={() => void loadMore()}>
              Try again
            </Button>
          </div>
        )}
        {status === "idle" && (
          <div className="flex justify-center py-4">
            <Button variant="secondary" onClick={() => void loadMore()}>
              Load more bills
            </Button>
          </div>
        )}
        {status === "done" && bills.length > 0 && (
          <p className="py-6 text-center text-sm text-ink-3">You&apos;ve reached the end of the list.</p>
        )}
      </div>
    </>
  );
}
