"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

interface TrendingBill {
  billSlug: string;
  congress: string;
  title: string;
  trendingScore: number;
  totalVotes: number;
}

interface TrendingBillsListProps {
  userVotedSlugs: string[];
}

export default function TrendingBillsList({ userVotedSlugs }: TrendingBillsListProps) {
  const [bills, setBills] = useState<TrendingBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bills/trending")
      .then((r) => r.json())
      .then((data) => setBills(data.bills || []))
      .catch((err) => console.error("Failed to fetch trending:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card h-20 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-cream/60">No trending bills yet.</p>
        <p className="text-cream/40 text-sm mt-2">
          Bills will appear here as the community votes on them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bills.map((bill, i) => {
        const hasVoted = userVotedSlugs.includes(bill.billSlug);
        return (
          <Link
            key={bill.billSlug}
            href={hasVoted ? `/vote/${bill.billSlug}/${bill.congress}/voted` : `/vote/${bill.billSlug}/${bill.congress}`}
            className="block"
          >
            <GlassCard hover>
              <div className="flex items-center gap-4">
                <span className={`font-bold text-sm w-8 text-center shrink-0 ${i === 0 ? "text-gold" : "text-cream/40"}`}>
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-cream text-sm font-semibold line-clamp-2">
                    {bill.title}
                  </h3>
                  <p className="text-cream/40 text-xs mt-1">
                    {bill.totalVotes} community vote{bill.totalVotes !== 1 ? "s" : ""} recently
                  </p>
                </div>
                <span className={`text-sm font-medium shrink-0 ${hasVoted ? "text-gold" : "text-cream"} transition-colors`}>
                  {hasVoted ? "Voted ✓" : "Vote →"}
                </span>
              </div>
            </GlassCard>
          </Link>
        );
      })}
    </div>
  );
}
