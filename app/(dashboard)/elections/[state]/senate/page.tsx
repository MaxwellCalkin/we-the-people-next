// app/(dashboard)/elections/[state]/senate/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { currentCycle } from "@/lib/fec";
import { getSittingMember, loadRaceCandidatesWithFinance } from "@/lib/elections";
import { getStateInfo, stateName } from "@/lib/states";
import connectDB from "@/lib/db";
import RaceCandidateList from "@/components/features/RaceCandidateList";
import SittingMemberBanner from "@/components/features/SittingMemberBanner";

interface SenatePageProps {
  params: Promise<{ state: string }>;
}

export default async function StateSenatePage({ params }: SenatePageProps) {
  const { state: stateParam } = await params;
  const state = stateParam.toUpperCase();
  const info = getStateInfo(state);
  if (!info) notFound();

  await connectDB();
  const cycle = currentCycle();

  const [candidates, sittingMember] = await Promise.all([
    loadRaceCandidatesWithFinance({
      state,
      office: "S",
      cycle,
    }),
    getSittingMember({ state, office: "S" }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header>
        <p className="text-cream/40 text-xs uppercase tracking-widest mb-1">
          <Link href="/elections" className="hover:text-cream">
            Elections
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={`/elections/${state}`} className="hover:text-cream">
            {info.name}
          </Link>
        </p>
        <h1 className="font-brand text-3xl sm:text-4xl text-gradient">
          {info.name} — U.S. Senate
        </h1>
        <p className="text-cream/40 text-sm mt-1">
          {cycle} general election. Sorted by total receipts.
        </p>
      </header>

      <SittingMemberBanner
        member={sittingMember}
        office="U.S. Senate"
        seatLabel={`${stateName(state)} seat`}
        emptyMessage={`Heard doesn’t have a confirmed sitting senator on file for the seat being contested in ${info.name} this cycle. (Each state has two senators; only one may be up.)`}
      />

      <RaceCandidateList
        candidates={candidates}
        emptyMessage={`No Senate race in ${info.name} this cycle.`}
      />
    </div>
  );
}
