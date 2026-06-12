"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Trash2, Loader2 } from "lucide-react";
import type { Workflow } from "@/types/workflow";

interface WorkflowPanelProps {
  groupId: string;
  userId?: string;
  onExecute: (workflow: Workflow) => void;
}

export function WorkflowPanel({
  groupId,
  userId,
  onExecute,
}: WorkflowPanelProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = userId
        ? `?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(userId)}`
        : `?groupId=${encodeURIComponent(groupId)}`;
      const res = await fetch(`/api/workflows${qs}`);
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const json = await res.json();
      if (json.success) {
        setWorkflows(json.data);
      } else {
        throw new Error(json.error ?? "Unexpected response");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, [groupId, userId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, workflow: Workflow) => {
      e.stopPropagation();
      if (!confirm(`Delete workflow "${workflow.name}"?`)) return;
      setDeletingId(workflow.id);
      try {
        const res = await fetch(
          `/api/workflows/${encodeURIComponent(workflow.id)}?groupId=${encodeURIComponent(groupId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Failed to delete");
        setWorkflows((prev) => prev.filter((wf) => wf.id !== workflow.id));
      } catch {
        // silently ignore — user can retry
      } finally {
        setDeletingId(null);
      }
    },
    [groupId],
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] px-1">
        Workflows
      </h3>

      {loading && (
        <div className="flex items-center justify-center py-4 text-[var(--text-muted)]">
          <Loader2 size={14} className="animate-spin" />
        </div>
      )}

      {!loading && error && (
        <p className="text-xs text-red-500 px-1">{error}</p>
      )}

      {!loading && !error && workflows.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] px-1">
          No workflows saved yet.
        </p>
      )}

      {!loading && !error && workflows.length > 0 && (
        <ul className="space-y-1">
          {workflows.map((wf) => (
            <li key={wf.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onExecute(wf)}
                onKeyDown={(e) => e.key === "Enter" && onExecute(wf)}
                onMouseEnter={() => setHoveredId(wf.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
              >
                {/* Play icon */}
                <Play
                  size={12}
                  className="shrink-0 text-[var(--accent-blue)]"
                />

                {/* Name + step count */}
                <div className="flex-1 min-w-0">
                  <span className="block text-sm text-[var(--text-primary)] truncate">
                    {wf.name}
                  </span>
                  <span className="block text-[10px] text-[var(--text-muted)]">
                    {wf.steps.length} step{wf.steps.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Delete button — visible on hover */}
                {hoveredId === wf.id && (
                  <button
                    onClick={(e) => handleDelete(e, wf)}
                    disabled={deletingId === wf.id}
                    className="shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                    aria-label={`Delete workflow ${wf.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
