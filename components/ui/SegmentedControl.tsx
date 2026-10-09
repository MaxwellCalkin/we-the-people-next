"use client";

import type { ReactNode } from "react";

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

/** Compact single-choice toggle group (buttons with aria-pressed). */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className = "",
}: {
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const pad = size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm";
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex items-center gap-0.5 rounded-xl border border-line-strong bg-field p-0.5 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-[0.6rem] font-medium whitespace-nowrap transition-colors ${pad} ${
              active
                ? "bg-surface-3 text-ink shadow-[0_1px_0_rgb(255_255_255/0.06)_inset] ring-1 ring-line-input"
                : "text-ink-3 hover:text-ink"
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
