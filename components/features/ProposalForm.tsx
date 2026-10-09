"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field, { describedBy } from "@/components/ui/Field";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 5000;
// Vercel rejects request bodies over 4.5 MB.
const IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export default function ProposalForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const titleError = submitted && !title.trim() ? "Give your proposal a title." : undefined;
  const descriptionError = submitted && !description.trim() ? "Describe the problem and your idea." : undefined;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Choose an image file (JPG, PNG, or GIF).");
      return;
    }
    if (f.size > IMAGE_MAX_BYTES) {
      setError("That image is over 4 MB. Choose a smaller one.");
      return;
    }
    setError("");
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const removeImage = () => {
    setFile(null);
    setPreview(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      if (file) fd.append("file", file);
      const res = await fetch("/api/proposals", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(`/proposal/${data.proposal._id}`);
        router.refresh();
      } else {
        setError(data.error || "We couldn't publish your proposal. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {error && <Alert tone="error">{error}</Alert>}

      <Field
        id="proposal-title"
        label="Title"
        hint="A short, specific name for the law you want, like “Cap insulin at $35 a month.”"
        error={titleError}
        trailing={`${title.length}/${TITLE_MAX}`}
      >
        <input
          id="proposal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          required
          aria-invalid={titleError ? true : undefined}
          aria-describedby={describedBy("proposal-title", { hint: true, error: titleError })}
          className="field h-12 text-base"
          placeholder="What should the law do?"
        />
      </Field>

      <Field
        id="proposal-description"
        label="Description"
        hint="Explain the problem, who it affects, and what you'd like Congress to do. Plain language works best."
        error={descriptionError}
        trailing={description.length > DESCRIPTION_MAX * 0.8 ? `${description.length}/${DESCRIPTION_MAX}` : undefined}
      >
        <textarea
          id="proposal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          maxLength={DESCRIPTION_MAX}
          required
          aria-invalid={descriptionError ? true : undefined}
          aria-describedby={describedBy("proposal-description", { hint: true, error: descriptionError })}
          className="field resize-y leading-relaxed"
          placeholder="Describe the issue and what you'd like done about it…"
        />
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">
          Cover image <span className="font-normal text-ink-3">(optional)</span>
        </p>
        {preview ? (
          <div className="relative overflow-hidden rounded-2xl border border-line-strong">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Selected cover image" className="max-h-72 w-full object-cover" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-navy-950/80 px-2.5 py-1.5 text-xs font-medium text-ink backdrop-blur hover:bg-navy-950"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-field px-6 py-8 text-center transition-colors hover:border-gold/60"
          >
            <ImagePlus className="h-7 w-7 text-ink-3" aria-hidden="true" />
            <span className="text-sm font-medium text-ink">Add an image</span>
            <span className="text-xs text-ink-3">JPG, PNG, or GIF up to 4 MB</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" tabIndex={-1} />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-3">Your username and district appear on your proposal.</p>
        <Button type="submit" size="lg" loading={loading} loadingText="Publishing…">
          Publish proposal
        </Button>
      </div>
    </form>
  );
}
