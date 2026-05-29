// components/features/SittingMemberBanner.tsx
//
// "Currently held by X" line shown at the top of a race detail page. Source
// is MemberScore (our own current-member data from Congress.gov), not the FEC
// candidate roster — so it stays correct when the sitting member hasn't filed
// for the upcoming election yet.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
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

export default function SittingMemberBanner({
  member,
  office,
  seatLabel,
  emptyMessage,
}: SittingMemberBannerProps) {
  if (!member) {
    if (!emptyMessage) return null;
    return (
      <GlassCard>
        <p className="text-cream/50 text-xs">{emptyMessage}</p>
      </GlassCard>
    );
  }

  return (
    <Link href={`/members/${member.bioguideId}`} className="block">
      <GlassCard hover>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.6rem] uppercase tracking-widest text-cream/40">
              Currently held by
            </p>
            <p className="text-cream font-medium text-sm mt-0.5">
              {member.name}{" "}
              <span className="text-cream/50">
                ({member.party?.[0] ?? "?"})
              </span>
            </p>
            <p className="text-cream/45 text-xs mt-0.5">
              {office} · {seatLabel} · view voting record →
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-cream/40 shrink-0" />
        </div>
      </GlassCard>
    </Link>
  );
}
