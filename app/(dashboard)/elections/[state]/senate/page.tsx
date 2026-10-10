// app/(dashboard)/elections/[state]/senate/page.tsx
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentCycle } from "@/lib/fec";
import { getSittingMember, loadRaceCandidatesWithFinance } from "@/lib/elections";
import { getStateInfo, stateName } from "@/lib/states";
import connectDB from "@/lib/db";
import RaceCandidateList from "@/components/features/RaceCandidateList";
import SittingMemberBanner from "@/components/features/SittingMemberBanner";
import PageHeader from "@/components/ui/PageHeader";

interface SenatePageProps {
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: SenatePageProps): Promise<Metadata> {
  const { state } = await params;
  const info = getStateInfo(state);
  return { title: info ? `${info.name} Senate race` : "Senate race" };
}

export default async function StateSenatePage({ params }: SenatePageProps) {
  const { state: stateParam } = await params;
  const state = stateParam.toUpperCase();
  const info = getStateInfo(state);
  if (!info) notFound();

  await connectDB();
  const cycle = currentCycle();

  const [candidatesResult, sittingMemberResult] = await Promise.allSettled([
    loadRaceCandidatesWithFinance({ state, office: "S", cycle }),
    getSittingMember({ state, office: "S" }),
  ]);
  const candidates = candidatesResult.status === "fulfilled" ? candidatesResult.value : [];
  const sittingMember = sittingMemberResult.status === "fulfilled" ? sittingMemberResult.value : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumbs={[
          { label: "Elections", href: "/elections" },
          { label: info.name, href: `/elections/${state}` },
          { label: "U.S. Senate" },
        ]}
        eyebrow={`Federal candidate research · ${cycle - 1}–${cycle} cycle`}
        title={`${info.name} · U.S. Senate`}
        description={
          <>
            FEC filings and campaign finance.{" "}
            <Link href="/elections" className="font-medium text-gold-bright underline-offset-2 hover:underline">
              Look up your official ballot
            </Link>
          </>
        }
      />

      <SittingMemberBanner
        member={sittingMember}
        office="U.S. Senate"
        seatLabel={`${stateName(state)} seat`}
        emptyMessage={`FEC filings alone don't establish which of ${info.name}'s Senate seats is on this ballot, so no sitting senator is shown.`}
      />

      <RaceCandidateList
        candidates={candidates}
        unavailable={candidatesResult.status === "rejected"}
        emptyMessage={`No Senate candidate records were returned for ${info.name}. This doesn't establish whether a Senate election will be held; check the official election office.`}
      />
    </div>
  );
}
