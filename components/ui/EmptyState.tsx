import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
  compact = false,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center rounded-2xl border border-dashed border-line-strong bg-surface/60 ${
        compact ? "px-5 py-8" : "px-6 py-12 sm:py-16"
      } ${className}`}
    >
      {Icon && (
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold-bright ring-1 ring-gold/25">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <h2 className="text-lg font-semibold text-ink text-balance">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-2 text-pretty">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
