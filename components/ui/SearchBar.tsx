"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  defaultValue?: string;
  /** Show a "/" hint and focus the field when "/" is pressed anywhere. */
  shortcut?: boolean;
  size?: "sm" | "md";
  autoFocus?: boolean;
  label?: string;
}

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export default function SearchBar({
  className = "",
  placeholder = "Search bills…",
  defaultValue = "",
  shortcut = false,
  size = "md",
  autoFocus = false,
  label = "Search bills",
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcut) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/bills/search?q=${encodeURIComponent(trimmed)}`);
      inputRef.current?.blur();
    }
  };

  const height = size === "sm" ? "h-9 text-sm" : "h-11 text-[0.9375rem]";

  return (
    <form onSubmit={handleSubmit} role="search" className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        enterKeyHint="search"
        className={`field ${height} pl-9 ${shortcut ? "pr-9" : "pr-3"} [&::-webkit-search-cancel-button]:hidden`}
      />
      {shortcut && (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-line-strong px-1.5 text-[0.7rem] font-medium leading-5 text-ink-3"
        >
          /
        </kbd>
      )}
    </form>
  );
}
