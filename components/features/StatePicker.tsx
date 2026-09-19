// components/features/StatePicker.tsx
//
// Neutral grid of all states + DC + territories. Every user — logged in or
// out — can drill into any state. We do not visually treat the user's own
// state as "selected" because this is an optional research directory.

import Link from "next/link";
import { STATES } from "@/lib/states";

interface StatePickerProps {
  title?: string;
  subtitle?: string;
}

export default function StatePicker({
  title = "Browse Federal Races by State",
  subtitle = "Explore FEC candidate records and campaign finance. These lists are not official ballots.",
}: StatePickerProps) {
  return (
    <section id="browse" className="scroll-mt-20">
      <h2 className="font-brand text-lg text-cream mb-1">{title}</h2>
      {subtitle && (
        <p className="text-cream/75 text-sm mb-4 leading-relaxed">
          {subtitle}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {STATES.map((s) => (
          <Link
            key={s.code}
            href={`/elections/${s.code}`}
            className="flex items-center gap-2 rounded-md px-3 py-3 text-sm border border-glass-border bg-glass-bg text-cream/85 hover:text-cream hover:border-gold/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            title={s.name}
          >
            <span className="text-gold text-xs font-medium w-5 shrink-0">{s.code}</span>
            <span>{s.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
