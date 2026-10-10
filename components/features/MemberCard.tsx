// components/features/MemberCard.tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import PartyBadge from "@/components/ui/PartyBadge";
import { scoreTone } from "@/components/ui/AlignmentBadge";
import { displayName, memberPhotoUrl, memberTitle, seatLabel } from "@/lib/format";

interface MemberCardProps {
  rank: number | null;
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  /** Congress.gov's photo; falls back to the usual bioguide file name. */
  imageUrl?: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
}

export default function MemberCard({
  rank,
  bioguideId,
  name,
  party,
  state,
  district,
  chamber,
  imageUrl,
  communityScore,
  matchingVotes,
  totalCompared,
}: MemberCardProps) {
  const fullName = displayName(name);
  const tone = scoreTone(communityScore);

  return (
    <div className="card card-interactive group flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      <span
        aria-hidden="true"
        className={`hidden w-9 shrink-0 text-center text-sm font-semibold tabular-nums sm:block ${
          rank !== null && rank <= 3 ? "text-gold-bright" : "text-ink-3"
        }`}
      >
        {rank !== null ? `#${rank}` : "—"}
      </span>
      <Avatar
        src={imageUrl ?? memberPhotoUrl(bioguideId)}
        name={fullName}
        size={44}
        variant="neutral"
      />
      <div className="min-w-0 flex-1">
        <Link href={`/members/${bioguideId}`} className="stretched-link block truncate font-semibold text-ink">
          <span className="text-ink-3">{memberTitle(chamber)}</span> {fullName}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
          <PartyBadge party={party} compact />
          <span>{seatLabel(chamber, state, district)}</span>
          <span aria-hidden="true">·</span>
          <span>{chamber}</span>
        </div>
      </div>
      <div className="w-24 shrink-0 text-right sm:w-32">
        <p className={`text-lg font-semibold tabular-nums ${tone.text}`}>
          {communityScore !== null ? `${communityScore}%` : "—"}
        </p>
        <div className="ml-auto mt-1 h-1 w-full max-w-24 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${communityScore ?? 0}%` }} />
        </div>
        <p className="mt-1 text-xs text-ink-3">
          {totalCompared > 0 ? `${matchingVotes} of ${totalCompared} votes` : "No shared votes"}
        </p>
      </div>
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
    </div>
  );
}
