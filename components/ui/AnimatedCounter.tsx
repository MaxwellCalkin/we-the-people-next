"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedCounterProps {
  target: number;
  label: string;
  duration?: number;
}

export default function AnimatedCounter({
  target,
  label,
  duration = 2,
}: AnimatedCounterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current || !numberRef.current) return;

    const counter = { value: 0 };

    const tween = gsap.to(counter, {
      value: target,
      duration,
      ease: "power2.out",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 85%",
        once: true,
      },
      onUpdate: () => {
        if (numberRef.current) {
          numberRef.current.textContent = Math.round(counter.value).toLocaleString();
        }
      },
    });

    return () => {
      tween.kill();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [target, duration]);

  return (
    <div ref={containerRef} className="text-center">
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
