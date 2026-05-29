// components/features/StatePicker.tsx
//
// Neutral grid of all states + DC + territories. Every user — logged in or
// out — can drill into any state. We do not visually treat the user's own
// state as "selected" because nothing is selected on this page; "Your Ballot"
// already surfaces their state up top.

import Link from "next/link";
import { STATES } from "@/lib/states";

interface StatePickerProps {
  title?: string;
  subtitle?: string;
}

export default function StatePicker({
  title = "Browse Federal Races by State",
  subtitle = "Pick any state to see its U.S. House and Senate races.",
}: StatePickerProps) {
  return (
    <section id="browse" className="scroll-mt-20">
      <h2 className="font-brand text-lg text-cream mb-1">{title}</h2>
      {subtitle && (
        <p className="text-cream/40 text-xs mb-3 leading-relaxed">
          {subtitle}
        </p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {STATES.map((s) => (
          <Link
            key={s.code}
            href={`/elections/${s.code}`}
            className="text-center rounded-md px-2 py-2 text-xs border border-glass-border bg-glass-bg text-cream/70 hover:text-cream hover:border-cream/30 transition-colors"
            title={s.name}
          >
            <span className="font-medium tracking-wider">{s.code}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
