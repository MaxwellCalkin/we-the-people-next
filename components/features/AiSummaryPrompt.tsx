"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Bot } from "lucide-react";

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

export default function AiSummaryPrompt({
  billTitle,
  govtrackUrl,
  hasSummary,
}: AiSummaryPromptProps) {
  const [open, setOpen] = useState(false);
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
    <div className="border border-glass-border rounded-lg mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-cream font-brand text-sm">
          <Bot className="h-4 w-4 text-gold" />
          Get an AI Summary
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-cream/50" />
        ) : (
          <ChevronDown className="h-4 w-4 text-cream/50" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-cream/60 text-xs">
            Copy this prompt into your favorite AI chatbot for a plain-English
            breakdown of the bill, including any hidden provisions or gotchas.
          </p>

          <div>
            <div className="flex justify-end mb-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-glass-border/50 hover:bg-glass-border transition-colors text-xs"
                title="Copy prompt"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-green-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-cream/60" />
                    <span className="text-cream/60">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-black/30 border border-glass-border rounded-md p-3 text-cream/80 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {prompt}
            </pre>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-cream/40">Open in:</span>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold/80 transition-colors"
            >
              Claude
            </a>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold/80 transition-colors"
            >
              Gemini
            </a>
            <a
              href="https://chat.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold/80 transition-colors"
            >
              ChatGPT
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
