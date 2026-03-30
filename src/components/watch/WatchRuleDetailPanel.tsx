"use client";

import { X } from "lucide-react";
import type { WatchRule } from "@/types/watch";

const TYPE_LABELS: Record<WatchRule["type"], string> = {
  threshold: "Threshold",
  trend: "Trend",
  anomaly: "Anomaly",
  freshness: "Freshness",
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: "> greater than",
  lt: "< less than",
  gte: ">= greater or equal",
  lte: "<= less or equal",
  eq: "= equal",
  neq: "≠ not equal",
};

function ConditionSummary({ rule }: { rule: WatchRule }) {
  const c = rule.condition as Record<string, unknown>;
  switch (rule.type) {
    case "threshold":
      return (
        <p>
          Alert when <strong>{String(c.column)}</strong>{" "}
          {OPERATOR_LABELS[String(c.operator)] ?? String(c.operator)}{" "}
          <strong>{String(c.value)}</strong>
        </p>
      );
    case "freshness":
      return (
        <p>
          Alert when data is stale for more than{" "}
          <strong>{String(c.maxStaleMinutes)} minutes</strong>
        </p>
      );
    case "anomaly":
      return (
        <p>
          Alert when z-score exceeds{" "}
          <strong>{String(c.zScoreThreshold)}</strong> on{" "}
          <strong>
            {c.columns === "all" ? "all columns" : String(c.columns)}
          </strong>
        </p>
      );
    case "trend":
      return (
        <p>
          Alert on <strong>{String(c.direction)}</strong> in{" "}
          <strong>{String(c.column)}</strong> (lookback:{" "}
          {String(c.lookbackPoints ?? 7)} points)
        </p>
      );
    default:
      return <p>Unknown rule type</p>;
  }
}

interface WatchRuleDetailPanelProps {
  rule: WatchRule;
  onClose: () => void;
}

export function WatchRuleDetailPanel({
  rule,
  onClose,
}: WatchRuleDetailPanelProps) {
  const labelClass =
    "text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]";
  const valueClass = "text-[13px] text-[var(--text-primary)] mt-0.5";

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {rule.name}
          </h3>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              rule.enabled
                ? "bg-[var(--success-subtle,#d1fae5)] text-[var(--success,#059669)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
            }`}
          >
            {rule.enabled ? "Active" : "Paused"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className={labelClass}>Query</div>
          <div className={valueClass}>{rule.queryName}</div>
        </div>
        <div>
          <div className={labelClass}>Type</div>
          <div className={valueClass}>{TYPE_LABELS[rule.type]}</div>
        </div>
        <div>
          <div className={labelClass}>Schedule</div>
          <div className={`${valueClass} font-mono`}>{rule.cronExpression}</div>
        </div>
        <div>
          <div className={labelClass}>Cooldown</div>
          <div className={valueClass}>{rule.cooldownMinutes} min</div>
        </div>
      </div>

      {/* Condition */}
      <div>
        <div className={labelClass}>Condition</div>
        <div className={`${valueClass} mt-1`}>
          <ConditionSummary rule={rule} />
        </div>
      </div>

      {/* Channels */}
      <div>
        <div className={labelClass}>Notifications</div>
        <div className="flex items-center gap-2 mt-1">
          {rule.channels.map((ch) => (
            <span
              key={ch}
              className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >
              {ch === "in_app" ? "In-App" : "Email"}
            </span>
          ))}
        </div>
        {rule.recipients && rule.recipients.length > 0 && (
          <div className="text-[12px] text-[var(--text-muted)] mt-1">
            Recipients: {rule.recipients.join(", ")}
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-[var(--border)]">
        <div>
          <div className={labelClass}>Created</div>
          <div className={valueClass}>
            {new Date(rule.createdAt).toLocaleString()}
          </div>
        </div>
        {rule.lastCheckedAt && (
          <div>
            <div className={labelClass}>Last Checked</div>
            <div className={valueClass}>
              {new Date(rule.lastCheckedAt).toLocaleString()}
            </div>
          </div>
        )}
        {rule.lastTriggeredAt && (
          <div>
            <div className={labelClass}>Last Triggered</div>
            <div className={valueClass}>
              {new Date(rule.lastTriggeredAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
