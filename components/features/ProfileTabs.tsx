"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import PostCard from "@/components/features/PostCard";
import Link from "next/link";

interface VoteEntry {
  bill: {
    _id: string;
    title: string;
    billSlug: string;
    congress: string;
  } | null;
  position: "Yea" | "Nay";
}

interface PostEntry {
  _id: string;
  title: string;
  image: string;
  caption: string;
  likes: number;
}

interface ProfileTabsProps {
  votes: VoteEntry[];
  posts: PostEntry[];
}

export default function ProfileTabs({ votes, posts }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<"votes" | "posts">("votes");

  return (
    <div>
      {/* Tab Buttons */}
      <div className="flex gap-6 mb-6 border-b border-glass-border">
        <button
          onClick={() => setActiveTab("votes")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "votes"
              ? "text-gold"
              : "text-cream/50 hover:text-cream"
          }`}
        >
          Votes ({votes.length})
          {activeTab === "votes" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("posts")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "posts"
              ? "text-gold"
              : "text-cream/50 hover:text-cream"
          }`}
        >
          Posts ({posts.length})
          {activeTab === "posts" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
          )}
        </button>
      </div>

      {/* Votes Tab */}
      {activeTab === "votes" && (
        <div className="space-y-3">
          {votes.length === 0 ? (
            <p className="text-cream/40 text-sm">
              You haven&apos;t voted on any bills yet.
            </p>
          ) : (
            votes.map((v, idx) => (
              <GlassCard key={idx} hover>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {v.bill ? (
                      <Link
                        href={`/vote/${v.bill.billSlug}/${v.bill.congress}/voted`}
                        className="text-cream text-sm font-medium hover:text-gold transition-colors line-clamp-2"
                      >
                        {v.bill.title}
                      </Link>
                    ) : (
                      <span className="text-cream/40 text-sm">
                        Bill data unavailable
                      </span>
                    )}
                  </div>
                  <span
                    className={`ml-4 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      v.position === "Yea"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {v.position}
                  </span>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === "posts" && (
        <div>
          {posts.length === 0 ? (
            <p className="text-cream/40 text-sm">
              You haven&apos;t created any posts yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
