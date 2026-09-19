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

  const [candidatesResult, sittingMemberResult] = await Promise.allSettled([
    loadRaceCandidatesWithFinance({
      state,
      office: "S",
      cycle,
    }),
    getSittingMember({ state, office: "S" }),
  ]);
  const candidates = candidatesResult.status === "fulfilled" ? candidatesResult.value : [];
  const sittingMember = sittingMemberResult.status === "fulfilled" ? sittingMemberResult.value : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header>
        <p className="text-cream/70 text-xs uppercase tracking-widest mb-1">
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
        <p className="text-cream/75 text-sm mt-2">
          Federal candidate research · {cycle - 1}–{cycle} finance cycle
        </p>
        <Link href="/elections" className="inline-block text-gold text-sm mt-3 hover:underline">
          Find official ballot information →
        </Link>
      </header>

      <SittingMemberBanner
        member={sittingMember}
        office="U.S. Senate"
        seatLabel={`${stateName(state)} seat`}
        emptyMessage={`A sitting senator could not be matched to these records. FEC filings alone do not establish which Senate seats are being contested in ${info.name}.`}
      />

      <RaceCandidateList
        candidates={candidates}
        unavailable={candidatesResult.status === "rejected"}
        emptyMessage={`No Senate candidate records were returned for ${info.name}. This does not establish whether a Senate election will be held; check the official election office.`}
      />
    </div>
  );
}
