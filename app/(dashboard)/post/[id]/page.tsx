import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import GlassCard from "@/components/ui/GlassCard";
import CommentSection from "@/components/features/CommentSection";
import LikeButton from "@/components/features/LikeButton";
import DeletePostButton from "@/components/features/DeletePostButton";
import { ArrowLeft } from "lucide-react";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  await connectDB();
  const session = await auth();
  const { id } = await params;

  const post = await Post.findById(id).populate("user", "userName").lean();
  if (!post) redirect("/feed");

  const comments = await Comment.find({ post: id })
    .sort({ createdAt: -1 })
    .lean();

  const isOwner = session?.user?.id === post.user?.toString()
    || (typeof post.user === "object" && post.user && "_id" in post.user
        && (post.user as { _id: { toString: () => string } })._id.toString() === session?.user?.id);

  const serializedComments = comments.map((c) => ({
    _id: c._id.toString(),
    comment: c.comment,
    likes: c.likes,
    createdAt: c.createdAt.toISOString(),
  }));

  const userName =
    typeof post.user === "object" && post.user && "userName" in post.user
      ? (post.user as { userName?: string }).userName
      : undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back links */}
      <div className="flex gap-4 text-sm">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-cream/60 hover:text-cream transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </Link>
        {session && (
          <Link
            href="/profile"
            className="text-cream/60 hover:text-cream transition-colors"
          >
            Back to Profile
          </Link>
        )}
      </div>

      {/* Post Content */}
      <GlassCard className="!p-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image}
          alt={post.title}
          className="w-full max-h-[500px] object-cover"
        />
        <div className="p-6">
          <h1 className="font-brand text-2xl sm:text-3xl text-gradient mb-2">
            {post.title}
          </h1>
          {userName && (
            <p className="text-cream/40 text-sm mb-4">by {userName}</p>
          )}
          <p className="text-cream/70 text-sm leading-relaxed whitespace-pre-wrap">
            {post.caption}
          </p>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-glass-border">
            <LikeButton postId={id} initialLikes={post.likes} />
            {isOwner && <DeletePostButton postId={id} />}
          </div>
        </div>
      </GlassCard>

      {/* Comments */}
      <CommentSection postId={id} initialComments={serializedComments} />
    </div>
  );
}
