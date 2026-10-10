"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import BillCard from "./BillCard";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import type { BillResult } from "@/types";

const PAGE_SIZE = 20;

function sortByActionDate(bills: BillResult[]): BillResult[] {
  return [...bills].sort((a, b) => {
    const da = a.latest_major_action_date || "";
    const db = b.latest_major_action_date || "";
    return db.localeCompare(da);
  });
}

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
  const [bills, setBills] = useState(initialBills);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(initialBills.length >= PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset when the initial bills change (e.g. a new search).
  const [prevInitial, setPrevInitial] = useState(initialBills);
  if (prevInitial !== initialBills) {
    setPrevInitial(initialBills);
    setBills(initialBills);
    setHasMore(initialBills.length >= PAGE_SIZE);
    setFailed(false);
  }

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || failed) return;
    setLoading(true);

    const params = new URLSearchParams({ offset: String(bills.length) });
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/bills?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const newBills: BillResult[] = data.bills || [];
      setBills((prev) => {
        const seen = new Set(prev.map((b) => b.bill_id));
        return [...prev, ...newBills.filter((b) => !seen.has(b.bill_id))];
      });
      if (newBills.length < PAGE_SIZE) setHasMore(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, failed, bills.length, search]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortByActionDate(bills).map((bill) => (
          <li key={bill.bill_id}>
            <BillCard bill={bill} userVote={userVotes[bill.bill_slug]} />
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} className="pt-6">
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading more bills">
            {Array.from({ length: 3 }).map((_, i) => (
              <BillCardSkeleton key={i} />
            ))}
          </div>
        )}
        {!loading && failed && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-ink-2">We couldn&apos;t load more bills.</p>
            <Button variant="secondary" size="sm" onClick={() => setFailed(false)}>
              Try again
            </Button>
          </div>
        )}
        {!loading && !failed && hasMore && (
          <div className="flex justify-center py-4">
            <Button variant="secondary" onClick={loadMore}>
              Load more bills
            </Button>
          </div>
        )}
        {!hasMore && bills.length > 0 && (
          <p className="py-6 text-center text-sm text-ink-3">You&apos;ve reached the end of the list.</p>
        )}
      </div>
    </>
  );
}
