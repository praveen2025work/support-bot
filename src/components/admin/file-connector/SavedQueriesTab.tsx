"use client";

import type { FileSourceConfig, QueryPipeline } from "./types";

interface SavedQueriesTabProps {
  sourceId: string;
  source: FileSourceConfig;
  pipeline?: QueryPipeline;
}

export function SavedQueriesTab({ source }: SavedQueriesTabProps) {
  return (
    <div className="p-5">
      <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
        Saved Queries
      </div>
      <div className="text-[12px] text-[var(--text-muted)]">
        Save and publish query configurations for &ldquo;{source.name}&rdquo;.
        Full implementation coming in Phase 4.
      </div>
    </div>
  );
}
