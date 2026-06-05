"use client";
import { useState } from "react";
import { ArrowBigUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpvoteButtonProps {
  proposalId: string; initialCount: number; initialUpvoted: boolean; canVote: boolean;
}

export default function UpvoteButton({ proposalId, initialCount, initialUpvoted, canVote }: UpvoteButtonProps) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!canVote) { router.push("/login"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/upvote`, { method: "POST" });
      if (res.ok) { const d = await res.json(); setCount(d.upvoteCount); setUpvoted(d.hasUpvoted); }
    } catch (e) { console.error("Error upvoting:", e); } finally { setLoading(false); }
  };

  return (
    <button onClick={handle} disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        upvoted ? "border-gold/60 bg-gold/10 text-gold" : "border-glass-border text-cream/70 hover:text-gold hover:border-gold/40"}`}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowBigUp className={`h-4 w-4 ${upvoted ? "fill-current" : ""}`} />}
      <span>{count}</span><span className="text-xs font-normal">{upvoted ? "Upvoted" : "Upvote"}</span>
    </button>
  );
}
