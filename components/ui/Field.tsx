import type { ReactNode } from "react";

/** Build aria-describedby for a control rendered inside <Field>. */
export function describedBy(id: string, { hint, error }: { hint?: ReactNode; error?: ReactNode }) {
  const ids = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return ids || undefined;
}

export default function Field({
  id,
  label,
  hint,
  error,
  optional = false,
  trailing,
  children,
  className = "",
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  /** Rendered to the right of the label, e.g. a character count or link. */
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {optional && <span className="ml-1.5 font-normal text-ink-3">(optional)</span>}
        </label>
        {trailing && <span className="text-xs text-ink-3">{trailing}</span>}
      </div>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-nay">
          {error}
        </p>
      )}
    </div>
  );
}
