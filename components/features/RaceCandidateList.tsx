// components/features/RaceCandidateList.tsx
//
// Renders an ordered list of CandidateCards for one race. Sorted by total
// receipts descending — money is the headline metric for the elections
// feature. Candidates with no totals sink to the bottom in name order.

import CandidateCard from "./CandidateCard";
import type { CandidateTotals } from "@/lib/fec";
import type { IRosterCandidate } from "@/models/ElectionRosterCache";

export interface RaceCandidate {
  candidate: IRosterCandidate;
  totals: CandidateTotals | null;
}

interface RaceCandidateListProps {
  candidates: RaceCandidate[];
  emptyMessage?: string;
}

function sortByReceipts(a: RaceCandidate, b: RaceCandidate): number {
  const ar = a.totals?.receipts ?? -1;
  const br = b.totals?.receipts ?? -1;
  if (ar !== br) return br - ar;
  return a.candidate.name.localeCompare(b.candidate.name);
}

export default function RaceCandidateList({
  candidates,
  emptyMessage = "No candidates have filed with the FEC for this race yet.",
}: RaceCandidateListProps) {
  if (candidates.length === 0) {
    return <p className="text-cream/50 text-sm">{emptyMessage}</p>;
  }

  const sorted = [...candidates].sort(sortByReceipts);

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {sorted.map((c) => (
        <CandidateCard
          key={c.candidate.fecId}
          candidate={c.candidate}
          totals={c.totals}
        />
      ))}
    </div>
  );
}
