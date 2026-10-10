"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

/** Copies the current page URL (or `url`) to the clipboard. */
export default function CopyLinkButton({ url, label = "Copy link" }: { url?: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url ?? window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" onClick={copy} className={buttonClasses({ variant: "secondary", size: "sm", fullWidth: true })}>
      {copied ? <Check className="h-4 w-4 text-yea" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Link copied" : label}
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </button>
  );
}
