import { voteShares } from "@/lib/format";

/**
 * Horizontal Yea/Nay split with counts. Renders an explicit "no votes yet"
 * state instead of an empty bar.
 */
export default function VoteSplitBar({
  yeas,
  nays,
  label,
  emptyText = "No votes yet",
  size = "md",
}: {
  yeas: number;
  nays: number;
  label?: string;
  emptyText?: string;
  size?: "sm" | "md";
}) {
  const { yea, nay, total } = voteShares(yeas, nays);
  const height = size === "sm" ? "h-2" : "h-3";

  return (
    <div>
      {label && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className="text-xs text-ink-3 tabular-nums">
            {total === 0 ? emptyText : `${total.toLocaleString("en-US")} ${total === 1 ? "vote" : "votes"}`}
          </span>
        </div>
      )}
      <div
        className={`flex ${height} overflow-hidden rounded-full bg-white/[0.06]`}
        role="img"
        aria-label={total === 0 ? emptyText : `${yea}% Yea, ${nay}% Nay`}
      >
        {total > 0 && (
          <>
            <div className="bg-yea transition-[width] duration-500" style={{ width: `${yea}%` }} />
            <div className="bg-nay transition-[width] duration-500" style={{ width: `${nay}%` }} />
          </>
        )}
      </div>
      {total > 0 && (
        <div className="mt-2 flex justify-between text-sm tabular-nums">
          <span className="text-yea">
            <span className="font-semibold">{yea}%</span> Yea{" "}
            <span className="text-ink-3">({yeas.toLocaleString("en-US")})</span>
          </span>
          <span className="text-nay">
            <span className="text-ink-3">({nays.toLocaleString("en-US")})</span> Nay{" "}
            <span className="font-semibold">{nay}%</span>
          </span>
        </div>
      )}
    </div>
  );
}
