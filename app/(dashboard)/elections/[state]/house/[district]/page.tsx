// app/(dashboard)/elections/[state]/house/[district]/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { currentCycle } from "@/lib/fec";
import { getSittingMember, loadRaceCandidatesWithFinance } from "@/lib/elections";
import { getStateInfo } from "@/lib/states";
import connectDB from "@/lib/db";
import RaceCandidateList from "@/components/features/RaceCandidateList";
import SittingMemberBanner from "@/components/features/SittingMemberBanner";

interface HouseRacePageProps {
  params: Promise<{ state: string; district: string }>;
}

export default async function HouseRacePage({ params }: HouseRacePageProps) {
  const { state: stateParam, district: districtParam } = await params;
  const state = stateParam.toUpperCase();
  const info = getStateInfo(state);
  if (!info) notFound();

  const districtNum = parseInt(districtParam, 10);
  if (
    !Number.isFinite(districtNum) ||
    districtNum < 1 ||
    (info.houseDistricts > 0 && districtNum > info.houseDistricts)
  ) {
    notFound();
  }
  const district = String(districtNum).padStart(2, "0");

  await connectDB();
  const cycle = currentCycle();

  const [candidatesResult, sittingMemberResult] = await Promise.allSettled([
    loadRaceCandidatesWithFinance({
      state,
      office: "H",
      district,
      cycle,
    }),
    getSittingMember({ state, office: "H", district }),
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
          {state}-{district} — U.S. House
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
        office="U.S. House"
        seatLabel={`${state}-${district}`}
      />

      <RaceCandidateList candidates={candidates} unavailable={candidatesResult.status === "rejected"} />
    </div>
  );
}
