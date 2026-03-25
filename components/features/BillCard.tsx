"use client";

import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import type { BillResult } from "@/types";

interface BillCardProps {
  bill: BillResult;
  userVotedSlugs: string[];
}

function billTypeLabel(type: string): string {
  switch (type) {
    case "hr":
      return "H.R.";
    case "s":
      return "S.";
    case "hjres":
      return "H.J.Res.";
    case "sjres":
      return "S.J.Res.";
    case "hconres":
      return "H.Con.Res.";
    case "sconres":
      return "S.Con.Res.";
    case "hres":
      return "H.Res.";
    case "sres":
      return "S.Res.";
    default:
      return type.toUpperCase();
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BillCard({ bill, userVotedSlugs }: BillCardProps) {
  const hasVoted = userVotedSlugs.includes(bill.bill_slug);
  const displayDate =
    formatDate(bill.latest_major_action_date) ||
    formatDate(bill.introduced_date);

  return (
    <GlassCard hover>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-cream/50">
          {billTypeLabel(bill.bill_type)}
        </p>
        {displayDate && (
          <p className="text-xs text-cream/40">{displayDate}</p>
        )}
      </div>
      <h3 className="text-cream font-semibold text-sm leading-snug mb-4 line-clamp-3">
        {bill.short_title || bill.title}
      </h3>
      {bill.latest_major_action && (
        <p className="text-cream/40 text-xs mb-4 line-clamp-2">
          {bill.latest_major_action}
        </p>
      )}
      <div className="mt-auto">
        {hasVoted ? (
          <Link
            href={`/vote/${bill.bill_slug}/${bill.congress}/voted`}
            className="inline-block text-gold text-sm font-medium hover:text-gold/80 transition-colors"
          >
            You Voted! View Details &rarr;
          </Link>
        ) : (
          <Link
            href={`/vote/${bill.bill_slug}/${bill.congress}`}
            className="inline-block text-cream text-sm font-medium hover:text-gold transition-colors"
          >
            View Details and Vote &rarr;
          </Link>
        )}
      </div>
    </GlassCard>
  );
}
