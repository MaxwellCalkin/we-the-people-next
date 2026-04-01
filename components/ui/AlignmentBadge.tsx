// components/ui/AlignmentBadge.tsx
interface AlignmentBadgeProps {
  score: number | null;
  label: string;
  detail?: string;
  size?: "sm" | "lg";
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-cream/40";
  if (score >= 60) return "text-emerald-400";
  if (score >= 40) return "text-gold";
  return "text-red-400";
}

export default function AlignmentBadge({ score, label, detail, size = "sm" }: AlignmentBadgeProps) {
  const textSize = size === "lg" ? "text-2xl" : "text-xl";
  const labelSize = size === "lg" ? "text-xs" : "text-[0.65rem]";

  return (
    <div className="text-center">
      <p className={`${labelSize} uppercase tracking-wider text-cream/40`}>{label}</p>
      <p className={`${textSize} font-bold ${getScoreColor(score)} mt-0.5`}>
        {score !== null ? `${score}%` : "N/A"}
      </p>
      {detail && <p className="text-[0.7rem] text-cream/30 mt-0.5">{detail}</p>}
    </div>
  );
}
