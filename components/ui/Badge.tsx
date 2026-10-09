import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "gold" | "yea" | "nay" | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-white/[0.04] text-ink-2 border-line-strong",
  gold: "bg-gold/10 text-gold-bright border-gold/35",
  yea: "bg-yea/10 text-yea border-yea/30",
  nay: "bg-nay/10 text-nay border-nay/30",
  info: "bg-info/10 text-info border-info/30",
};

export default function Badge({
  tone = "neutral",
  size = "sm",
  icon,
  className = "",
  children,
}: {
  tone?: BadgeTone;
  size?: "sm" | "md";
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const sizing = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium leading-5 whitespace-nowrap ${sizing} ${TONES[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

/** Yea/Nay/other vote position chip with consistent colors across the app. */
export function VoteBadge({ vote, size = "sm" }: { vote: string; size?: "sm" | "md" }) {
  const normalized = vote === "Aye" ? "Yea" : vote === "No" ? "Nay" : vote;
  const tone: BadgeTone = normalized === "Yea" ? "yea" : normalized === "Nay" ? "nay" : "neutral";
  return (
    <Badge tone={tone} size={size}>
      {normalized}
    </Badge>
  );
}
