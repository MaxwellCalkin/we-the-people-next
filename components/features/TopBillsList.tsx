"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { SkeletonRow } from "@/components/ui/Skeleton";
import Alert from "@/components/ui/Alert";
import RankedBillList from "./RankedBillList";
import type { TopBill } from "@/lib/trending";

type Period = "day" | "week" | "month" | "year";

const PERIODS: { value: Period; label: string; phrase: string }[] = [
  { value: "day", label: "Today", phrase: "today" },
  { value: "week", label: "This week", phrase: "this week" },
  { value: "month", label: "This month", phrase: "this month" },
  { value: "year", label: "This year", phrase: "this year" },
];

interface TopBillsListProps {
  userVotes: Record<string, "Yea" | "Nay">;
}

export default function TopBillsList({ userVotes }: TopBillsListProps) {
  const [period, setPeriod] = useState<Period>("week");
  const [result, setResult] = useState<{ period: Period; bills: TopBill[]; failed: boolean } | null>(null);
  const loading = result?.period !== period;

  useEffect(() => {
    let ignore = false;
    fetch(`/api/bills/top?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        if (!ignore) setResult({ period, bills: data.bills || [], failed: false });
      })
      .catch(() => {
        if (!ignore) setResult({ period, bills: [], failed: true });
      });
    return () => {
      ignore = true;
    };
  }, [period]);

  const phrase = PERIODS.find((p) => p.value === period)!.phrase;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-3">Bills with the most community votes {phrase}.</p>
        <SegmentedControl label="Time period" options={PERIODS} value={period} onChange={setPeriod} size="sm" />
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading most-voted bills">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : result.failed ? (
        <Alert tone="error" title="We couldn't load the most-voted bills.">
          Check your connection and try again in a moment.
        </Alert>
      ) : result.bills.length === 0 ? (
        <EmptyState
          compact
          icon={Trophy}
          title={`No votes ${phrase} yet`}
          description="Try a longer time period, or vote on a bill to get things started."
        />
      ) : (
        <RankedBillList
          userVotes={userVotes}
          bills={result.bills.map((b) => ({
            billSlug: b.billSlug,
            congress: b.congress,
            title: b.title,
            yeas: b.yeas,
            nays: b.nays,
            activity: `${b.voteCount.toLocaleString("en-US")} ${b.voteCount === 1 ? "vote" : "votes"} ${phrase}`,
          }))}
        />
      )}
    </div>
  );
}
