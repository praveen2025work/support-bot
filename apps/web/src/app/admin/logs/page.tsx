"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  RefreshCw,
  Search,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  AdminPageHeader,
  AdminKpiTile,
  AdminDateRange,
} from "../components/AdminPageHeader";

interface LogEntry {
  timestamp: string;
  sessionId: string;
  groupId: string;
  platform: string;
  userMessage: string;
  botResponse: string;
  intent: string;
  confidence: number;
  executionMs?: number;
  hasRichContent?: boolean;
}

const RANGE_PRESETS = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "All", value: "all" },
];

const RANGE_MS: Record<string, number | null> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  all: null,
};

export default function ConversationLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [intentDist, setIntentDist] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState("");
  const [filterIntent, setFilterIntent] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<string>("24h");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterGroup) params.set("group", filterGroup);
      if (filterIntent) params.set("intent", filterIntent);
      if (search) params.set("search", search);
      params.set("limit", "200");

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setIntentDist(data.intentDistribution || {});
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [filterGroup, filterIntent, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClear = async () => {
    await fetch("/api/admin/logs", {
      method: "DELETE",
      headers: { ...csrfHeaders() },
    });
    await fetchLogs();
    setShowClearConfirm(false);
  };

  // Date range filter — client-side over fetched window
  const filteredLogs = useMemo(() => {
    const cutoffMs = RANGE_MS[range];
    if (!cutoffMs) return logs;
    const cutoff = Date.now() - cutoffMs;
    return logs.filter((l) => new Date(l.timestamp).getTime() >= cutoff);
  }, [logs, range]);

  const stats = useMemo(() => {
    const inRange = filteredLogs.length;
    const lowConf = filteredLogs.filter((l) => l.confidence < 0.5).length;
    const avgLatency =
      filteredLogs.filter((l) => l.executionMs != null).length > 0
        ? Math.round(
            filteredLogs
              .filter((l) => l.executionMs != null)
              .reduce((s, l) => s + (l.executionMs ?? 0), 0) /
              filteredLogs.filter((l) => l.executionMs != null).length,
          )
        : 0;
    const uniqueSessions = new Set(filteredLogs.map((l) => l.sessionId)).size;
    return { inRange, lowConf, avgLatency, uniqueSessions };
  }, [filteredLogs]);

  const uniqueGroups = Array.from(new Set(logs.map((l) => l.groupId)));
  const uniqueIntents = Object.keys(intentDist).sort();

  return (
    <div className="flex flex-col">
      <AdminPageHeader
        eyebrow="Observability"
        title="Conversation Logs"
        subtitle={`${total.toLocaleString()} conversations on record · live tail from the engine`}
        actions={
          <>
            <AdminDateRange
              value={range}
              onChange={setRange}
              presets={RANGE_PRESETS}
            />
            <button
              onClick={fetchLogs}
              className="btn-ghost !py-1.5"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            {total > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold rounded-full border border-rose-500/30 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </>
        }
        kpis={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AdminKpiTile
              label="In Range"
              value={stats.inRange.toLocaleString()}
              sub={`window · ${range}`}
              tone="var(--brand)"
              icon={<MessageSquare className="w-3.5 h-3.5" />}
            />
            <AdminKpiTile
              label="Unique Sessions"
              value={stats.uniqueSessions.toLocaleString()}
              sub="distinct callers"
              tone="var(--accent)"
            />
            <AdminKpiTile
              label="Low Confidence"
              value={stats.lowConf.toLocaleString()}
              sub="< 50%"
              tone="var(--danger)"
              progress={
                stats.inRange > 0 ? (stats.lowConf / stats.inRange) * 100 : 0
              }
            />
            <AdminKpiTile
              label="Avg Latency"
              value={stats.avgLatency > 0 ? `${stats.avgLatency}ms` : "—"}
              sub="end-to-end"
              tone="var(--success)"
            />
          </div>
        }
      />

      {/* Intent distribution chips */}
      {Object.keys(intentDist).length > 0 && (
        <div className="surface p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow !text-[10px]">Intent Distribution</span>
            {filterIntent && (
              <button
                onClick={() => setFilterIntent("")}
                className="text-[11px] text-[var(--brand)] hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(intentDist)
              .sort((a, b) => b[1] - a[1])
              .map(([intent, count]) => {
                const active = filterIntent === intent;
                return (
                  <button
                    key={intent}
                    onClick={() => setFilterIntent(active ? "" : intent)}
                    className={`chip !text-[10.5px] !py-1 transition-colors ${
                      active ? "chip-brand" : ""
                    }`}
                  >
                    {intent}
                    <span className="ml-1 font-mono text-[10px] opacity-70">
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="w-full pl-10 pr-4 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-subtle)] transition-all"
          />
        </div>
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="px-3 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[12px] font-medium text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)]"
        >
          <option value="">All groups</option>
          {uniqueGroups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={filterIntent}
          onChange={(e) => setFilterIntent(e.target.value)}
          className="px-3 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[12px] font-medium text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)]"
        >
          <option value="">All intents</option>
          {uniqueIntents.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      {/* Logs table */}
      {loading ? (
        <div className="surface p-8 text-center text-[13px] text-[var(--text-muted)]">
          Loading logs…
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="surface p-10 text-center">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
          <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
            No logs in this window
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">
            {logs.length === 0
              ? "Chat with the bot to generate conversation logs."
              : `Try widening the range — ${logs.length} logs exist outside ${range}.`}
          </p>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <div className="max-h-[640px] overflow-y-auto">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px] w-8" />
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px] w-40">
                    Time
                  </th>
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px]">
                    User Message
                  </th>
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px] w-32">
                    Intent
                  </th>
                  <th className="text-right px-4 py-2.5 eyebrow !text-[9.5px] w-24">
                    Conf.
                  </th>
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px] w-28">
                    Group
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => {
                  const isOpen = expandedIdx === i;
                  const confTone =
                    log.confidence >= 0.8
                      ? "var(--success)"
                      : log.confidence >= 0.5
                        ? "var(--warning)"
                        : "var(--danger)";
                  return (
                    <Fragment key={i}>
                      <tr
                        onClick={() => setExpandedIdx(isOpen ? null : i)}
                        className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]/60 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2.5">
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--brand)]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[11.5px] text-[var(--text-muted)] font-mono whitespace-nowrap">
                          <Clock className="inline w-3 h-3 mr-1 opacity-50" />
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--text-primary)] truncate max-w-xs">
                          {log.userMessage}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="chip chip-brand !py-0.5 !px-2 !text-[10px] font-mono">
                            {log.intent}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className="text-[11.5px] font-semibold numerals"
                            style={{ color: confTone }}
                          >
                            {(log.confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-[var(--text-muted)] font-mono">
                          {log.groupId}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <div className="eyebrow !text-[9.5px] mb-1.5">
                                  User Message
                                </div>
                                <div className="text-[12.5px] text-[var(--text-primary)] bg-[var(--bg-elevated)] rounded-[var(--radius-md)] p-3 border border-[var(--border)]">
                                  {log.userMessage}
                                </div>
                              </div>
                              <div>
                                <div className="eyebrow !text-[9.5px] mb-1.5">
                                  Bot Response
                                </div>
                                <div className="text-[12.5px] text-[var(--text-primary)] bg-[var(--bg-elevated)] rounded-[var(--radius-md)] p-3 border border-[var(--border)] whitespace-pre-wrap max-h-40 overflow-y-auto">
                                  {log.botResponse}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-3 text-[10.5px] text-[var(--text-muted)] font-mono flex-wrap">
                              <span>
                                session · {log.sessionId.slice(0, 12)}…
                              </span>
                              <span>platform · {log.platform}</span>
                              {log.executionMs != null && (
                                <span>latency · {log.executionMs}ms</span>
                              )}
                              {log.hasRichContent && (
                                <span className="chip chip-brand !py-0.5 !px-1.5 !text-[9px]">
                                  Rich Content
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showClearConfirm}
        title="Clear All Logs"
        message="Clear all conversation logs? This cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
