"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import BillCard from "./BillCard";
import type { BillResult } from "@/types";

interface BillsInfiniteListProps {
  initialBills: BillResult[];
  userVotedSlugs: string[];
  search?: string | null;
}

export default function BillsInfiniteList({
  initialBills,
  userVotedSlugs,
  search,
}: BillsInfiniteListProps) {
  const [bills, setBills] = useState(initialBills);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialBills.length >= 20);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset when initial bills change (e.g. new search)
  useEffect(() => {
    setBills(initialBills);
    setHasMore(initialBills.length >= 20);
  }, [initialBills]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const params = new URLSearchParams({ offset: String(bills.length) });
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/bills?${params}`);
      const data = await res.json();
      const newBills: BillResult[] = data.bills || [];

      if (newBills.length === 0) {
        setHasMore(false);
      } else {
        setBills((prev) => [...prev, ...newBills]);
        if (newBills.length < 20) setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more bills:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, bills.length, search]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bills.map((bill) => (
          <BillCard
            key={bill.bill_id}
            bill={bill}
            userVotedSlugs={userVotedSlugs}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="flex justify-center py-8">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass-card h-48 animate-pulse rounded-xl"
              />
            ))}
          </div>
        )}
        {!hasMore && bills.length > 0 && (
          <p className="text-cream/40 text-sm">All bills loaded.</p>
        )}
      </div>
    </>
  );
}
