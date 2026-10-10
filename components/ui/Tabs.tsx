"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string) => `${prefix}-panel`;

/**
 * Accessible tab list (WAI-ARIA tabs pattern): arrow keys / Home / End move
 * between tabs, only the selected tab is in the tab order. Pair with
 * <TabPanel prefix=… active=…>.
 */
export function TabList<T extends string>({
  items,
  value,
  onChange,
  label,
  prefix,
  className = "",
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  prefix: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] ${className}`}
    >
      {items.map((item, i) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={tabId(prefix, item.id)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId(prefix)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`relative -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-2 text-sm font-semibold transition-colors ${
              selected
                ? "border-gold text-ink"
                : "border-transparent text-ink-3 hover:text-ink-2 hover:border-line-strong"
            }`}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-px text-xs tabular-nums ${
                  selected ? "bg-gold/15 text-gold-bright" : "bg-white/[0.06] text-ink-3"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  prefix,
  active,
  children,
  className = "",
}: {
  prefix: string;
  active: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={panelId(prefix)}
      aria-labelledby={tabId(prefix, active)}
      tabIndex={0}
      className={`focus-visible:outline-none ${className}`}
    >
      {children}
    </div>
  );
}
