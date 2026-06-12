"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Eye,
  AlertOctagon,
  Activity,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { WatchRuleList } from "@/components/watch/WatchRuleList";
import { WatchRuleForm } from "@/components/watch/WatchRuleForm";
import { WatchRuleDetailPanel } from "@/components/watch/WatchRuleDetailPanel";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { useEngineStatus } from "@/contexts/EngineStatusContext";
import type { WatchRule } from "@/types/watch";

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

function WatchPageContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? "default";

  const [showForm, setShowForm] = useState(false);
  const [selectedRule, setSelectedRule] = useState<WatchRule | null>(null);
  const [listKey, setListKey] = useState(0);
  const [rules, setRules] = useState<WatchRule[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  // Engine health comes from the shared EngineStatusProvider (single 30s
  // poll) instead of a per-page setInterval.
  const engineUp = useEngineStatus();

  useEffect(() => {
    fetch(`/api/watch/rules?groupId=${groupId}`)
      .then((r) => r.json())
      .then((data) => setRules(data.rules || data.data || []))
      .catch(() => {});
    fetch(`/api/watch/alerts?groupId=${groupId}&limit=20`)
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts || data.data || []))
      .catch(() => {});
  }, [groupId, listKey]);

  function handleCreated() {
    setShowForm(false);
    setSelectedRule(null);
    setListKey((k) => k + 1);
  }

  function handleEdit(rule: WatchRule) {
    setSelectedRule(rule);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setSelectedRule(null);
  }

  const stats = useMemo(() => {
    const enabled = rules.filter((r) => r.enabled).length;
    const total = rules.length;
    const ratio = total > 0 ? Math.round((enabled / total) * 100) : 0;
    const critical = alerts.filter(
      (a) => (a.severity ?? "").toLowerCase() === "critical",
    ).length;
    const last24h = alerts.length;
    return { enabled, total, ratio, critical, last24h };
  }, [rules, alerts]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)]">
      <ContextualTopBar
        title="Watch"
        subtitle="Continuous training & rule observation"
      >
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setSelectedRule(null);
            }}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            New Rule
          </button>
        )}
      </ContextualTopBar>

      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 max-w-[1400px] mx-auto">
          {/* Main column */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiTile
                label="Active Rules"
                value={stats.enabled}
                sub={`of ${stats.total}`}
                tone="var(--brand)"
                icon={Eye}
              />
              <KpiTile
                label="Coverage"
                value={`${stats.ratio}%`}
                sub="rules enabled"
                tone="var(--success)"
                icon={CheckCircle2}
                progress={stats.ratio}
              />
              <KpiTile
                label="Alerts · 24h"
                value={stats.last24h}
                sub={`${stats.critical} critical`}
                tone="var(--accent)"
                icon={Activity}
              />
              <KpiTile
                label="Engine Health"
                value={
                  engineUp === "ok"
                    ? "Online"
                    : engineUp === "down"
                      ? "Offline"
                      : "…"
                }
                sub={
                  engineUp === "ok"
                    ? "health probe responding"
                    : engineUp === "down"
                      ? "engine unreachable"
                      : "checking"
                }
                tone={
                  engineUp === "ok"
                    ? "var(--success)"
                    : engineUp === "down"
                      ? "var(--danger)"
                      : "var(--text-muted)"
                }
                icon={TrendingUp}
              />
            </div>

            {/* Detail panel for selected rule */}
            {selectedRule && !showForm && (
              <div className="surface p-5">
                <WatchRuleDetailPanel
                  rule={selectedRule}
                  onClose={() => setSelectedRule(null)}
                  onEdit={() => setShowForm(true)}
                />
              </div>
            )}

            {/* Form */}
            {showForm && (
              <div className="surface p-5">
                <WatchRuleForm
                  key={selectedRule?.id ?? "new"}
                  groupId={groupId}
                  editingRule={selectedRule}
                  onCreated={handleCreated}
                  onCancel={handleCancel}
                />
              </div>
            )}

            {/* Rule list */}
            <div className="surface overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="eyebrow !text-[10px]">Watch Rules</span>
                  <h2 className="font-display text-[15px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                    Rule Library
                  </h2>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  {rules.length} total
                </span>
              </div>
              <div className="px-5 py-2">
                <WatchRuleList
                  key={listKey}
                  groupId={groupId}
                  onEdit={handleEdit}
                />
              </div>
            </div>
          </div>

          {/* Right rail — Stitch Training Progress style */}
          <aside className="flex flex-col gap-3">
            <div className="surface overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <span className="eyebrow !text-[10px]">Training Progress</span>
                <span className="chip chip-brand !py-0.5 !px-2 !text-[9.5px] uppercase">
                  Live
                </span>
              </div>
              <div className="px-4 py-4">
                <div className="numerals text-[40px] font-bold leading-none text-[var(--text-primary)]">
                  {stats.ratio}%
                </div>
                <div className="text-[11px] text-emerald-500 font-semibold mt-1">
                  ↑ rules engaged
                </div>
                <p className="text-[11.5px] text-[var(--text-muted)] mt-3 leading-relaxed">
                  Watch model accuracy trends up as more rules feed the
                  detection engine.
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${stats.ratio}%`,
                      background: "var(--brand-gradient)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recent alerts */}
            <div className="surface overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <span className="eyebrow !text-[10px]">Recent Alerts</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {alerts.length}
                </span>
              </div>
              <ul className="py-1 max-h-[280px] overflow-auto">
                {alerts.length === 0 && (
                  <li className="px-4 py-6 text-center text-[11.5px] text-[var(--text-muted)]">
                    All clear · no alerts in the last 24h.
                  </li>
                )}
                {alerts.slice(0, 8).map((a, i) => {
                  const sev = (a.severity ?? "info").toLowerCase();
                  const tone =
                    sev === "critical"
                      ? "var(--danger)"
                      : sev === "warning"
                        ? "var(--warning)"
                        : "var(--brand)";
                  const ts = a.timestamp ?? a.createdAt;
                  return (
                    <li
                      key={a.id ?? `${i}`}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <span
                        className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
                          color: tone,
                        }}
                      >
                        <Clock className="w-3 h-3" strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                          {a.ruleName ?? "Untitled rule"}
                        </div>
                        {a.message && (
                          <div className="text-[10.5px] text-[var(--text-secondary)] line-clamp-2 leading-snug mt-0.5">
                            {a.message}
                          </div>
                        )}
                        <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                          {ts ? new Date(ts).toLocaleString() : "—"}
                        </div>
                      </div>
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
                          color: tone,
                        }}
                      >
                        {sev}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  tone,
  icon: Icon,
  progress,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: string;
  icon: typeof Eye;
  progress?: number;
}) {
  return (
    <div className="relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3.5 overflow-hidden shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)] transition-all">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px] opacity-80"
        style={{ backgroundColor: tone }}
      />
      <div className="flex items-start justify-between mb-1.5">
        <span className="eyebrow !text-[9.5px]">{label}</span>
        <Icon
          className="w-3.5 h-3.5"
          style={{ color: tone }}
          strokeWidth={1.7}
        />
      </div>
      <div className="numerals text-[22px] font-bold leading-none text-[var(--text-primary)]">
        {value}
      </div>
      <div className="text-[10.5px] text-[var(--text-muted)] mt-1.5">{sub}</div>
      {progress !== undefined && (
        <div className="mt-2 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${progress}%`, backgroundColor: tone }}
          />
        </div>
      )}
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-[13px] text-[var(--text-muted)]">Loading…</div>
      }
    >
      <WatchPageContent />
    </Suspense>
  );
}
