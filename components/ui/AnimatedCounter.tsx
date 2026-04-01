"use client";

interface AnimatedCounterProps {
  target: number;
  label: string;
  duration?: number;
}

export default function AnimatedCounter({
  target,
  label,
}: AnimatedCounterProps) {
  return (
    <div className="text-center">
      <span className="block text-5xl md:text-6xl font-bold text-gradient">
        {target.toLocaleString()}
      </span>
      <span className="mt-2 block text-sm uppercase tracking-widest text-cream/70">
        {label}
      </span>
    </div>
  );
}
