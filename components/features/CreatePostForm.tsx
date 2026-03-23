"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import MagneticButton from "@/components/ui/MagneticButton";
import { Upload, Loader2 } from "lucide-react";

interface CreatePostFormProps {
  billSlug: string;
  billCongress: string;
}

export default function CreatePostForm({
  billSlug,
  billCongress,
}: CreatePostFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showForm = searchParams.get("createPost") === "true";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!showForm) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !caption || !file) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("caption", caption);
      formData.append("billSlug", billSlug);
      formData.append("billCongress", billCongress);
      formData.append("file", file);

      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        router.push(`/vote/${billSlug}/${billCongress}/voted`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create post.");
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard>
      <h2 className="font-brand text-xl text-gradient mb-6">Create a Post</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-cream/70 text-sm mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-2 text-sm text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all"
            placeholder="Give your post a title..."
          />
        </div>

        <div>
          <label className="block text-cream/70 text-sm mb-1">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-2 text-sm text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all resize-none"
            placeholder="Share your thoughts on this bill..."
          />
        </div>

        <div>
          <label className="block text-cream/70 text-sm mb-1">Image</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-glass-border rounded-lg p-6 text-center hover:border-gold/50 transition-colors"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg"
              />
            ) : (
              <div className="text-cream/50">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Click to upload an image</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <div className="pt-2">
          <MagneticButton type="submit" disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              "Create Post"
            )}
          </MagneticButton>
        </div>
      </form>
    </GlassCard>
  );
}
