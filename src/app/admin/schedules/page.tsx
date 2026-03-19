"use client";

import { useState, useEffect, useCallback } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface ScheduledQuery {
  id: string;
  queryName: string;
  groupId: string;
  userId: string;
  cronExpression: string;
  filters: Record<string, string>;
  label: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
}

const CRON_PRESETS = [
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Weekdays at 8am", value: "0 8 * * 1-5" },
  { label: "Every Monday at 9am", value: "0 9 * * 1" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Custom", value: "" },
];

function formatDate(iso?: string): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeCron(expr: string): string {
  const preset = CRON_PRESETS.find((p) => p.value === expr);
  if (preset && preset.label !== "Custom") return preset.label;
  return expr;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduledQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Form state
  const [formQueryName, setFormQueryName] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formCronPreset, setFormCronPreset] = useState(CRON_PRESETS[0].value);
  const [formCronCustom, setFormCronCustom] = useState("");
  const [formGroupId, setFormGroupId] = useState("default");
  const [formUserId, setFormUserId] = useState("admin");
  const [formFilters, setFormFilters] = useState("");
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<
    string | null
  >(null);

  // Available queries for the selector
  const [availableQueries, setAvailableQueries] = useState<
    { name: string; source: string }[]
  >([]);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/schedules");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQueries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queries");
      if (res.ok) {
        const data = await res.json();
        setAvailableQueries(
          (data.queries || []).map((q: any) => ({
            name: q.name,
            source: q.source,
          })),
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchQueries();
  }, [fetchSchedules, fetchQueries]);

  function resetForm() {
    setFormQueryName("");
    setFormLabel("");
    setFormCronPreset(CRON_PRESETS[0].value);
    setFormCronCustom("");
    setFormGroupId("default");
    setFormUserId("admin");
    setFormFilters("");
    setEditingId(null);
    setError("");
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(s: ScheduledQuery) {
    setEditingId(s.id);
    setFormQueryName(s.queryName);
    setFormLabel(s.label);
    const matchingPreset = CRON_PRESETS.find(
      (p) => p.value === s.cronExpression,
    );
    if (matchingPreset && matchingPreset.label !== "Custom") {
      setFormCronPreset(s.cronExpression);
      setFormCronCustom("");
    } else {
      setFormCronPreset("");
      setFormCronCustom(s.cronExpression);
    }
    setFormGroupId(s.groupId);
    setFormUserId(s.userId);
    setFormFilters(
      Object.keys(s.filters).length > 0 ? JSON.stringify(s.filters) : "",
    );
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cronExpression = formCronPreset || formCronCustom;
    if (!formQueryName || !cronExpression) {
      setError("Query name and cron expression are required");
      return;
    }

    let filters: Record<string, string> = {};
    if (formFilters.trim()) {
      try {
        filters = JSON.parse(formFilters);
      } catch {
        setError('Filters must be valid JSON (e.g. {"key": "value"})');
        return;
      }
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/admin/schedules/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cronExpression,
            filters,
            label: formLabel || formQueryName,
            enabled: true,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to update schedule");
          return;
        }
      } else {
        const res = await fetch("/api/admin/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queryName: formQueryName,
            groupId: formGroupId,
            userId: formUserId,
            cronExpression,
            filters,
            label: formLabel || formQueryName,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to create schedule");
          return;
        }
      }
      setShowForm(false);
      resetForm();
      fetchSchedules();
    } catch {
      setError("Request failed");
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await fetch(`/api/admin/schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      fetchSchedules();
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
      setDeleteScheduleTarget(null);
      fetchSchedules();
    } catch {
      // ignore
    }
  }

  const activeCount = schedules.filter((s) => s.enabled).length;
  const totalRuns = schedules.reduce((sum, s) => sum + s.runCount, 0);

  return (
    <div>
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Scheduled Queries
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage recurring query execution schedules
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSchedules}
            className="text-xs text-[var(--text-link,#2563eb)] hover:underline"
          >
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
          >
            + Create Schedule
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-primary)] p-4">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            Total Schedules
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {schedules.length}
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-primary)] p-4">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            Active
          </div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {activeCount}
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-primary)] p-4">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            Total Runs
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {totalRuns}
          </div>
        </div>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-primary)] p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            {editingId ? "Edit Schedule" : "Create Schedule"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Query name */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Query
                </label>
                {editingId ? (
                  <input
                    value={formQueryName}
                    disabled
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-muted)] opacity-60"
                  />
                ) : availableQueries.length > 0 ? (
                  <select
                    value={formQueryName}
                    onChange={(e) => {
                      setFormQueryName(e.target.value);
                      if (!formLabel) setFormLabel(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                    required
                  >
                    <option value="">Select a query...</option>
                    {availableQueries.map((q) => (
                      <option key={q.name} value={q.name}>
                        {q.name} ({q.source})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={formQueryName}
                    onChange={(e) => setFormQueryName(e.target.value)}
                    placeholder="Query name"
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                    required
                  />
                )}
              </div>

              {/* Label */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Label
                </label>
                <input
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Display label (optional)"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                />
              </div>

              {/* Cron preset */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Schedule
                </label>
                <select
                  value={formCronPreset}
                  onChange={(e) => {
                    setFormCronPreset(e.target.value);
                    if (e.target.value) setFormCronCustom("");
                  }}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                >
                  {CRON_PRESETS.map((p) => (
                    <option key={p.label} value={p.value}>
                      {p.label}
                      {p.value ? ` (${p.value})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom cron */}
              {formCronPreset === "" && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                    Cron Expression
                  </label>
                  <input
                    value={formCronCustom}
                    onChange={(e) => setFormCronCustom(e.target.value)}
                    placeholder="e.g. */15 * * * *"
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                    required
                  />
                </div>
              )}

              {/* Group */}
              {!editingId && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                    Group
                  </label>
                  <input
                    value={formGroupId}
                    onChange={(e) => setFormGroupId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                  />
                </div>
              )}

              {/* User */}
              {!editingId && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                    User ID
                  </label>
                  <input
                    value={formUserId}
                    onChange={(e) => setFormUserId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                  />
                </div>
              )}
            </div>

            {/* Filters */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                Filters (JSON, optional)
              </label>
              <input
                value={formFilters}
                onChange={(e) => setFormFilters(e.target.value)}
                placeholder='{"department": "Engineering"}'
                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]"
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
              >
                {editingId ? "Update Schedule" : "Create Schedule"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] border border-[var(--border-primary)] rounded-md hover:bg-[var(--bg-card)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-sm text-[var(--text-muted)]">
          Loading schedules...
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-primary)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No scheduled queries yet.
          </p>
          <button
            onClick={openCreate}
            className="mt-3 text-xs text-[var(--text-link,#2563eb)] hover:underline"
          >
            Create your first schedule
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-primary)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-card)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Query
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Schedule
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Next Run
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Last Run
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Runs
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Enabled
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[var(--border-primary)] last:border-0 hover:bg-[var(--bg-card-hover,var(--bg-card))] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-primary)]">
                      {s.label}
                    </div>
                    {s.label !== s.queryName && (
                      <div className="text-xs text-[var(--text-muted)]">
                        {s.queryName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {describeCron(s.cronExpression)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {s.enabled ? formatDate(s.nextRunAt) : "--"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {formatDate(s.lastRunAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {s.runCount}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(s.id, s.enabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        s.enabled
                          ? "bg-blue-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          s.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs text-[var(--text-link,#2563eb)] hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteScheduleTarget(s.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleteScheduleTarget}
        title="Delete Schedule"
        message="Delete this schedule? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteScheduleTarget) handleDelete(deleteScheduleTarget);
        }}
        onCancel={() => setDeleteScheduleTarget(null)}
      />
    </div>
  );
}
