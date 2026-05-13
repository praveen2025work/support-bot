"use client";

import { useCallback, useEffect, useState } from "react";
import { csrfHeaders } from "@/lib/csrf";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AdminPageHeader } from "../components/AdminPageHeader";

interface GlossaryEntry {
  id: string;
  name: string;
  aliases: string[];
  definition: string;
  formula?: string;
  owner?: string;
  examples?: string[];
  updatedAt: string;
  updatedBy?: string;
}

const GROUPS = ["default", "finance", "engineering", "analytics", "hr_team"];

function splitCommaList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface DraftForm {
  id: string;
  name: string;
  aliases: string;
  definition: string;
  formula: string;
  owner: string;
  examples: string;
}

const EMPTY_DRAFT: DraftForm = {
  id: "",
  name: "",
  aliases: "",
  definition: "",
  formula: "",
  owner: "",
  examples: "",
};

export default function GlossaryPage() {
  const [groupId, setGroupId] = useState("default");
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GlossaryEntry | null>(
    null,
  );

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/glossary?groupId=${encodeURIComponent(groupId)}`,
      );
      if (!res.ok) {
        setError(`Failed to load (${res.status})`);
        setEntries([]);
        return;
      }
      const data = await res.json();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const startNew = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
  };

  const startEdit = (entry: GlossaryEntry) => {
    setEditingId(entry.id);
    setDraft({
      id: entry.id,
      name: entry.name,
      aliases: entry.aliases.join(", "),
      definition: entry.definition,
      formula: entry.formula ?? "",
      owner: entry.owner ?? "",
      examples: (entry.examples ?? []).join("\n"),
    });
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.definition.trim()) {
      setError("Name and definition are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          groupId,
          id: draft.id || undefined,
          name: draft.name.trim(),
          aliases: splitCommaList(draft.aliases),
          definition: draft.definition.trim(),
          formula: draft.formula.trim() || undefined,
          owner: draft.owner.trim() || undefined,
          examples: splitCommaList(draft.examples),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      setStatus(`Saved "${draft.name}"`);
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
      await fetchEntries();
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      const res = await fetch(
        `/api/admin/glossary?groupId=${encodeURIComponent(groupId)}&id=${encodeURIComponent(pendingDelete.id)}`,
        { method: "DELETE", headers: csrfHeaders() },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Delete failed (${res.status})`);
        return;
      }
      setStatus(`Deleted "${pendingDelete.name}"`);
      await fetchEntries();
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <AdminPageHeader
        eyebrow="Vocabulary"
        title="Glossary"
        subtitle="Synonyms and aliases the engine recognises"
        actions={
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        }
      />

      {status && (
        <div className="mb-4 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-md flex items-center justify-between">
          <span>{status}</span>
          <button
            onClick={() => setStatus(null)}
            className="text-blue-500 hover:text-blue-700"
          >
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-md flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {editingId ? `Edit "${editingId}"` : "Add a metric definition"}
          </h2>
          {editingId && (
            <button
              onClick={startNew}
              className="text-xs text-blue-600 hover:underline"
            >
              + New entry
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-xs">
            <span className="block font-medium text-gray-700 mb-1">Name *</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="Revenue"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </label>
          <label className="block text-xs">
            <span className="block font-medium text-gray-700 mb-1">Owner</span>
            <input
              type="text"
              value={draft.owner}
              onChange={(e) =>
                setDraft((d) => ({ ...d, owner: e.target.value }))
              }
              placeholder="finance-ops"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </label>
          <label className="block text-xs md:col-span-2">
            <span className="block font-medium text-gray-700 mb-1">
              Aliases (comma-separated)
            </span>
            <input
              type="text"
              value={draft.aliases}
              onChange={(e) =>
                setDraft((d) => ({ ...d, aliases: e.target.value }))
              }
              placeholder="net revenue, sales, gmv"
              className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-xs md:col-span-2">
            <span className="block font-medium text-gray-700 mb-1">
              Definition * (markdown supported)
            </span>
            <textarea
              rows={3}
              value={draft.definition}
              onChange={(e) =>
                setDraft((d) => ({ ...d, definition: e.target.value }))
              }
              placeholder="Net revenue recognized in the period, excluding pending refunds. Reconciles to finance's monthly close."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </label>
          <label className="block text-xs md:col-span-2">
            <span className="block font-medium text-gray-700 mb-1">
              Formula / pseudo-SQL
            </span>
            <textarea
              rows={2}
              value={draft.formula}
              onChange={(e) =>
                setDraft((d) => ({ ...d, formula: e.target.value }))
              }
              placeholder="SUM(net_amount) WHERE status = 'completed' AND date BETWEEN :start AND :end"
              className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-xs md:col-span-2">
            <span className="block font-medium text-gray-700 mb-1">
              Example utterances (one per line)
            </span>
            <textarea
              rows={2}
              value={draft.examples}
              onChange={(e) =>
                setDraft((d) => ({ ...d, examples: e.target.value }))
              }
              placeholder="show me revenue this month&#10;revenue by region last quarter"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 mt-3">
          {editingId && (
            <button
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setEditingId(null);
              }}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !draft.name.trim() || !draft.definition.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-1.5 rounded-md"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Add entry"}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">
            No glossary entries for &ldquo;{groupId}&rdquo;
          </p>
          <p className="text-sm mt-1">
            Define your first metric above. Start with the high-stakes ones:
            revenue, churn, active users, etc.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {entry.name}
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">
                      {entry.id}
                    </span>
                    {entry.owner && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                        {entry.owner}
                      </span>
                    )}
                  </div>
                  {entry.aliases.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {entry.aliases.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-700 font-mono"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(entry)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setPendingDelete(entry)}
                    className="text-xs px-2 py-1 rounded border border-red-300 hover:bg-red-50 text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {entry.definition}
              </p>
              {entry.formula && (
                <pre className="mt-2 text-[11px] font-mono bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-700 overflow-x-auto">
                  {entry.formula}
                </pre>
              )}
              {entry.examples && entry.examples.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.examples.map((ex) => (
                    <span key={ex} className="text-[10px] italic text-gray-500">
                      “{ex}”
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[10px] text-gray-400">
                Updated {new Date(entry.updatedAt).toLocaleString()}
                {entry.updatedBy ? ` by ${entry.updatedBy}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete glossary entry?"
        message={`Remove "${pendingDelete?.name}" from the ${groupId} glossary? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
