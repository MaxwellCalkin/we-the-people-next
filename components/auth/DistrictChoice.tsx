"use client";

export interface DistrictOption {
  number: number;
  proportion: number;
}

/** Radio cards for ZIP codes that span more than one congressional district. */
export default function DistrictChoice({
  state,
  districts,
  value,
  onChange,
}: {
  state: string;
  districts: DistrictOption[];
  value: number | null;
  onChange: (district: number) => void;
}) {
  const code = state.toUpperCase();
  return (
    <fieldset className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-4">
      <legend className="px-1 text-sm font-semibold text-ink">Which district are you in?</legend>
      <p className="mb-3 text-sm text-ink-2">
        Your ZIP code is split between {districts.length} congressional districts. Pick the one on your voter
        registration. You can look it up at{" "}
        <a
          href="https://www.house.gov/representatives/find-your-representative"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gold-bright underline underline-offset-2 hover:text-gold"
        >
          house.gov
        </a>
        .
      </p>
      <div className="space-y-2">
        {districts.map((d) => {
          const checked = value === d.number;
          return (
            <label
              key={d.number}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                checked ? "border-gold bg-gold/10" : "border-line-strong bg-field hover:border-line-input"
              }`}
            >
              <input
                type="radio"
                name="district"
                value={d.number}
                checked={checked}
                onChange={() => onChange(d.number)}
                className="h-4 w-4 accent-[#c9a84c]"
              />
              <span className="font-medium text-ink">
                {code}-{String(d.number).padStart(2, "0")}
              </span>
              <span className="ml-auto text-xs text-ink-3">
                {Math.round(d.proportion * 100)}% of this ZIP
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
