// components/features/AvatarUpload.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Avatar from "@/components/ui/Avatar";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName: string;
}

// Vercel rejects request bodies over 4.5 MB, so stop larger files before uploading.
const MAX_BYTES = 4 * 1024 * 1024;

export default function AvatarUpload({ currentAvatar, userName }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (JPG, PNG, or GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That image is over 4 MB. Choose a smaller one.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "PATCH", body: formData });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Profile photo updated.");
      router.refresh();
    } catch {
      toast.error("We couldn't upload that photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <Avatar src={currentAvatar} name={userName} size={88} className="ring-2 ring-line-strong" />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        aria-label={uploading ? "Uploading photo" : "Change profile photo"}
        title="Change profile photo"
        className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-ink-2 shadow-pop transition-colors hover:text-ink disabled:opacity-70"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
