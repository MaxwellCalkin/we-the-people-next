"use client";

import { useState } from "react";
import { ArrowBigUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginHref } from "@/lib/safe-redirect";

interface UpvoteButtonProps {
  proposalId: string;
  initialCount: number;
  initialUpvoted: boolean;
  canVote: boolean;
}

export default function UpvoteButton({ proposalId, initialCount, initialUpvoted, canVote }: UpvoteButtonProps) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!canVote) {
      router.push(loginHref(`/proposal/${proposalId}`));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/upvote`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const d = await res.json();
      setCount(d.upvoteCount);
      setUpvoted(d.hasUpvoted);
      router.refresh();
    } catch {
      toast.error("Your upvote didn't go through. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-ink-3">Support</p>
      <p className="mt-0.5 text-4xl font-semibold tabular-nums text-ink" aria-live="polite">
        {count.toLocaleString("en-US")}
        <span className="ml-2 text-base font-normal text-ink-3">{count === 1 ? "upvote" : "upvotes"}</span>
      </p>
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        aria-pressed={canVote ? upvoted : undefined}
        className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-[0.95rem] font-semibold transition-colors disabled:opacity-60 ${
          upvoted
            ? "border-gold bg-gold/15 text-gold-bright hover:bg-gold/20"
            : "border-gold/60 bg-gold text-gold-ink hover:bg-gold-bright"
        }`}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowBigUp className={`h-5 w-5 ${upvoted ? "fill-current" : ""}`} aria-hidden="true" />
        )}
        {!canVote ? "Log in to upvote" : upvoted ? "Upvoted" : "Upvote this proposal"}
      </button>
      {upvoted && <p className="mt-2 text-center text-xs text-ink-3">Click again to remove your upvote.</p>}
    </div>
  );
}
