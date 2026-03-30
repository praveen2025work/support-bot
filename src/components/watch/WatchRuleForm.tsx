"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type { WatchRule, WatchRuleType, WatchChannel } from "@/types/watch";

interface WatchRuleFormProps {
  groupId: string;
  editingRule?: WatchRule | null;
  onCreated: () => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  queryName: string;
  type: WatchRuleType;
  cronExpression: string;
  channels: WatchChannel[];
  recipients: string;
  // threshold
  thresholdColumn: string;
  thresholdOperator: "gt" | "lt" | "gte" | "lte" | "eq" | "neq";
  thresholdValue: string;
  // freshness
  maxStaleMinutes: string;
  // anomaly
  zScoreThreshold: string;
  // trend
  trendColumn: string;
  trendDirection: "reversal" | "decline" | "incline";
}

const INITIAL_STATE: FormState = {
  name: "",
  queryName: "",
  type: "threshold",
  cronExpression: "*/15 * * * *",
  channels: ["in_app"],
  recipients: "",
  thresholdColumn: "",
  thresholdOperator: "gt",
  thresholdValue: "",
  maxStaleMinutes: "60",
  zScoreThreshold: "3",
  trendColumn: "",
  trendDirection: "decline",
};

function stateFromRule(rule: WatchRule): FormState {
  const c = rule.condition as Record<string, unknown>;
  return {
    name: rule.name,
    queryName: rule.queryName,
    type: rule.type,
    cronExpression: rule.cronExpression,
    channels: rule.channels,
    recipients: rule.recipients?.join(", ") ?? "",
    thresholdColumn: rule.type === "threshold" ? String(c.column ?? "") : "",
    thresholdOperator:
      rule.type === "threshold"
        ? (String(c.operator ?? "gt") as FormState["thresholdOperator"])
        : "gt",
    thresholdValue: rule.type === "threshold" ? String(c.value ?? "") : "",
    maxStaleMinutes:
      rule.type === "freshness" ? String(c.maxStaleMinutes ?? "60") : "60",
    zScoreThreshold:
      rule.type === "anomaly" ? String(c.zScoreThreshold ?? "3") : "3",
    trendColumn: rule.type === "trend" ? String(c.column ?? "") : "",
    trendDirection:
      rule.type === "trend"
        ? (String(c.direction ?? "decline") as FormState["trendDirection"])
        : "decline",
  };
}

function buildCondition(state: FormState) {
  switch (state.type) {
    case "threshold":
      return {
        column: state.thresholdColumn,
        operator: state.thresholdOperator,
        value: Number(state.thresholdValue),
      };
    case "freshness":
      return { maxStaleMinutes: Number(state.maxStaleMinutes) };
    case "anomaly":
      return {
        columns: "all" as const,
        zScoreThreshold: Number(state.zScoreThreshold),
      };
    case "trend":
      return {
        column: state.trendColumn,
        direction: state.trendDirection,
        lookbackPoints: 10,
      };
  }
}

export function WatchRuleForm({
  groupId,
  editingRule,
  onCreated,
  onCancel,
}: WatchRuleFormProps) {
  const isEditing = Boolean(editingRule);
  const [form, setForm] = useState<FormState>(
    editingRule ? stateFromRule(editingRule) : INITIAL_STATE,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleChannelToggle(channel: WatchChannel) {
    setForm((prev) => {
      const has = prev.channels.includes(channel);
      const next = has
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel];
      return { ...prev, channels: next };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      queryName: form.queryName,
      groupId,
      type: form.type,
      condition: buildCondition(form),
      cronExpression: form.cronExpression,
      channels: form.channels,
      recipients: form.channels.includes("email")
        ? form.recipients
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean)
        : undefined,
    };

    try {
      const url = isEditing
        ? `/api/watch/rules/${editingRule!.id}?groupId=${encodeURIComponent(groupId)}`
        : "/api/watch/rules";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error ??
            `Failed to ${isEditing ? "update" : "create"} rule`,
        );
      }
      onCreated();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${isEditing ? "update" : "create"} rule`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";
  const labelClass =
    "block text-[12px] font-medium text-[var(--text-secondary)] mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] p-5 space-y-4"
    >
      <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
        {isEditing ? "Edit Watch Rule" : "New Watch Rule"}
      </h3>

      {/* Name + Query */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Rule Name *</label>
          <input
            required
            value={form.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              update("name", e.target.value)
            }
            placeholder="e.g. Revenue Drop Alert"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Query Name *</label>
          <input
            required
            value={form.queryName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              update("queryName", e.target.value)
            }
            placeholder="e.g. daily_revenue"
            className={inputClass}
          />
        </div>
      </div>

      {/* Type + Schedule */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Type *</label>
          <select
            value={form.type}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              update("type", e.target.value)
            }
            className={inputClass}
          >
            <option value="threshold">Threshold</option>
            <option value="trend">Trend</option>
            <option value="anomaly">Anomaly</option>
            <option value="freshness">Freshness</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Cron Expression *</label>
          <input
            required
            value={form.cronExpression}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              update("cronExpression", e.target.value)
            }
            placeholder="*/15 * * * *"
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      {/* Type-specific conditions */}
      {form.type === "threshold" && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Column *</label>
            <input
              required
              value={form.thresholdColumn}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("thresholdColumn", e.target.value)
              }
              placeholder="e.g. revenue"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Operator *</label>
            <select
              value={form.thresholdOperator}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                update("thresholdOperator", e.target.value)
              }
              className={inputClass}
            >
              <option value="gt">&gt; Greater than</option>
              <option value="gte">&gt;= Greater or equal</option>
              <option value="lt">&lt; Less than</option>
              <option value="lte">&lt;= Less or equal</option>
              <option value="eq">= Equal</option>
              <option value="neq">≠ Not equal</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Value *</label>
            <input
              required
              type="number"
              value={form.thresholdValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("thresholdValue", e.target.value)
              }
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {form.type === "freshness" && (
        <div>
          <label className={labelClass}>Max Stale Minutes *</label>
          <input
            required
            type="number"
            min="1"
            value={form.maxStaleMinutes}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              update("maxStaleMinutes", e.target.value)
            }
            className={`${inputClass} max-w-[200px]`}
          />
        </div>
      )}

      {form.type === "anomaly" && (
        <div>
          <label className={labelClass}>Z-Score Threshold *</label>
          <input
            required
            type="number"
            step="0.1"
            min="0"
            value={form.zScoreThreshold}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              update("zScoreThreshold", e.target.value)
            }
            className={`${inputClass} max-w-[200px]`}
          />
        </div>
      )}

      {form.type === "trend" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Column *</label>
            <input
              required
              value={form.trendColumn}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("trendColumn", e.target.value)
              }
              placeholder="e.g. sales"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Direction *</label>
            <select
              value={form.trendDirection}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                update("trendDirection", e.target.value)
              }
              className={inputClass}
            >
              <option value="decline">Decline</option>
              <option value="incline">Incline</option>
              <option value="reversal">Reversal</option>
            </select>
          </div>
        </div>
      )}

      {/* Channels */}
      <div>
        <label className={labelClass}>Channels</label>
        <div className="flex items-center gap-4 mt-1">
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.channels.includes("in_app")}
              onChange={() => handleChannelToggle("in_app")}
              className="rounded"
            />
            In-App
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.channels.includes("email")}
              onChange={() => handleChannelToggle("email")}
              className="rounded"
            />
            Email
          </label>
        </div>
      </div>

      {/* Recipients (email only) */}
      {form.channels.includes("email") && (
        <div>
          <label className={labelClass}>Recipients (comma-separated)</label>
          <input
            value={form.recipients}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              update("recipients", e.target.value)
            }
            placeholder="user@example.com, other@example.com"
            className={inputClass}
          />
        </div>
      )}

      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-[var(--accent)] text-white text-[13px] font-medium rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {submitting
            ? isEditing
              ? "Saving…"
              : "Creating…"
            : isEditing
              ? "Save Changes"
              : "Create Rule"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[13px] font-medium rounded-[var(--radius-md)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
