"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AdminPageHeader, AdminKpiTile } from "../components/AdminPageHeader";

interface DataRole {
  id: string;
  label: string;
  description: string;
}

export default function DataRolesPage() {
  const [roles, setRoles] = useState<DataRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ id: "", label: "", description: "" });
  const [saving, setSaving] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/data-roles");
      if (!res.ok) {
        setError(`Failed to load data roles (${res.status})`);
        setRoles([]);
        return;
      }
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const handleCreate = async () => {
    if (!form.id.trim() || !form.label.trim()) {
      setError("ID and label are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/data-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Create failed (${res.status})`);
        return;
      }
      setShowCreate(false);
      setForm({ id: "", label: "", description: "" });
      setStatus("Data role created");
      await fetchRoles();
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (role: DataRole) => {
    setEditingId(role.id);
    setEditLabel(role.label);
    setEditDescription(role.description);
  };

  const handleSave = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/data-roles/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            label: editLabel,
            description: editDescription,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Update failed (${res.status})`);
        return;
      }
      setEditingId(null);
      setStatus("Data role updated");
      await fetchRoles();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDelete(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/data-roles/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: csrfHeaders(),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Delete failed (${res.status})`);
        return;
      }
      setStatus("Data role deleted");
      await fetchRoles();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col">
      <AdminPageHeader
        eyebrow="Governance"
        title="Data Roles"
        subtitle="Named data-access roles used to scope which rows a user can see."
        actions={
          <>
            <button onClick={fetchRoles} className="btn-ghost !py-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={() => {
                setForm({ id: "", label: "", description: "" });
                setError(null);
                setShowCreate(true);
              }}
              className="btn-primary !py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New role
            </button>
          </>
        }
        kpis={
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 max-w-md">
            <AdminKpiTile
              label="Data Roles"
              value={roles.length}
              sub="defined"
              tone="var(--brand)"
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
            />
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {status && !error && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {status}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading data roles…</p>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            No data roles yet. Create one to scope row-level access.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Label
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr
                  key={role.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-4 py-2 font-mono text-xs text-gray-900">
                    {role.id}
                  </td>
                  {editingId === role.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleSave(role.id)}
                          className="btn-primary !py-1 !px-2 text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-ghost !py-1 !px-2 text-xs ml-1"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-gray-900">{role.label}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {role.description || "—"}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => beginEdit(role)}
                          className="btn-ghost !py-1 !px-2 text-xs"
                          aria-label={`Edit ${role.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(role.id)}
                          className="btn-ghost !py-1 !px-2 text-xs ml-1 text-red-600"
                          aria-label={`Delete ${role.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              New data role
            </h2>
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-gray-600">
                ID (stable key)
                <input
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="e.g. finance_emea"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Label
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Finance — EMEA"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Description
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="What this role grants access to"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="btn-ghost !py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="btn-primary !py-1.5 disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create role"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete data role"
        message={`Remove data role "${pendingDelete}"? Users mapped to it will lose that scope. This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
