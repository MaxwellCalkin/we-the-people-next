import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gold text-gold-ink hover:bg-gold-bright shadow-[0_10px_24px_-14px_rgb(201_168_76/0.9)]",
  secondary:
    "bg-surface-2 text-ink border border-line-strong hover:bg-surface-3 hover:border-line-input",
  outline: "border border-gold/50 text-gold-bright hover:bg-gold/10 hover:border-gold",
  ghost: "text-ink-2 hover:text-ink hover:bg-white/[0.06]",
  danger: "bg-nay/10 text-nay border border-nay/35 hover:bg-nay/20",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return [BASE, VARIANTS[variant], SIZES[size], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

type ButtonProps = CommonProps &
  ComponentProps<"button"> & {
    loading?: boolean;
    loadingText?: string;
  };

export default function Button({
  variant,
  size,
  fullWidth,
  icon,
  iconRight,
  loading = false,
  loadingText,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {loading && loadingText ? loadingText : children}
      {!loading && iconRight}
    </button>
  );
}

type ButtonLinkProps = CommonProps &
  Omit<ComponentProps<typeof Link>, "href"> & {
    href: string;
    /** Opens in a new tab with rel=noopener; use for off-site links. */
    external?: boolean;
  };

export function ButtonLink({
  variant,
  size,
  fullWidth,
  icon,
  iconRight,
  className,
  children,
  href,
  external = false,
  ...rest
}: ButtonLinkProps) {
  const classes = buttonClasses({ variant, size, fullWidth, className });
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {icon}
        {children}
        {iconRight}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
