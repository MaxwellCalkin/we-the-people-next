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
  title = "Browse federal races by state",
  subtitle = "Explore FEC candidate records and campaign finance. These lists are not official ballots.",
}: StatePickerProps) {
  return (
    <section id="browse" className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 mb-4 text-sm leading-relaxed text-ink-2">{subtitle}</p>}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {STATES.map((s) => (
          <li key={s.code}>
            <Link
              href={`/elections/${s.code}`}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink-2 transition-colors hover:border-gold/50 hover:text-ink"
            >
              <span className="w-6 shrink-0 text-xs font-semibold text-gold-bright">{s.code}</span>
              <span className="truncate">{s.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
