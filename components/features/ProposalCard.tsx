import Link from "next/link";
import { ArrowBigUp, MapPin } from "lucide-react";
import { formatDate, seatLabel } from "@/lib/format";

interface ProposalCardProps {
  proposal: {
    _id: string;
    title: string;
    description: string;
    image?: string;
    upvoteCount: number;
    authorState?: string;
    authorDistrict?: string;
    createdAt?: string;
    hasUpvoted?: boolean;
    user?: { userName?: string };
  };
  rank?: number;
}

export function proposalLocation(state?: string, district?: string): string | null {
  if (!state) return null;
  return district !== undefined && district !== "" ? seatLabel("House", state, district) : state.toUpperCase();
}

export default function ProposalCard({ proposal, rank }: ProposalCardProps) {
  const loc = proposalLocation(proposal.authorState, proposal.authorDistrict);
  const created = formatDate(proposal.createdAt);

  return (
    <article className="card card-interactive group flex h-full flex-col overflow-hidden">
      {proposal.image && (
        <div className="aspect-[16/9] w-full overflow-hidden border-b border-line bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proposal.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          {rank !== undefined && <span className="font-semibold text-gold-bright">#{rank}</span>}
          {loc && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {loc}
            </span>
          )}
          {created && (
            <time dateTime={proposal.createdAt} suppressHydrationWarning>
              {created}
            </time>
          )}
        </div>
        <h3 className="mt-2 text-[1.05rem] font-semibold leading-snug text-ink line-clamp-2">
          <Link href={`/proposal/${proposal._id}`} className="stretched-link">
            {proposal.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-2 line-clamp-3">{proposal.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3.5">
          <span
            className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
              proposal.hasUpvoted ? "text-gold-bright" : "text-ink"
            }`}
          >
            <ArrowBigUp className={`h-5 w-5 ${proposal.hasUpvoted ? "fill-current" : ""}`} aria-hidden="true" />
            {proposal.upvoteCount.toLocaleString("en-US")}
            <span className="font-normal text-ink-3">{proposal.upvoteCount === 1 ? "upvote" : "upvotes"}</span>
          </span>
          {proposal.user?.userName && <span className="truncate text-xs text-ink-3">by {proposal.user.userName}</span>}
        </div>
      </div>
    </article>
  );
}
