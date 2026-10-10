// app/(dashboard)/elections/[state]/house/[district]/page.tsx
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentCycle } from "@/lib/fec";
import { getSittingMember, loadRaceCandidatesWithFinance } from "@/lib/elections";
import { getStateInfo } from "@/lib/states";
import { ordinal } from "@/lib/format";
import connectDB from "@/lib/db";
import RaceCandidateList from "@/components/features/RaceCandidateList";
import SittingMemberBanner from "@/components/features/SittingMemberBanner";
import PageHeader from "@/components/ui/PageHeader";

interface HouseRacePageProps {
  params: Promise<{ state: string; district: string }>;
}

export async function generateMetadata({ params }: HouseRacePageProps): Promise<Metadata> {
  const { state, district } = await params;
  const n = parseInt(district, 10);
  return { title: Number.isFinite(n) ? `${state.toUpperCase()}-${String(n).padStart(2, "0")} House race` : "House race" };
}

export default async function HouseRacePage({ params }: HouseRacePageProps) {
  const { state: stateParam, district: districtParam } = await params;
  const state = stateParam.toUpperCase();
  const info = getStateInfo(state);
  if (!info) notFound();

  const districtNum = parseInt(districtParam, 10);
  if (!Number.isFinite(districtNum) || districtNum < 1 || (info.houseDistricts > 0 && districtNum > info.houseDistricts)) {
    notFound();
  }
  const district = String(districtNum).padStart(2, "0");

  await connectDB();
  const cycle = currentCycle();

  const [candidatesResult, sittingMemberResult] = await Promise.allSettled([
    loadRaceCandidatesWithFinance({ state, office: "H", district, cycle }),
    getSittingMember({ state, office: "H", district }),
  ]);
  const candidates = candidatesResult.status === "fulfilled" ? candidatesResult.value : [];
  const sittingMember = sittingMemberResult.status === "fulfilled" ? sittingMemberResult.value : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumbs={[
          { label: "Elections", href: "/elections" },
          { label: info.name, href: `/elections/${state}` },
          { label: `${state}-${district}` },
        ]}
        eyebrow={`Federal candidate research · ${cycle - 1}–${cycle} cycle`}
        title={`${state}-${district} · U.S. House`}
        description={
          <>
            FEC filings and campaign finance for {info.houseDistricts === 1 ? `${info.name}'s at-large seat` : `${info.name}'s ${ordinal(districtNum)} district`}.{" "}
            <Link href="/elections" className="font-medium text-gold-bright underline-offset-2 hover:underline">
              Look up your official ballot
            </Link>
          </>
        }
      />

      <SittingMemberBanner member={sittingMember} office="U.S. House" seatLabel={`${state}-${district}`} />

      <RaceCandidateList candidates={candidates} unavailable={candidatesResult.status === "rejected"} />
    </div>
  );
}
