"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VoteButton from "@/components/ui/VoteButton";

interface VoteFormProps {
  billSlug: string;
  congress: string;
  title: string;
  summary: string;
}

export default function VoteForm({
  billSlug,
  congress,
  title,
  summary,
}: VoteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"yea" | "nay" | null>(null);

  const handleVote = async (action: "yea" | "nay") => {
    setLoading(action);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, billSlug, congress, title, summary }),
      });

      if (res.ok) {
        router.push(`/vote/${billSlug}/${congress}/voted`);
      } else {
        const data = await res.json();
        console.error("Vote failed:", data.error);
        setLoading(null);
      }
    } catch (err) {
      console.error("Vote error:", err);
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <VoteButton
        variant="yea"
        onClick={() => handleVote("yea")}
        loading={loading === "yea"}
        disabled={loading !== null}
      />
      <VoteButton
        variant="nay"
        onClick={() => handleVote("nay")}
        loading={loading === "nay"}
        disabled={loading !== null}
      />
    </div>
  );
}
