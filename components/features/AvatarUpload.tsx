// components/features/AvatarUpload.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName: string;
}

export default function AvatarUpload({ currentAvatar, userName }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "PATCH", body: formData });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar src={currentAvatar} name={userName} size={72} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-xs text-cream/50 hover:text-cream border border-glass-border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Edit Avatar"}
      </button>
    </div>
  );
}
