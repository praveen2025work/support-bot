"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { csrfHeaders } from "@/lib/csrf";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface SynonymEntry {
  canonical: string;
  synonyms: string[];
  updatedAt: string;
  updatedBy?: string;
}

interface SynonymsResponse {
  groupId?: string;
  synonyms?: SynonymEntry[];
  error?: string;
}

export default function GroupSynonymsPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = id;

  const [entries, setEntries] = useState<SynonymEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedCanonical, setSelectedCanonical] = useState<string | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Edit state (for the right-hand editor panel)
  const [editSynonymsText, setEditSynonymsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Create-new form state
  const [newCanonical, setNewCanonical] = useState("");
  const [newSynonymsText, setNewSynonymsText] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchSynonyms = useCallback(async () => {
    if (!groupId) return;
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/admin/groups/${encodeURIComponent(groupId)}/synonyms`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as SynonymsResponse;
      if (!res.ok) {
        const msg = data.error ?? `HTTP ${res.status}`;
        setLoadError(msg);
        setEntries([]);
        return;
      }
      const list = Array.isArray(data.synonyms) ? data.synonyms : [];
      // Sort alphabetically by canonical for stable display
      list.sort((a, b) => a.canonical.localeCompare(b.canonical));
      setEntries(list);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load synonyms",
      );
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchSynonyms();
  }, [fetchSynonyms]);

  // Populate edit field when selecting an entry
  useEffect(() => {
    const entry = entries.find((e) => e.canonical === selectedCanonical);
    if (entry) {
      setEditSynonymsText(entry.synonyms.join("\n"));
      setSaveError(null);
    }
  }, [selectedCanonical, entries]);

  const selected =
    entries.find((e) => e.canonical === selectedCanonical) ?? null;

  const handleSave = async () => {
    if (!selected || !groupId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const synonyms = editSynonymsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(
        `/api/admin/groups/${encodeURIComponent(groupId)}/synonyms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            canonical: selected.canonical,
            synonyms,
          }),
        },
      );
      const data = (await res.json()) as SynonymsResponse & {
        success?: boolean;
      };
      if (!res.ok) {
        setSaveError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      await fetchSynonyms();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!groupId || !newCanonical.trim() || !newSynonymsText.trim()) return;
    setSaving(true);
    setCreateError(null);
    try {
      const synonyms = newSynonymsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const canonical = newCanonical.trim().toLowerCase();
      const res = await fetch(
        `/api/admin/groups/${encodeURIComponent(groupId)}/synonyms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ canonical, synonyms }),
        },
      );
      const data = (await res.json()) as SynonymsResponse & {
        success?: boolean;
      };
      if (!res.ok) {
        setCreateError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      await fetchSynonyms();
      setShowCreate(false);
      setNewCanonical("");
      setNewSynonymsText("");
      setSelectedCanonical(canonical);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (canonical: string) => {
    if (!groupId) return;
    try {
      const res = await fetch(
        `/api/admin/groups/${encodeURIComponent(groupId)}/synonyms?canonical=${encodeURIComponent(canonical)}`,
        { method: "DELETE", headers: { ...csrfHeaders() } },
      );
      if (!res.ok) {
        const data = (await res.json().catch((err: unknown) => {
          // Non-JSON 4xx/5xx body — surface raw status to the user
          return { error: err instanceof Error ? err.message : null };
        })) as SynonymsResponse;
        setSaveError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setSelectedCanonical(null);
      setDeleteTarget(null);
      await fetchSynonyms();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-2">
        <Link
          href={`/admin/groups/${encodeURIComponent(groupId ?? "")}`}
          className="hover:text-blue-600 hover:underline"
        >
          &larr; Back to group
        </Link>
      </nav>

      <div className="pb-6 mb-6 border-b border-gray-100 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Synonyms</h1>
          <p className="text-sm text-gray-500">
            Per-group vocabulary mappings. Each canonical term expands into its
            synonyms inside the NLP pipeline so user phrasing matches your
            queries.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Group:{" "}
            <span className="font-mono text-gray-600">{groupId ?? ""}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setSelectedCanonical(null);
            setCreateError(null);
          }}
          className="shrink-0 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700"
        >
          + Add synonym
        </button>
      </div>

      {loading && <SynonymsLoadingShimmer />}

      {!loading && loadError && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 text-center">
          <p className="text-sm text-red-600 mb-3">
            Could not load synonyms: {loadError}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchSynonyms();
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && (
        <div className="flex gap-4">
          {/* Left list */}
          <div className="w-72 shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
              Canonical terms ({entries.length})
            </span>
            {entries.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500">
                  No synonyms yet. Add one to teach the bot new vocabulary for
                  this group.
                </p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {entries.map((entry) => (
                  <button
                    key={entry.canonical}
                    type="button"
                    onClick={() => {
                      setSelectedCanonical(entry.canonical);
                      setShowCreate(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCanonical === entry.canonical
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-100 border border-transparent"
                    }`}
                  >
                    <div className="font-mono text-sm">{entry.canonical}</div>
                    <div className="text-xs text-gray-400">
                      {entry.synonyms.length} synonym
                      {entry.synonyms.length === 1 ? "" : "s"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0">
            {showCreate ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Add new synonym entry
                </h2>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Canonical term
                  </label>
                  <input
                    value={newCanonical}
                    onChange={(e) => setNewCanonical(e.target.value)}
                    placeholder="e.g. revenue"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    The intended target word — what the bot should match
                    against.
                  </p>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Synonyms (one per line)
                  </label>
                  <textarea
                    value={newSynonymsText}
                    onChange={(e) => setNewSynonymsText(e.target.value)}
                    rows={6}
                    placeholder={"earnings\ntop line\ntotal sales"}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Words and short phrases users actually type that should map
                    to the canonical term.
                  </p>
                </div>
                {createError && (
                  <p className="text-xs text-red-600 mb-3">{createError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={
                      saving || !newCanonical.trim() || !newSynonymsText.trim()
                    }
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Adding..." : "Add entry"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setCreateError(null);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : selected ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-700 font-mono">
                      {selected.canonical}
                    </h2>
                    <span className="text-xs text-gray-400">
                      Last updated{" "}
                      {new Date(selected.updatedAt).toLocaleString()}
                      {selected.updatedBy ? ` by ${selected.updatedBy}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selected.canonical)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Synonyms (one per line)
                  </label>
                  <textarea
                    value={editSynonymsText}
                    onChange={(e) => setEditSynonymsText(e.target.value)}
                    rows={10}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>

                {saveError && (
                  <p className="text-xs text-red-600 mb-3">{saveError}</p>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  No synonyms configured for this group yet
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Add a canonical term and the words your users actually type
                  for it. The NLP pipeline will pick them up immediately.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700"
                >
                  + Add your first synonym
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">
                  Select a canonical term from the list to edit its synonyms.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete synonym entry"
        message={
          deleteTarget
            ? `Delete the synonym entry for "${deleteTarget}"? Existing chats will not be affected, but new utterances using these synonyms will no longer expand.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SynonymsLoadingShimmer() {
  return (
    <div className="flex gap-4" data-testid="synonyms-loading">
      <div className="w-72 shrink-0 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="h-4 w-32 bg-gray-100 animate-pulse rounded" />
          <div className="h-40 bg-gray-50 animate-pulse rounded-lg" />
          <div className="h-9 w-32 bg-gray-100 animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}
