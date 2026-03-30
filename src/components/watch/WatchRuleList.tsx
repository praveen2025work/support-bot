"use client";
import { useState, useEffect, useCallback } from "react";
import { Edit2, Trash2, Play, Pause } from "lucide-react";
import type { WatchRule, WatchRulesResponse } from "@/types/watch";

interface WatchRuleListProps {
  groupId: string;
  onEdit: (rule: WatchRule) => void;
}

const TYPE_LABELS: Record<WatchRule["type"], string> = {
  threshold: "Threshold",
  trend: "Trend",
  anomaly: "Anomaly",
  freshness: "Freshness",
};

const TYPE_COLORS: Record<WatchRule["type"], string> = {
  threshold: "bg-blue-100 text-blue-700",
  trend: "bg-purple-100 text-purple-700",
  anomaly: "bg-orange-100 text-orange-700",
  freshness: "bg-teal-100 text-teal-700",
};

export function WatchRuleList({ groupId, onEdit }: WatchRuleListProps) {
  const [rules, setRules] = useState<WatchRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/watch/rules?groupId=${encodeURIComponent(groupId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch rules");
      const json: WatchRulesResponse = await res.json();
      if (json.success) {
        setRules(json.data);
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggleEnabled = useCallback(async (rule: WatchRule) => {
    try {
      const res = await fetch(`/api/watch/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error("Failed to update rule");
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)),
      );
    } catch {
      // silently ignore
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this watch rule?")) return;
    try {
      const res = await fetch(`/api/watch/rules/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silently ignore
    }
  }, []);

  if (loading) {
    return (
      <div className="text-[13px] text-[var(--text-muted)] py-8 text-center">
        Loading rules…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[13px] text-[var(--danger)] py-8 text-center">
        {error}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-[13px] text-[var(--text-muted)] py-8 text-center">
        No watch rules yet. Create one above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            <th className="py-2.5 pr-4 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Name
            </th>
            <th className="py-2.5 pr-4 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Query
            </th>
            <th className="py-2.5 pr-4 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Type
            </th>
            <th className="py-2.5 pr-4 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Schedule
            </th>
            <th className="py-2.5 pr-4 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Status
            </th>
            <th className="py-2.5 font-semibold text-[var(--text-secondary)] whitespace-nowrap text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr
              key={rule.id}
              className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <td className="py-2.5 pr-4 text-[var(--text-primary)] font-medium">
                {rule.name}
              </td>
              <td className="py-2.5 pr-4 text-[var(--text-secondary)] max-w-[160px] truncate">
                {rule.queryName}
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_COLORS[rule.type]}`}
                >
                  {TYPE_LABELS[rule.type]}
                </span>
              </td>
              <td className="py-2.5 pr-4 font-mono text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                {rule.cronExpression}
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${rule.enabled ? "bg-[var(--success-subtle,#d1fae5)] text-[var(--success,#059669)]" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"}`}
                >
                  {rule.enabled ? "Active" : "Paused"}
                </span>
              </td>
              <td className="py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(rule)}
                    title="Edit rule"
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleEnabled(rule)}
                    title={rule.enabled ? "Pause rule" : "Resume rule"}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {rule.enabled ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    title="Delete rule"
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-red-50 hover:text-[var(--danger)] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
