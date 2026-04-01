"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

interface TopBill {
  billSlug: string;
  congress: string;
  title: string;
  voteCount: number;
}

type Period = "day" | "week" | "month" | "year";

interface TopBillsListProps {
  userVotedSlugs: string[];
}

export default function TopBillsList({ userVotedSlugs }: TopBillsListProps) {
  const [bills, setBills] = useState<TopBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("week");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bills/top?period=${period}`)
      .then((r) => r.json())
      .then((data) => setBills(data.bills || []))
      .catch((err) => console.error("Failed to fetch top bills:", err))
      .finally(() => setLoading(false));
  }, [period]);

  const periodLabels: Record<Period, string> = {
    day: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(["day", "week", "month", "year"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              period === p
                ? "bg-gold/20 text-gold border border-gold/30"
                : "bg-glass-bg text-cream/50 border border-glass-border hover:text-cream"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card h-20 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-cream/60">No bills with votes {periodLabels[period].toLowerCase()}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill, i) => {
            const hasVoted = userVotedSlugs.includes(bill.billSlug);
            return (
              <GlassCard key={bill.billSlug} hover>
                <div className="flex items-center gap-4">
                  <span className={`font-bold text-sm w-8 text-center shrink-0 ${i === 0 ? "text-gold" : "text-cream/40"}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-cream text-sm font-semibold line-clamp-2">
                      {bill.title}
                    </h3>
                    <p className="text-cream/40 text-xs mt-1">
                      {bill.voteCount} vote{bill.voteCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Link
                    href={hasVoted ? `/vote/${bill.billSlug}/${bill.congress}/voted` : `/vote/${bill.billSlug}/${bill.congress}`}
                    className={`text-sm font-medium shrink-0 ${hasVoted ? "text-gold" : "text-cream hover:text-gold"} transition-colors`}
                  >
                    {hasVoted ? "Voted ✓" : "Vote →"}
                  </Link>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
