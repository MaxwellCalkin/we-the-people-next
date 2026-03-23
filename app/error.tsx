"use client";

import MagneticButton from "@/components/ui/MagneticButton";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="glass-card max-w-md w-full text-center p-10">
        <h1 className="font-brand text-3xl sm:text-4xl text-gradient mb-4">
          Something went wrong
        </h1>
        <p className="text-cream/60 mb-8">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <MagneticButton onClick={reset}>Try Again</MagneticButton>
      </div>
    </div>
  );
}
