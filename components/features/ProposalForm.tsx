"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import MagneticButton from "@/components/ui/MagneticButton";
import { Upload, Loader2 } from "lucide-react";

export default function ProposalForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) { setError("Title and description are required."); return; }
    setLoading(true); setError("");
    try {
      const fd = new FormData(); fd.append("title", title); fd.append("description", description);
      if (file) fd.append("file", file);
      const res = await fetch("/api/proposals", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) { router.push(`/proposal/${data.proposal._id}`); router.refresh(); }
      else setError(data.error || "Failed to create proposal.");
    } catch { setError("An unexpected error occurred."); } finally { setLoading(false); }
  };

  return (
    <GlassCard>
      <h2 className="font-brand text-xl text-gradient mb-6">Propose a Bill</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-cream/70 text-sm mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-2 text-sm text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold/50"
            placeholder="What should the law be?" />
        </div>
        <div>
          <label className="block text-cream/70 text-sm mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6}
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-2 text-sm text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
            placeholder="Describe the issue and what you'd like done about it..." />
        </div>
        <div>
          <label className="block text-cream/70 text-sm mb-1">Image (optional)</label>
          <div onClick={() => fileRef.current?.click()} className="cursor-pointer border-2 border-dashed border-glass-border rounded-lg p-6 text-center hover:border-gold/50 transition-colors">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
            ) : (<div className="text-cream/50"><Upload className="h-8 w-8 mx-auto mb-2" /><p className="text-sm">Click to add an image</p></div>)}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <MagneticButton type="submit" disabled={loading}>
          {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Submitting...</span> : "Submit Proposal"}
        </MagneticButton>
      </form>
    </GlassCard>
  );
}
