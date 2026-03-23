"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface Orb {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
}

export default function HeroAnimation() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const container = canvasRef.current;
    const colors = [
      "rgba(201, 168, 76, 0.15)",
      "rgba(201, 168, 76, 0.1)",
      "rgba(245, 241, 235, 0.06)",
      "rgba(26, 41, 66, 0.4)",
      "rgba(201, 168, 76, 0.08)",
      "rgba(245, 241, 235, 0.04)",
    ];

    const orbs: Orb[] = [];
    const orbElements: HTMLDivElement[] = [];

    // Create 12 orbs
    for (let i = 0; i < 12; i++) {
      const orb: Orb = {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 200 + 60,
        color: colors[i % colors.length],
        opacity: Math.random() * 0.5 + 0.1,
      };
      orbs.push(orb);

      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.borderRadius = "50%";
      el.style.width = `${orb.size}px`;
      el.style.height = `${orb.size}px`;
      el.style.background = `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`;
      el.style.left = `${orb.x}%`;
      el.style.top = `${orb.y}%`;
      el.style.opacity = `${orb.opacity}`;
      el.style.filter = "blur(40px)";
      el.style.pointerEvents = "none";
      container.appendChild(el);
      orbElements.push(el);
    }

    // Animate each orb with a GSAP timeline
    const tweens = orbElements.map((el, i) => {
      const duration = 8 + Math.random() * 12;
      return gsap.to(el, {
        x: `${(Math.random() - 0.5) * 200}`,
        y: `${(Math.random() - 0.5) * 200}`,
        opacity: orbs[i].opacity * (0.5 + Math.random() * 0.5),
        duration,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random() * 5,
      });
    });

    return () => {
      tweens.forEach((t) => t.kill());
      orbElements.forEach((el) => el.remove());
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    />
  );
}
