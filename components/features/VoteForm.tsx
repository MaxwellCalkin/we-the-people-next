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
        // refresh() invalidates the client cache so the server component
        // on the /voted page fetches fresh data (user now has the vote recorded).
        // replace() prevents the back button returning to the vote form.
        router.refresh();
        router.replace(`/vote/${billSlug}/${congress}/voted`);
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
