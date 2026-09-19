// components/features/RaceCandidateList.tsx
//
// FEC research records, ordered alphabetically rather than by fundraising.
// These records do not establish ballot qualification or official ballot order.

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
  unavailable?: boolean;
}

export default function RaceCandidateList({
  candidates,
  emptyMessage = "No candidate records were returned by the FEC for this search. This does not confirm who will appear on the ballot.",
  unavailable = false,
}: RaceCandidateListProps) {
  if (unavailable) {
    return (
      <p role="status" className="rounded-lg border border-gold/30 bg-gold/5 p-4 text-cream/80 text-sm">
        Candidate information is temporarily unavailable. Please try again later
        or check your election office’s official sample ballot.
      </p>
    );
  }
  if (candidates.length === 0) {
    return <p className="text-cream/75 text-sm">{emptyMessage}</p>;
  }

  const sorted = [...candidates].sort((a, b) =>
    a.candidate.name.localeCompare(b.candidate.name)
  );

  return (
    <section aria-label="FEC candidate research">
      <p className="text-cream/75 text-sm mb-4 leading-relaxed">
        FEC candidate records, in alphabetical order. Filing and fundraising
        records are not confirmation of ballot qualification. Official ballot
        order may differ.
      </p>
    <div className="grid sm:grid-cols-2 gap-4">
      {sorted.map((c) => (
        <CandidateCard
          key={c.candidate.fecId}
          candidate={c.candidate}
          totals={c.totals}
        />
      ))}
    </div>
    </section>
  );
}
