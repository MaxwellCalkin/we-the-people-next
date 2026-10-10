import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className = "" }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-3">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex items-center gap-1 min-w-0">
              {item.href && !last ? (
                <Link href={item.href} className="truncate hover:text-ink transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate text-ink-2" aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function PageHeader({
  title,
  eyebrow,
  description,
  breadcrumbs,
  actions,
  children,
  className = "",
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-8 ${className}`}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-4" />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="font-brand text-[2rem] leading-[1.1] sm:text-[2.6rem] font-semibold text-ink text-balance">
            {title}
          </h1>
          {description && (
            <div className="mt-3 text-base leading-relaxed text-ink-2 text-pretty">{description}</div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Section title used inside pages (not a page H1). */
export function SectionHeading({
  title,
  description,
  action,
  as: Tag = "h2",
  id,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 ${className}`}>
      <div className="min-w-0">
        <Tag id={id} className="text-lg font-semibold text-ink">
          {title}
        </Tag>
        {description && <p className="mt-1 text-sm text-ink-3 text-pretty">{description}</p>}
      </div>
      {action}
    </div>
  );
}
