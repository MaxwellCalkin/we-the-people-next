"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";

interface VoteFormProps {
  billSlug: string;
  congress: string;
  title: string;
  summary: string;
}

type Choice = "yea" | "nay";

const OPTIONS: { value: Choice; label: string; meaning: string; icon: typeof ThumbsUp }[] = [
  { value: "yea", label: "Yea", meaning: "I support this bill", icon: ThumbsUp },
  { value: "nay", label: "Nay", meaning: "I oppose this bill", icon: ThumbsDown },
];

export default function VoteForm({ billSlug, congress, title, summary }: VoteFormProps) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choice) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: choice, billSlug, congress, title, summary }),
      });

      if (res.ok || res.status === 409) {
        // refresh() invalidates the client cache so the /voted page reads the new vote;
        // replace() keeps the back button from returning to this form.
        router.refresh();
        router.replace(`/vote/${billSlug}/${congress}/voted`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error === "Unauthorized" ? "Your session expired. Log in again to vote." : "Your vote didn't go through. Please try again.");
      setSubmitting(false);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <fieldset disabled={submitting}>
        <legend className="sr-only">How would you vote on this bill?</legend>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((option) => {
            const selected = choice === option.value;
            const tone =
              option.value === "yea"
                ? selected
                  ? "border-yea bg-yea/10 text-yea ring-1 ring-yea/40"
                  : "hover:border-yea/50"
                : selected
                  ? "border-nay bg-nay/10 text-nay ring-1 ring-nay/40"
                  : "hover:border-nay/50";
            return (
              <label
                key={option.value}
                className={`group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-line-strong bg-field px-3 py-4 text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-bright ${tone}`}
              >
                <input
                  type="radio"
                  name="vote"
                  value={option.value}
                  checked={selected}
                  onChange={() => setChoice(option.value)}
                  className="sr-only"
                />
                <option.icon className={`h-6 w-6 ${selected ? "" : "text-ink-3 group-hover:text-ink-2"}`} aria-hidden="true" />
                <span className={`text-lg font-semibold ${selected ? "" : "text-ink"}`}>{option.label}</span>
                <span className="text-xs text-ink-3">{option.meaning}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        size="lg"
        fullWidth
        className="mt-4"
        disabled={!choice}
        loading={submitting}
        loadingText="Casting your vote…"
      >
        {choice ? `Cast my ${choice === "yea" ? "Yea" : "Nay"} vote` : "Choose Yea or Nay"}
      </Button>
      <p className="mt-3 text-center text-xs leading-relaxed text-ink-3">
        Votes are final. Yours counts toward the community totals and your alignment scores.
      </p>
    </form>
  );
}
