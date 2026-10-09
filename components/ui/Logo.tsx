import Link from "next/link";

/** Heard brand mark: three "voice level" bars on a gold tile. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="9" fill="#c9a84c" />
      <path d="M9 0h14a9 9 0 0 1 9 9v5C22 18 10 18 0 14V9a9 9 0 0 1 9-9Z" fill="#fff" fillOpacity="0.16" />
      <g fill="#0b1728">
        <rect x="8" y="12.5" width="3.4" height="7" rx="1.7" />
        <rect x="14.3" y="7.5" width="3.4" height="17" rx="1.7" />
        <rect x="20.6" y="10.5" width="3.4" height="11" rx="1.7" />
      </g>
    </svg>
  );
}

export default function Logo({
  href = "/",
  size = "md",
  className = "",
}: {
  href?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const mark = size === "lg" ? 36 : 28;
  return (
    <Link
      href={href}
      aria-label="Heard home"
      className={`group inline-flex items-center gap-2.5 rounded-lg ${className}`}
    >
      <LogoMark size={mark} className="transition-transform duration-200 group-hover:-rotate-3" />
      <span
        className={`font-brand font-bold tracking-wide text-ink ${size === "lg" ? "text-[1.9rem]" : "text-[1.45rem]"} leading-none`}
      >
        Heard
      </span>
    </Link>
  );
}
