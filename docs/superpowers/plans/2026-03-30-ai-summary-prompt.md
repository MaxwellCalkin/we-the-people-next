# AI Summary Prompt Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give users a copy-pasteable prompt they can bring to any AI chatbot to get a plain-English bill summary with gotcha detection.

**Architecture:** A new client component `AiSummaryPrompt` renders a collapsible section on the vote page. It receives the bill title, GovTrack URL, and whether a CRS summary exists (to toggle default open/closed). The prompt is built from a template with the bill's details interpolated. A copy button uses the Clipboard API.

**Tech Stack:** React 19, Tailwind CSS, Lucide icons (already in project)

---

### Task 1: Create the AiSummaryPrompt component

**Files:**
- Create: `components/features/AiSummaryPrompt.tsx`

- [ ] **Step 1: Create the component file**

```tsx
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
  const [open, setOpen] = useState(!hasSummary);
  const [copied, setCopied] = useState(false);

  const prompt = buildPrompt(billTitle, govtrackUrl);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

          <div className="relative">
            <pre className="bg-black/30 border border-glass-border rounded-md p-3 pr-12 text-cream/80 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {prompt}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-glass-border/50 hover:bg-glass-border transition-colors"
              title="Copy prompt"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-cream/60" />
              )}
            </button>
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
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `AiSummaryPrompt`

- [ ] **Step 3: Commit**

```bash
git add components/features/AiSummaryPrompt.tsx
git commit -m "feat: add AiSummaryPrompt component with copy-pasteable LLM prompt"
```

---

### Task 2: Add AiSummaryPrompt to the vote page

**Files:**
- Modify: `app/(dashboard)/vote/[slug]/[congress]/page.tsx`

- [ ] **Step 1: Add the import and render the component**

Add this import at the top of the file, after the existing imports:

```tsx
import AiSummaryPrompt from "@/components/features/AiSummaryPrompt";
```

Then insert the `AiSummaryPrompt` component between the GovTrack link (`</a>`) and the vote form section (`<div className="border-t ...`). The JSX to insert:

```tsx
        <AiSummaryPrompt
          billTitle={bill.short_title || bill.title}
          govtrackUrl={govtrackUrl}
          hasSummary={!!bill.summary}
        />
```

The resulting section of the page (from the GovTrack link through the vote form) should look like:

```tsx
        <a
          href={govtrackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-gold text-sm hover:text-gold/80 transition-colors mb-8"
        >
          View on GovTrack <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <AiSummaryPrompt
          billTitle={bill.short_title || bill.title}
          govtrackUrl={govtrackUrl}
          hasSummary={!!bill.summary}
        />

        <div className="border-t border-glass-border pt-6">
```

- [ ] **Step 2: Verify the page compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Navigate to any bill's vote page (e.g. `/vote/hr1/119`).

Verify:
- The "Get an AI Summary" section appears between the GovTrack link and the vote buttons
- If the bill has no CRS summary, the section is expanded by default
- Clicking the copy button copies the prompt to clipboard
- The prompt includes the correct bill title and GovTrack URL
- The Claude, Gemini, and ChatGPT links open in new tabs

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/vote/[slug]/[congress]/page.tsx
git commit -m "feat: integrate AiSummaryPrompt into vote page"
```
