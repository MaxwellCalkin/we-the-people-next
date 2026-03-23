import connectDB from "@/lib/db";
import Post from "@/models/Post";
import PostCard from "@/components/features/PostCard";
import StaggerReveal from "@/components/animations/StaggerReveal";

export default async function FeedPage() {
  await connectDB();

  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate("user", "userName")
    .lean();

  // Serialize MongoDB documents for client components
  const serializedPosts = posts.map((p) => ({
    _id: p._id.toString(),
    title: p.title,
    image: p.image,
    caption: p.caption,
    likes: p.likes,
    user:
      p.user && typeof p.user === "object" && "userName" in p.user
        ? { userName: (p.user as { userName?: string }).userName }
        : undefined,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-brand text-3xl sm:text-4xl text-gradient mb-8">
        Hot Posts
      </h1>

      {serializedPosts.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-cream/60 text-lg">No posts yet.</p>
          <p className="text-cream/40 text-sm mt-2">
            Vote on a bill and share your thoughts!
          </p>
        </div>
      ) : (
        <StaggerReveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serializedPosts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </StaggerReveal>
      )}
    </div>
  );
}
