"use client";

import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { Heart } from "lucide-react";

interface PostCardProps {
  post: {
    _id: string;
    title: string;
    image: string;
    caption: string;
    likes: number;
    user?: { userName?: string } | string;
  };
}

export default function PostCard({ post }: PostCardProps) {
  const userName =
    typeof post.user === "object" && post.user
      ? post.user.userName
      : undefined;

  return (
    <GlassCard hover className="flex flex-col overflow-hidden !p-0">
      <div className="relative w-full aspect-video overflow-hidden rounded-t-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-cream font-semibold text-sm mb-2 line-clamp-2">
          {post.title}
        </h3>
        <p className="text-cream/50 text-xs mb-4 line-clamp-2">
          {post.caption}
        </p>
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-cream/50 text-xs">
            <Heart className="h-3.5 w-3.5" />
            <span>{post.likes}</span>
          </div>
          {userName && (
            <span className="text-cream/40 text-xs">by {userName}</span>
          )}
        </div>
        <Link
          href={`/post/${post._id}`}
          className="mt-3 inline-block text-gold text-sm font-medium hover:text-gold/80 transition-colors"
        >
          View Post &rarr;
        </Link>
      </div>
    </GlassCard>
  );
}
