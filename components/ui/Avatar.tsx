// components/ui/Avatar.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  /** "gold" for people on Heard, "neutral" for members of Congress without a photo. */
  variant?: "gold" | "neutral";
  /** Square-ish portrait corners instead of a circle. */
  shape?: "circle" | "rounded";
}

function getInitials(name: string): string {
  return name
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({
  src,
  name,
  size = 64,
  className = "",
  variant = "gold",
  shape = "circle",
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";

  if (src && !imgError) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        // Congress.gov already serves member photos as small JPEGs. Loading
        // them directly keeps the member directory's ~540 photos from using
        // up Vercel's free image optimization quota.
        unoptimized={src.startsWith("https://www.congress.gov/")}
        className={`${radius} object-cover object-top bg-surface-3 ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  const palette =
    variant === "gold"
      ? "bg-gradient-to-br from-gold-bright to-gold-deep text-gold-ink"
      : "bg-surface-3 text-ink-2 ring-1 ring-inset ring-line-strong";

  return (
    <div
      role="img"
      aria-label={name}
      className={`${radius} ${palette} flex shrink-0 items-center justify-center font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
    >
      <span aria-hidden="true">{getInitials(name) || "?"}</span>
    </div>
  );
}
