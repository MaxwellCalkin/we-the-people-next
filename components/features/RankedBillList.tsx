import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { VoteBadge } from "@/components/ui/Badge";
import { formatBillNumber, voteShares } from "@/lib/format";
import { billHref } from "@/lib/routes";

export interface RankedBill {
  billSlug: string;
  congress: string;
  title: string;
  yeas: number;
  nays: number;
  /** Short activity line, e.g. "34 votes this week". */
  activity: string;
}

export default function RankedBillList({
  bills,
  userVotes,
}: {
  bills: RankedBill[];
  userVotes: Record<string, "Yea" | "Nay">;
}) {
  return (
    <ol className="space-y-3">
      {bills.map((bill, i) => {
        const vote = userVotes[bill.billSlug];
        const { yea, total } = voteShares(bill.yeas, bill.nays);
        return (
          <li key={bill.billSlug} className="card card-interactive group flex items-center gap-4 p-4 sm:p-5">
            <span
              className={`w-8 shrink-0 text-center font-brand text-2xl font-semibold tabular-nums ${
                i < 3 ? "text-gold-bright" : "text-ink-3"
              }`}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                <span className="font-semibold text-gold-bright">{formatBillNumber(bill.billSlug)}</span>
                <span aria-hidden="true">·</span>
                <span>{bill.activity}</span>
              </div>
              <h3 className="mt-1 font-semibold leading-snug text-ink line-clamp-2">
                <Link href={billHref(bill.billSlug, bill.congress, Boolean(vote))} className="stretched-link">
                  {bill.title}
                </Link>
              </h3>
              {total > 0 && (
                <div className="mt-2.5 flex items-center gap-3">
                  <div
                    className="flex h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-white/[0.06]"
                    role="img"
                    aria-label={`Community: ${yea}% Yea, ${100 - yea}% Nay`}
                  >
                    <div className="bg-yea" style={{ width: `${yea}%` }} />
                    <div className="bg-nay" style={{ width: `${100 - yea}%` }} />
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-ink-3">
                    <span className="text-yea">{yea}%</span> Yea
                  </span>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {vote ? (
                <VoteBadge vote={vote} />
              ) : (
                <span className="hidden rounded-lg border border-gold/40 px-2.5 py-1 text-xs font-semibold text-gold-bright sm:inline">
                  Vote
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
