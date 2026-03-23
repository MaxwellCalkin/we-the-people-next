"use client";

interface RepVote {
  name: string;
  vote: string;
  role?: string;
}

interface RepVoteDisplayProps {
  reps: RepVote[];
}

function voteColor(vote: string): string {
  switch (vote) {
    case "Yea":
    case "Aye":
      return "text-emerald-400";
    case "Nay":
    case "No":
      return "text-red-400";
    case "Passed by Unanimous Consent":
    case "Passed by Voice Vote":
      return "text-gold";
    default:
      return "text-cream/50";
  }
}

export default function RepVoteDisplay({ reps }: RepVoteDisplayProps) {
  if (reps.length === 0) {
    return (
      <p className="text-cream/50 text-sm">
        No representative data available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reps.map((rep, index) => (
        <div
          key={index}
          className="flex items-center justify-between glass-card py-3 px-4"
        >
          <div>
            <p className="text-cream text-sm font-medium">{rep.name}</p>
            {rep.role && (
              <p className="text-cream/50 text-xs">{rep.role}</p>
            )}
          </div>
          <span className={`text-sm font-semibold ${voteColor(rep.vote)}`}>
            {rep.vote}
          </span>
        </div>
      ))}
    </div>
  );
}
