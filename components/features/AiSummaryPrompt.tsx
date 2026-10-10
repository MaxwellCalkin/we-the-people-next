"use client";

import { useState } from "react";
import { Bot, Check, ChevronDown, Copy, ExternalLink } from "lucide-react";

interface AiSummaryPromptProps {
  billTitle: string;
  govtrackUrl: string;
  hasSummary: boolean;
}

function buildPrompt(billTitle: string, govtrackUrl: string): string {
  return `I need help understanding a bill before the U.S. Congress.

**Bill:** ${billTitle}
**Full text:** ${govtrackUrl}

Please read the bill and give me:

1. **Plain-English Summary** — In 2-3 short paragraphs, explain what this bill actually does. No legal jargon. Write it so anyone can understand it.

2. **Title vs. Reality Check** — Does the bill's title accurately describe what it does? Politicians sometimes give bills appealing names that don't match the contents. Flag any mismatch.

3. **Hidden Provisions & Riders** — Are there any sections tacked onto this bill that have nothing to do with its main purpose? These are often buried deep in the text. List each one and explain what it does in plain English.

4. **Who Benefits & Who Pays** — Who are the main winners and losers if this bill passes? Follow the money.

5. **Gotchas** — Is there anything in this bill that would surprise an ordinary person reading just the title? Any loopholes, sunset clauses, or provisions that do the opposite of what you'd expect?

Keep your response in plain, everyday English. No legalese. Be specific — cite section numbers when flagging issues.`;
}

const ASSISTANTS = [
  { name: "Claude", href: "https://claude.ai" },
  { name: "Gemini", href: "https://gemini.google.com" },
  { name: "ChatGPT", href: "https://chat.com" },
];

export default function AiSummaryPrompt({ billTitle, govtrackUrl, hasSummary }: AiSummaryPromptProps) {
  const [open, setOpen] = useState(!hasSummary);
  const [copied, setCopied] = useState(false);
  const prompt = buildPrompt(billTitle, govtrackUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy prompt:", err);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface-2/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="ai-summary-panel"
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-bright">
          <Bot className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Get a plain-English breakdown</span>
          <span className="block text-xs text-ink-3">Copy a ready-made prompt into your favorite AI assistant</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id="ai-summary-panel" className="space-y-3 px-4 pb-4">
          <div className="relative">
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-field p-3 pr-24 text-xs leading-relaxed text-ink-2">
              {prompt}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className={`absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                copied ? "border-yea/40 bg-yea/10 text-yea" : "border-line-strong bg-surface-3 text-ink-2 hover:text-ink"
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <span className="sr-only" aria-live="polite">
              {copied ? "Prompt copied to clipboard" : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ink-3">Open in</span>
            {ASSISTANTS.map((a) => (
              <a
                key={a.name}
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-2.5 py-1 font-medium text-ink-2 transition-colors hover:border-gold/50 hover:text-ink"
              >
                {a.name}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
          </div>
          <p className="text-xs text-ink-3">AI summaries can be wrong. Check important details against the full text.</p>
        </div>
      )}
    </div>
  );
}
