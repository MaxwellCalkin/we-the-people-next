"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

interface LikeButtonProps {
  postId: string;
  initialLikes: number;
}

export default function LikeButton({ postId, initialLikes }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    if (liked) return;

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "PUT",
      });

      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        setLiked(true);
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={liked}
      className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
        liked
          ? "text-red-400 cursor-default"
          : "text-cream/60 hover:text-red-400"
      }`}
    >
      <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
      <span>{likes}</span>
    </button>
  );
}
