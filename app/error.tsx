"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Button, { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="flex min-h-screen flex-1 items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-md text-center">
        <LogoMark size={40} className="mx-auto" />
        <span className="mx-auto mt-8 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-nay/10 text-nay ring-1 ring-nay/30">
          <TriangleAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-brand text-4xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-3 leading-relaxed text-ink-2">
          This page hit an unexpected problem. It might be a temporary hiccup with one of our data sources, so trying
          again often works.
        </p>
        {error.digest && <p className="mt-3 text-xs text-ink-3">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => unstable_retry()} icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary">
            Go to the home page
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
