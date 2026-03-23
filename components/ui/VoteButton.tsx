"use client";

import { useRef } from "react";
import gsap from "gsap";
import { Loader2 } from "lucide-react";

interface VoteButtonProps {
  variant: "yea" | "nay";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function VoteButton({
  variant,
  onClick,
  disabled = false,
  loading = false,
}: VoteButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    if (!btnRef.current || disabled || loading) return;
    gsap.to(btnRef.current, {
      scale: 1.08,
      duration: 0.25,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const isYea = variant === "yea";
  const variantClasses = isYea
    ? "bg-gradient-to-r from-emerald-600 to-gold text-navy-900 hover:shadow-[0_0_20px_rgba(201,168,76,0.3)]"
    : "bg-gradient-to-r from-red-accent to-red-700 text-white hover:shadow-[0_0_20px_rgba(185,28,28,0.3)]";

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-shadow duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : null}
      {isYea ? "Yea" : "Nay"}
    </button>
  );
}
