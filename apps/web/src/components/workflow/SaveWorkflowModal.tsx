"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface ChatStep {
  type: string;
  queryName?: string;
  filters?: Record<string, string>;
  column?: string;
  value?: string;
  direction?: string;
}

interface FilterParam {
  column: string;
  value: string;
  parameterize: boolean;
}

interface SaveWorkflowModalProps {
  steps: ChatStep[];
  groupId: string;
  onClose: () => void;
  onSaved: (workflowId: string) => void;
}

function collectFilterParams(steps: ChatStep[]): FilterParam[] {
  const params: FilterParam[] = [];
  for (const step of steps) {
    if (step.filters) {
      for (const [col, val] of Object.entries(step.filters)) {
        params.push({ column: col, value: val, parameterize: false });
      }
    }
  }
  return params;
}

export function SaveWorkflowModal({
  steps,
  groupId,
  onClose,
  onSaved,
}: SaveWorkflowModalProps) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "group">("private");
  const [filterParams, setFilterParams] = useState<FilterParam[]>(() =>
    collectFilterParams(steps),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleParameterize = (index: number) => {
    setFilterParams((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, parameterize: !p.parameterize } : p,
      ),
    );
  };

  const buildSteps = () =>
    steps.map((step) => {
      if (!step.filters) return step;
      const resolvedFilters: Record<string, string> = {};
      for (const [col, val] of Object.entries(step.filters)) {
        const param = filterParams.find(
          (p) => p.column === col && p.value === val,
        );
        resolvedFilters[col] = param?.parameterize ? `$param:${col}` : val;
      }
      return { ...step, filters: resolvedFilters };
    });

  const buildParams = () =>
    filterParams
      .filter((p) => p.parameterize)
      .map((p) => ({
        name: p.column,
        type: "text" as const,
        defaultValue: p.value,
      }));

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a workflow name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          name: name.trim(),
          steps: buildSteps(),
          params: buildParams(),
          owner: "jdoe",
          visibility,
        }),
      });
      if (!res.ok) throw new Error("Failed to save workflow");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      onSaved(json.data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Save as Workflow
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Workflow Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Revenue Filter"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] transition-colors"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "private" | "group")
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] transition-colors"
            >
              <option value="private">Private (only me)</option>
              <option value="group">Group (shared)</option>
            </select>
          </div>

          {/* Parameterisable filters */}
          {filterParams.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Ask me each time
              </label>
              <p className="text-xs text-[var(--text-muted)]">
                Check filters you want to prompt for when running this workflow.
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {filterParams.map((p, i) => (
                  <label
                    key={`${p.column}-${i}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={p.parameterize}
                      onChange={() => toggleParameterize(i)}
                      className="accent-[var(--accent-blue)]"
                    />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {p.column}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] ml-auto truncate max-w-[120px]">
                      {p.value}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--accent-blue)] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving…" : "Save Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}
