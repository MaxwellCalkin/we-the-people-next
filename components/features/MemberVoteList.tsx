// components/features/MemberVoteList.tsx
import Link from "next/link";

interface VoteEntry {
  billSlug: string;
  congress: string;
  title: string;
  memberVote: string;
  communityPosition: string;
  matches: boolean;
}

interface MemberVoteListProps {
  votes: VoteEntry[];
  showAll?: boolean;
  bioguideId?: string;
}

export default function MemberVoteList({ votes, showAll, bioguideId }: MemberVoteListProps) {
  if (votes.length === 0) {
    return (
      <p className="text-cream/40 text-sm">
        No voting overlap with community bills yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {votes.map((v) => (
        <div
          key={`${v.billSlug}-${v.congress}`}
          className="glass-card flex items-center justify-between py-3 px-4"
        >
          <div className="flex-1 min-w-0">
            <Link
              href={`/vote/${v.billSlug}/${v.congress}/voted`}
              className="text-cream text-sm font-medium hover:text-gold transition-colors line-clamp-1"
            >
              {v.title}
            </Link>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                v.memberVote === "Yea"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : v.memberVote === "Nay"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-cream/10 text-cream/50"
              }`}
            >
              {v.memberVote}
            </span>
            <span className="text-cream/25 text-xs">
              Community: {v.communityPosition}
            </span>
            <span className={`text-sm ${v.matches ? "text-emerald-400" : "text-red-400"}`}>
              {v.matches ? "✓" : "✗"}
            </span>
          </div>
        </div>
      ))}
      {!showAll && bioguideId && (
        <Link
          href={`/members/${bioguideId}/votes`}
          className="block text-center text-gold text-sm hover:text-gold/80 transition-colors mt-4"
        >
          View full voting record →
        </Link>
      )}
    </div>
  );
}
