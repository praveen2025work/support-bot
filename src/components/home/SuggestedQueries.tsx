"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SuggestedQuery } from "@/types/home-feed";

interface SuggestedQueriesProps {
  suggestions: SuggestedQuery[];
}

export function SuggestedQueries({ suggestions }: SuggestedQueriesProps) {
  const router = useRouter();

  if (suggestions.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[var(--accent,#8b5cf6)]" />
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
          Suggested for You
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.queryName}
            onClick={() =>
              router.push(
                `/?autoQuery=${encodeURIComponent(suggestion.queryName)}`,
              )
            }
            className="text-left w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary,var(--border))] transition-colors group"
          >
            <p className="text-[13px] font-medium text-[var(--text-primary)] group-hover:text-[var(--accent,#8b5cf6)] transition-colors">
              {suggestion.queryName}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {suggestion.reason}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
