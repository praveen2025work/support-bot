"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { csrfHeaders } from "@/lib/csrf";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AdminPageHeader } from "../components/AdminPageHeader";

interface SynonymEntry {
  canonical: string;
  synonyms: string[];
  updatedAt: string;
  updatedBy?: string;
}

const GROUPS = ["default", "finance", "engineering", "analytics"];

function splitCommaList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function uniqueLower(list: string[]): string[] {
  return Array.from(new Set(list.map((s) => s.toLowerCase())));
}

export default function SynonymsPage() {
  const [groupId, setGroupId] = useState("default");
  const [entries, setEntries] = useState<SynonymEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [newCanonical, setNewCanonical] = useState("");
  const [newSynonyms, setNewSynonyms] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline edit
  const [editingCanonical, setEditingCanonical] = useState<string | null>(null);
  const [editSynonyms, setEditSynonyms] = useState("");

  // Delete confirm
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Test phrase
  const [testPhrase, setTestPhrase] = useState("");
  const testExpansion = useMemo(() => {
    if (!testPhrase.trim()) return null;
    const words = testPhrase.toLowerCase().split(/\s+/);
    const expanded: string[] = [];
    for (const w of words) {
      const hit = entries.find(
        (e) => e.canonical === w || e.synonyms.includes(w),
      );
      if (hit) {
        expanded.push(`{${hit.canonical}|${hit.synonyms.join(",")}}`);
      } else {
        expanded.push(w);
      }
    }
    return expanded.join(" ");
  }, [testPhrase, entries]);

  // Live NLP score for the test phrase (top intent + confidence), fetched
  // debounced from the engine so admins see how a phrase actually classifies.
  const [nlpScore, setNlpScore] = useState<{
    intent: string;
    confidence: number;
    source: string;
    thresholds: { confidence: number; disambigFloor: number };
  } | null>(null);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    const phrase = testPhrase.trim();
    if (!phrase) {
      setNlpScore(null);
      setScoring(false);
      return;
    }
    const controller = new AbortController();
    setScoring(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/groups/${encodeURIComponent(groupId)}/synonyms/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ text: phrase }),
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.confidence === "number") setNlpScore(data);
          else setNlpScore(null);
        })
        .catch(() => {
          // aborted or network error — leave the last value cleared
        })
        .finally(() => setScoring(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [testPhrase, groupId]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/groups/${encodeURIComponent(groupId)}/synonyms`,
      );
      if (!res.ok) {
        setError(`Failed to load synonyms (${res.status})`);
        setEntries([]);
        return;
      }
      const data = await res.json();
      setEntries(data.synonyms || []);
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const upsert = async (canonical: string, synonyms: string[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/groups/${encodeURIComponent(groupId)}/synonyms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ canonical, synonyms }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Save failed (${res.status})`);
        return false;
      }
      setStatus(`Saved "${canonical}" with ${synonyms.length} synonyms`);
      await fetchEntries();
      return true;
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const canonical = newCanonical.trim().toLowerCase();
    const synonyms = uniqueLower(splitCommaList(newSynonyms));
    if (!canonical || synonyms.length === 0) {
      setError("Both canonical term and at least one synonym are required");
      return;
    }
    const ok = await upsert(canonical, synonyms);
    if (ok) {
      setNewCanonical("");
      setNewSynonyms("");
    }
  };

  const startEdit = (entry: SynonymEntry) => {
    setEditingCanonical(entry.canonical);
    setEditSynonyms(entry.synonyms.join(", "));
  };

  const saveEdit = async () => {
    if (!editingCanonical) return;
    const synonyms = uniqueLower(splitCommaList(editSynonyms));
    if (synonyms.length === 0) {
      setError("Synonym list cannot be empty (use Delete to remove the entry)");
      return;
    }
    const ok = await upsert(editingCanonical, synonyms);
    if (ok) setEditingCanonical(null);
  };

  const cancelEdit = () => {
    setEditingCanonical(null);
    setEditSynonyms("");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/groups/${encodeURIComponent(groupId)}/synonyms?canonical=${encodeURIComponent(pendingDelete)}`,
        { method: "DELETE", headers: csrfHeaders() },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Delete failed (${res.status})`);
        return;
      }
      setStatus(`Deleted "${pendingDelete}"`);
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
        title="Synonyms"
        subtitle="Term aliases the matcher tolerates"
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

      {/* Test phrase preview */}
      <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
        <label
          htmlFor="test-phrase"
          className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide"
        >
          Preview synonym expansion &amp; NLP match score
        </label>
        <input
          id="test-phrase"
          type="text"
          value={testPhrase}
          onChange={(e) => setTestPhrase(e.target.value)}
          placeholder="Type a phrase to see how synonyms expand it and how it scores..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        {testExpansion && (
          <div className="mt-2 text-sm font-mono text-gray-700 bg-white border border-gray-200 rounded px-3 py-2">
            {testExpansion}
          </div>
        )}
        {testPhrase.trim() && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              NLP match
            </span>
            {scoring && !nlpScore ? (
              <span className="text-gray-400">Scoring…</span>
            ) : nlpScore ? (
              <>
                <code className="rounded bg-white border border-gray-200 px-1.5 py-0.5 text-gray-800">
                  {nlpScore.intent}
                </code>
                {(() => {
                  const pct = nlpScore.confidence * 100;
                  const tone =
                    nlpScore.confidence >= nlpScore.thresholds.confidence
                      ? "text-green-700"
                      : nlpScore.confidence >= nlpScore.thresholds.disambigFloor
                        ? "text-amber-600"
                        : "text-red-600";
                  return (
                    <span className={`font-semibold tabular-nums ${tone}`}>
                      {pct.toFixed(1)}%
                    </span>
                  );
                })()}
                <span className="text-xs text-gray-400">
                  via {nlpScore.source}
                </span>
              </>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        )}
      </div>

      {/* Create form */}
      <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Add a synonym group
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-start">
          <input
            type="text"
            value={newCanonical}
            onChange={(e) => setNewCanonical(e.target.value)}
            placeholder="canonical term"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={newSynonyms}
            onChange={(e) => setNewSynonyms(e.target.value)}
            placeholder="synonym1, synonym2, synonym3 (comma-separated)"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={saving || !newCanonical.trim() || !newSynonyms.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </div>
      </div>

      {/* Entry list */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">
            No synonyms configured for &ldquo;{groupId}&rdquo;
          </p>
          <p className="text-sm mt-1">
            Add your first canonical term and its variants above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isEditing = editingCanonical === entry.canonical;
            return (
              <div
                key={entry.canonical}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {entry.canonical}
                    </p>
                    {isEditing ? (
                      <textarea
                        value={editSynonyms}
                        onChange={(e) => setEditSynonyms(e.target.value)}
                        className="mt-2 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"
                        rows={2}
                      />
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {entry.synonyms.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-700 font-mono"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      Updated {new Date(entry.updatedAt).toLocaleString()}
                      {entry.updatedBy ? ` by ${entry.updatedBy}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs font-medium px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(entry)}
                          className="text-xs font-medium px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setPendingDelete(entry.canonical)}
                          className="text-xs font-medium px-3 py-1.5 rounded-md border border-red-300 hover:bg-red-50 text-red-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete synonym group?"
        message={`Remove "${pendingDelete}" and all its synonyms for group "${groupId}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
