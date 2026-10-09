import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Badge, { VoteBadge } from "@/components/ui/Badge";
import { billChamber, formatBillNumber, formatDate } from "@/lib/format";
import { billHref } from "@/lib/routes";
import type { BillResult } from "@/types";

interface BillCardProps {
  bill: BillResult;
  /** The viewer's vote on this bill, if any. */
  userVote?: "Yea" | "Nay";
}

export default function BillCard({ bill, userVote }: BillCardProps) {
  const actionDate = formatDate(bill.latest_major_action_date);
  const chamber = billChamber(bill.bill_type);
  const title = bill.short_title || bill.title;

  return (
    <article className="card card-interactive group flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <Badge tone="gold">{formatBillNumber(bill.bill_slug)}</Badge>
        {chamber && <span className="text-xs text-ink-3">{chamber}</span>}
        {userVote && (
          <span className="ml-auto">
            <VoteBadge vote={userVote} />
          </span>
        )}
      </div>

      <h3 className="mt-3 text-[0.95rem] font-semibold leading-snug text-ink line-clamp-3">
        <Link href={billHref(bill.bill_slug, bill.congress, Boolean(userVote))} className="stretched-link">
          {title}
        </Link>
      </h3>

      {bill.latest_major_action && (
        <p className="mt-2 text-sm leading-relaxed text-ink-3 line-clamp-2">{bill.latest_major_action}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3.5 text-xs">
        <span className="text-ink-3">{actionDate ? `Latest action ${actionDate}` : "No recent action"}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-gold-bright">
          {userVote ? "See results" : "Vote"}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
