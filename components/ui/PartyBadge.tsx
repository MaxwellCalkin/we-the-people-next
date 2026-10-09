import { partyInfo } from "@/lib/format";

const DOT: Record<string, string> = {
  D: "bg-party-d",
  R: "bg-party-r",
  I: "bg-party-i",
};

/** Small neutral chip with a party-colored dot. `compact` shows only the letter. */
export default function PartyBadge({
  party,
  compact = false,
  className = "",
}: {
  party: string | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const info = partyInfo(party);
  if (!info.code) return null;
  return (
    <span
      title={info.label}
      className={`inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-ink-2 ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT[info.code] ?? "bg-ink-3"}`} aria-hidden="true" />
      {compact ? (
        <>
          <span aria-hidden="true">{info.code}</span>
          <span className="sr-only">{info.label}</span>
        </>
      ) : (
        info.label
      )}
    </span>
  );
}
