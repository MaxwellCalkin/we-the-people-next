import { Flame } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import RankedBillList from "./RankedBillList";
import type { TrendingBill } from "@/lib/trending";

interface TrendingBillsListProps {
  bills: TrendingBill[];
  userVotes: Record<string, "Yea" | "Nay">;
  onBrowseNew?: () => void;
}

export default function TrendingBillsList({ bills, userVotes, onBrowseNew }: TrendingBillsListProps) {
  if (bills.length === 0) {
    return (
      <EmptyState
        icon={Flame}
        title="Nothing is trending yet"
        description="Bills show up here once people start voting on them. Be one of the first: pick a new bill and cast your vote."
        action={
          onBrowseNew && (
            <button
              type="button"
              onClick={onBrowseNew}
              className="text-sm font-semibold text-gold-bright underline-offset-4 hover:underline"
            >
              Browse the newest bills
            </button>
          )
        }
      />
    );
  }

  return (
    <RankedBillList
      userVotes={userVotes}
      bills={bills.map((b) => ({
        billSlug: b.billSlug,
        congress: b.congress,
        title: b.title,
        yeas: b.yeas,
        nays: b.nays,
        activity: `${b.totalVotes.toLocaleString("en-US")} ${b.totalVotes === 1 ? "vote" : "votes"} this week`,
      }))}
    />
  );
}
