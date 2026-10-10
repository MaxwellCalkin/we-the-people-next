// components/features/SittingMemberBanner.tsx
//
// "Currently held by X" line shown at the top of a race detail page. Source
// is Congress.gov's list of current members, not the FEC candidate roster —
// so it stays correct when the sitting member hasn't filed for the upcoming
// election yet.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import PartyBadge from "@/components/ui/PartyBadge";
import { displayName, memberPhotoUrl } from "@/lib/format";
import type { SittingMember } from "@/lib/elections";

interface SittingMemberBannerProps {
  member: SittingMember | null;
  /** "U.S. House" or "U.S. Senate" — already user-facing. */
  office: string;
  /** "PA-12" or "Pennsylvania seat" — what the seat is, not who holds it. */
  seatLabel: string;
  /** Shown when `member` is null. Omit to render nothing in that case. */
  emptyMessage?: string;
}

export default function SittingMemberBanner({ member, office, seatLabel, emptyMessage }: SittingMemberBannerProps) {
  if (!member) {
    if (!emptyMessage) return null;
    return <p className="rounded-2xl border border-dashed border-line-strong px-5 py-4 text-sm text-ink-2">{emptyMessage}</p>;
  }

  const name = displayName(member.name);
  return (
    <div className="card card-interactive group flex items-center gap-4 p-4 sm:p-5">
      <Avatar
        src={member.imageUrl ?? memberPhotoUrl(member.bioguideId)}
        name={name}
        size={48}
        variant="neutral"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-3">Currently held by</p>
        <Link href={`/members/${member.bioguideId}`} className="stretched-link mt-0.5 block font-semibold text-ink">
          {name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <PartyBadge party={member.party} compact />
          <span>
            {office} · {seatLabel}
          </span>
        </div>
      </div>
      <span className="hidden text-sm font-medium text-gold-bright sm:inline">Voting record</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </div>
  );
}
