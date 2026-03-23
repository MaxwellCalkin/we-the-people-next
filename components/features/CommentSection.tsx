"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { MessageSquare, Loader2 } from "lucide-react";

interface CommentData {
  _id: string;
  comment: string;
  likes: number;
  createdAt: string;
}

interface CommentSectionProps {
  postId: string;
  initialComments: CommentData[];
}

export default function CommentSection({
  postId,
  initialComments,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        // Optimistically add comment to the top
        setComments((prev) => [data.comment, ...prev]);
        setNewComment("");
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-brand text-lg text-cream flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-gold" />
        Comments ({comments.length})
      </h3>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={2}
          placeholder="Add a comment..."
          className="flex-1 bg-white/5 border border-glass-border rounded-lg px-4 py-2 text-sm text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all resize-none"
        />
        <button
          type="submit"
          disabled={loading || !newComment.trim()}
          className="self-end px-4 py-2 rounded-lg bg-gold text-navy-900 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Post"
          )}
        </button>
      </form>

      {/* Comments List */}
      {comments.length === 0 ? (
        <p className="text-cream/40 text-sm">
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <GlassCard key={c._id} className="!py-3 !px-4">
              <p className="text-cream text-sm">{c.comment}</p>
              <p className="text-cream/30 text-xs mt-2">
                {new Date(c.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
