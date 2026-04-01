// components/features/MemberCard.tsx
import Avatar from "@/components/ui/Avatar";

interface MemberCardProps {
  rank: number | null;
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  communityScore: number | null;
  matchingVotes: number;
  totalCompared: number;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-cream/30";
  if (score >= 60) return "text-emerald-400";
  if (score >= 40) return "text-gold";
  return "text-red-400";
}

export default function MemberCard({
  rank,
  bioguideId,
  name,
  party,
  state,
  district,
  chamber,
  communityScore,
  matchingVotes,
  totalCompared,
}: MemberCardProps) {
  const prefix = chamber === "Senate" ? "Sen." : "Rep.";
  const location = chamber === "Senate" ? state : `${state}-${district}`;
  const isNA = communityScore === null;

  return (
    <div
      className="glass-card glass-hover flex items-center gap-3 sm:gap-4 py-3 px-4"
    >
      <span
        className={`font-bold text-sm w-8 text-center shrink-0 ${
          rank === 1 ? "text-gold" : "text-cream/40"
        }`}
      >
        {rank !== null ? `#${rank}` : "—"}
      </span>
      <Avatar
        src={`https://www.congress.gov/img/member/${bioguideId.toLowerCase()}_200.jpg`}
        name={name}
        size={44}
        className="border-2 border-gold/20 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-cream text-sm font-semibold truncate">
          {prefix} {name}
        </p>
        <p className="text-cream/40 text-xs">
          {party} · {location} · {chamber}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-lg font-bold ${getScoreColor(communityScore)}`}>
          {communityScore !== null ? `${communityScore}%` : "N/A"}
        </p>
        {totalCompared > 0 && (
          <p className="text-[0.6rem] text-cream/30">
            {matchingVotes}/{totalCompared} votes
          </p>
        )}
        {totalCompared === 0 && (
          <p className="text-[0.6rem] text-cream/20">no overlap</p>
        )}
      </div>
    </div>
  );
}
