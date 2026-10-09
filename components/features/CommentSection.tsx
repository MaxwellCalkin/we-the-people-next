"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, UserRound } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { loginHref } from "@/lib/safe-redirect";

interface CommentData {
  _id: string;
  comment: string;
  likes: number;
  createdAt: string;
}

interface CommentSectionProps {
  proposalId: string;
  initialComments: CommentData[];
  canComment: boolean;
}

const MAX_LENGTH = 1000;

export default function CommentSection({ proposalId, initialComments, canComment }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/comments/${proposalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      setNewComment("");
    } catch {
      setError("Your comment didn't post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="comments-heading" className="space-y-5">
      <h2 id="comments-heading" className="flex items-center gap-2 text-lg font-semibold text-ink">
        <MessageSquare className="h-5 w-5 text-gold-bright" aria-hidden="true" />
        Discussion
        <span className="rounded-full bg-white/[0.06] px-2 py-px text-sm font-medium tabular-nums text-ink-3">{comments.length}</span>
      </h2>

      {canComment ? (
        <form onSubmit={handleSubmit} className="card p-4">
          <label htmlFor="new-comment" className="sr-only">
            Add a comment
          </label>
          <textarea
            id="new-comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            maxLength={MAX_LENGTH}
            placeholder="Share your perspective or ask a question…"
            className="field resize-y"
          />
          {error && (
            <Alert tone="error" className="mt-3">
              {error}
            </Alert>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-ink-3">Comments are shown without your name.</span>
            <Button type="submit" size="sm" loading={loading} disabled={!newComment.trim()}>
              Post comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-2">Log in to join the discussion.</p>
          <Link
            href={loginHref(`/proposal/${proposalId}`)}
            className="text-sm font-semibold text-gold-bright underline-offset-4 hover:underline"
          >
            Log in to comment
          </Link>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-8 text-center text-sm text-ink-3">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c._id} className="flex gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-3 ring-1 ring-line-strong">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3">
                <p className="text-xs text-ink-3">
                  Community member ·{" "}
                  <time dateTime={c.createdAt} suppressHydrationWarning>
                    {formatDate(c.createdAt)}
                  </time>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{c.comment}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
