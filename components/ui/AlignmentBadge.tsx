// components/ui/AlignmentBadge.tsx
export function scoreTone(score: number | null): { text: string; bar: string; label: string } {
  if (score === null) return { text: "text-ink-3", bar: "bg-ink-3", label: "Not enough shared votes" };
  if (score >= 60) return { text: "text-yea", bar: "bg-yea", label: "Mostly agrees" };
  if (score >= 40) return { text: "text-gold-bright", bar: "bg-gold", label: "Mixed record" };
  return { text: "text-nay", bar: "bg-nay", label: "Mostly disagrees" };
}

interface AlignmentBadgeProps {
  score: number | null;
  label: string;
  detail?: string;
  size?: "sm" | "lg";
  align?: "center" | "start";
}

/** Percentage + meter showing how often a member's votes match a position. */
export default function AlignmentBadge({
  score,
  label,
  detail,
  size = "sm",
  align = "center",
}: AlignmentBadgeProps) {
  const tone = scoreTone(score);
  const value = size === "lg" ? "text-3xl" : "text-2xl";
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <p className="text-xs font-medium text-ink-3">{label}</p>
      <p className={`${value} mt-1 font-semibold tabular-nums ${tone.text}`}>
        {score !== null ? `${score}%` : "—"}
      </p>
      <div
        className={`mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07] ${align === "center" ? "mx-auto max-w-[9rem]" : ""}`}
        aria-hidden="true"
      >
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score ?? 0}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-3">{detail ?? tone.label}</p>
    </div>
  );
}
