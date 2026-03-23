"use client";

import Link from "next/link";
import MagneticButton from "@/components/ui/MagneticButton";

export default function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="font-brand text-xl font-bold text-cream tracking-wider"
          >
            We The People
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-cream/80 hover:text-gold transition-colors px-4 py-2"
            >
              Log In
            </Link>
            <MagneticButton href="/signup" className="text-sm px-6 py-2">
              Sign Up
            </MagneticButton>
          </div>
        </div>
      </div>
    </nav>
  );
}
