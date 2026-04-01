// components/ui/Avatar.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({ src, name, size = 64, className = "" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-gold to-gold/70 flex items-center justify-center font-bold text-navy-900 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name)}
    </div>
  );
}
