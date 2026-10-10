// components/features/MemberVoteList.tsx
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { VoteBadge } from "@/components/ui/Badge";
import { formatBillNumber } from "@/lib/format";
import { billHref } from "@/lib/routes";

interface VoteEntry {
  billSlug: string;
  congress: string;
  title: string;
  memberVote: string;
  communityPosition?: string | null;
  matches?: boolean | null;
}

interface MemberVoteListProps {
  votes: VoteEntry[];
  showAll?: boolean;
  bioguideId?: string;
  userVotes?: Record<string, "Yea" | "Nay">;
  emptyText?: string;
}

export default function MemberVoteList({
  votes,
  showAll,
  bioguideId,
  userVotes = {},
  emptyText = "No votes recorded yet.",
}: MemberVoteListProps) {
  return (
    <div>
      {votes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-8 text-center text-sm text-ink-3">{emptyText}</p>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {votes.map((v) => {
            const userVote = userVotes[v.billSlug];
            return (
              <li
                key={`${v.billSlug}-${v.congress}`}
                className="relative flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-white/[0.025] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gold-bright">{formatBillNumber(v.billSlug)}</p>
                  <Link
                    href={billHref(v.billSlug, v.congress, Boolean(userVote))}
                    className="stretched-link mt-0.5 block font-medium text-ink line-clamp-2"
                  >
                    {v.title}
                  </Link>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-ink-3">
                    Voted <VoteBadge vote={v.memberVote} />
                  </span>
                  {v.communityPosition ? (
                    <span className={`inline-flex items-center gap-1 font-medium ${v.matches ? "text-yea" : "text-nay"}`}>
                      {v.matches ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                      {v.matches ? "Matches the community" : `Community voted ${v.communityPosition}`}
                    </span>
                  ) : (
                    <span className="text-ink-3">No community votes yet</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!showAll && bioguideId && (
        <Link
          href={`/members/${bioguideId}/votes`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-bright hover:text-gold"
        >
          View the full voting record
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
