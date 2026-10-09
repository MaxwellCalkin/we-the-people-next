import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { agreement, displayName, memberVoteInfo } from "@/lib/format";

export interface RepVote {
  id: string;
  name: string;
  vote: string;
  role: string;
}

interface RepVoteDisplayProps {
  reps: RepVote[];
  userVote: "Yea" | "Nay" | null;
}

const AGREEMENT = {
  agree: { label: "Agrees with you", icon: Check, chip: "bg-yea/12 text-yea border-yea/30" },
  disagree: { label: "Disagrees with you", icon: X, chip: "bg-nay/12 text-nay border-nay/30" },
  none: { label: "", icon: Minus, chip: "bg-white/[0.04] text-ink-3 border-line-strong" },
} as const;

export function agreementSummary(reps: RepVote[], userVote: "Yea" | "Nay" | null): string {
  const recorded = reps.filter((r) => memberVoteInfo(r.vote).position !== null);
  if (reps.length === 0) return "We couldn't find your representatives.";
  if (recorded.length === 0) return "None of your representatives have a recorded vote on this bill yet.";
  if (!userVote) return `${recorded.length} of ${reps.length} have a recorded vote.`;
  const agreeing = recorded.filter((r) => agreement(userVote, r.vote) === "agree").length;
  return `${agreeing} of ${recorded.length} who voted agreed with you.`;
}

export default function RepVoteDisplay({ reps, userVote }: RepVoteDisplayProps) {
  if (reps.length === 0) {
    return (
      <p className="text-sm text-ink-2">
        We couldn&apos;t load your representatives. Make sure your district is set on your{" "}
        <Link href="/profile" className="font-medium text-gold-bright underline-offset-2 hover:underline">
          profile
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {reps.map((rep) => {
        const info = memberVoteInfo(rep.vote);
        const match = agreement(userVote, rep.vote);
        const style = AGREEMENT[match];
        const name = displayName(rep.name);
        return (
          <li key={rep.id || rep.name} className="relative flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
            <Avatar
              src={rep.id ? `https://www.congress.gov/img/member/${rep.id.toLowerCase()}_200.jpg` : null}
              name={name}
              size={44}
              variant="neutral"
            />
            <div className="min-w-0 flex-1">
              {rep.id ? (
                <Link href={`/members/${rep.id}`} className="block truncate font-semibold text-ink hover:text-gold-bright">
                  {name}
                </Link>
              ) : (
                <p className="truncate font-semibold text-ink">{name}</p>
              )}
              <p className="text-sm text-ink-3">{rep.role}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span
                className={`text-sm font-semibold ${
                  info.position === "Yea" ? "text-yea" : info.position === "Nay" ? "text-nay" : "text-ink-3"
                }`}
              >
                {info.label}
              </span>
              {match !== "none" && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${style.chip}`}>
                  <style.icon className="h-3 w-3" aria-hidden="true" />
                  {style.label}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
