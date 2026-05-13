"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Database,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

interface HealthMetric {
  label: string;
  status: string;
  percent: number;
  tone: string;
}

interface ActionHistoryItem {
  id: string;
  title: string;
  meta: string;
  icon: typeof Database;
  tone: string;
}

interface AlertEvent {
  id?: string;
  ruleId?: string;
  ruleName?: string;
  severity?: string;
  /** Engine emits `timestamp`; some legacy callers used `createdAt`. */
  timestamp?: string;
  createdAt?: string;
  message?: string;
}

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function SystemHealthRail() {
  const [engineUp, setEngineUp] = useState<"ok" | "down" | "checking">(
    "checking",
  );
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loadedAlerts, setLoadedAlerts] = useState(false);

  // Poll engine health
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/health", {
          signal: AbortSignal.timeout(4000),
        });
        if (!cancelled) setEngineUp(res.ok ? "ok" : "down");
      } catch {
        if (!cancelled) setEngineUp("down");
      }
    }
    void check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Load recent alerts to populate Action History
  useEffect(() => {
    let cancelled = false;
    fetch("/api/watch/alerts?groupId=default&limit=6")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const rows = (data.alerts || data.data || []) as AlertEvent[];
        setAlerts(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadedAlerts(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive health metrics from real engine status + alert volume.
  const criticalCount = alerts.filter(
    (a) => (a.severity ?? "").toLowerCase() === "critical",
  ).length;
  const warningCount = alerts.filter(
    (a) => (a.severity ?? "").toLowerCase() === "warning",
  ).length;
  const totalAlerts = alerts.length;
  const alertLoad =
    totalAlerts === 0
      ? 0
      : Math.min(
          100,
          Math.round((criticalCount / Math.max(1, totalAlerts)) * 100),
        );

  const health: HealthMetric[] = [
    {
      label: "Engine",
      status:
        engineUp === "ok" ? "Online" : engineUp === "down" ? "Offline" : "…",
      percent: engineUp === "ok" ? 100 : engineUp === "down" ? 0 : 50,
      tone:
        engineUp === "ok"
          ? "var(--success)"
          : engineUp === "down"
            ? "var(--danger)"
            : "var(--text-muted)",
    },
    {
      label: "Alert Load",
      status:
        totalAlerts === 0 ? "Clear" : criticalCount > 0 ? "Elevated" : "Steady",
      percent: alertLoad,
      tone:
        criticalCount > 0
          ? "var(--danger)"
          : warningCount > 0
            ? "var(--warning)"
            : "var(--success)",
    },
  ];

  // Recent Activity — dedupe by rule (most recent per rule), surface the
  // distinguishing alert message so each row carries unique signal rather
  // than five identical "Sales Data Freshness" entries.
  // Note: a stable index-based fallback key keeps this pure (the previous
  // `Math.random()` fallback failed the no-impure-during-render lint rule).
  const dedupedByRule = new Map<string, AlertEvent & { count: number }>();
  for (let i = 0; i < alerts.length; i++) {
    const a = alerts[i];
    const key = a.ruleId ?? a.ruleName ?? a.id ?? `__idx_${i}`;
    const existing = dedupedByRule.get(key);
    if (!existing) {
      dedupedByRule.set(key, { ...a, count: 1 });
    } else {
      existing.count += 1;
      const ts = a.timestamp ?? a.createdAt;
      const exTs = existing.timestamp ?? existing.createdAt;
      if (ts && (!exTs || new Date(ts) > new Date(exTs))) {
        existing.timestamp = ts;
        existing.message = a.message ?? existing.message;
        existing.severity = a.severity ?? existing.severity;
      }
    }
  }
  const uniqueAlerts = Array.from(dedupedByRule.values()).sort((a, b) => {
    const ta = new Date(a.timestamp ?? a.createdAt ?? 0).getTime();
    const tb = new Date(b.timestamp ?? b.createdAt ?? 0).getTime();
    return tb - ta;
  });

  const actions: (ActionHistoryItem & { subtitle?: string; count: number })[] =
    uniqueAlerts.slice(0, 5).map((a, i) => {
      const sev = (a.severity ?? "info").toLowerCase();
      const tone =
        sev === "critical"
          ? "var(--danger)"
          : sev === "warning"
            ? "var(--warning)"
            : "var(--brand)";
      const Icon =
        sev === "critical"
          ? AlertOctagon
          : sev === "warning"
            ? TriangleAlert
            : CheckCircle2;
      return {
        id: a.id ?? `alert-${i}`,
        title: a.ruleName ?? "Watch alert",
        subtitle: a.message,
        meta: relativeTime(a.timestamp ?? a.createdAt),
        icon: Icon,
        tone,
        count: a.count,
      };
    });

  return (
    <div className="flex flex-col gap-3">
      {/* System Health */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
        <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span className="eyebrow !text-[10px]">System Health</span>
          </div>
          <span
            className={`chip !py-0.5 !px-2 !text-[9.5px] !tracking-[0.1em] uppercase ${engineUp === "ok" ? "chip-success" : engineUp === "down" ? "chip-danger" : ""}`}
          >
            {engineUp === "ok" ? "Live" : engineUp === "down" ? "Down" : "…"}
          </span>
        </header>
        <ul className="px-3.5 py-3 space-y-3">
          {health.map((h) => (
            <li key={h.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11.5px] font-medium text-[var(--text-secondary)]">
                  {h.label}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: h.tone }}
                >
                  {h.status}
                </span>
              </div>
              <div className="relative h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                  style={{ width: `${h.percent}%`, backgroundColor: h.tone }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Action History */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
        <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span className="eyebrow !text-[10px]">Recent Activity</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            {actions.length}
          </span>
        </header>
        {actions.length === 0 ? (
          <div className="px-4 py-5 text-center text-[11.5px] text-[var(--text-muted)]">
            {loadedAlerts
              ? "All clear · no recent alerts."
              : "Loading activity…"}
          </div>
        ) : (
          <ul className="py-1">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <li
                  key={a.id}
                  className="flex items-start gap-3 px-3.5 py-2.5 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <span
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${a.tone} 14%, transparent)`,
                      color: a.tone,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                        {a.title}
                      </span>
                      {a.count > 1 && (
                        <span
                          className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${a.tone} 14%, transparent)`,
                            color: a.tone,
                          }}
                          title={`Fired ${a.count} times`}
                        >
                          ×{a.count}
                        </span>
                      )}
                    </div>
                    {a.subtitle && (
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-snug">
                        {a.subtitle}
                      </div>
                    )}
                    <div className="text-[10.5px] text-[var(--text-muted)] mt-1 font-mono inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {a.meta}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
