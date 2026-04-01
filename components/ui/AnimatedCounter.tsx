"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface AnimatedCounterProps {
  target: number;
  label: string;
  duration?: number;
}

export default function AnimatedCounter({
  target,
  label,
  duration = 1.5,
}: AnimatedCounterProps) {
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!numberRef.current) return;

    const counter = { value: 0 };

    const tween = gsap.to(counter, {
      value: target,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        if (numberRef.current) {
          numberRef.current.textContent = Math.round(
            counter.value
          ).toLocaleString();
        }
      },
    });

    return () => {
      tween.kill();
    };
  }, [target, duration]);

  return (
    <div className="text-center">
      <span
        ref={numberRef}
        className="block text-5xl md:text-6xl font-bold text-gradient"
      >
        0
      </span>
      <span className="mt-2 block text-sm uppercase tracking-widest text-cream/70">
        {label}
      </span>
    </div>
  );
}
