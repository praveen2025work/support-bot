"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Search,
  Shield,
  UserCircle2,
  Activity,
  Calendar,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminKpiTile,
  AdminDateRange,
} from "../components/AdminPageHeader";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  resourceType: string;
  details?: string;
  ip?: string;
}

const PAGE_SIZE = 25;

const RANGE_MS: Record<string, number | null> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  all: null,
};

const ACTION_TONES: Record<string, string> = {
  create: "var(--success)",
  update: "var(--brand)",
  delete: "var(--danger)",
  login: "#a78bfa",
  logout: "var(--text-muted)",
  export: "var(--accent)",
  import: "var(--accent)",
  approve: "var(--success)",
  reject: "var(--danger)",
};

function actionTone(action: string): string {
  const key = action.toLowerCase();
  for (const k of Object.keys(ACTION_TONES)) {
    if (key.includes(k)) return ACTION_TONES[k];
  }
  return "var(--brand)";
}

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("7d");
  const [page, setPage] = useState(0);

  const fetchAudit = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set("action", filterAction);
      if (filterUser) params.set("user", filterUser);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterUser, search]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  useEffect(() => {
    setPage(0);
  }, [filterAction, filterUser, search, range]);

  // Date range filter
  const filtered = useMemo(() => {
    const cutoffMs = RANGE_MS[range];
    if (!cutoffMs) return entries;
    const cutoff = Date.now() - cutoffMs;
    return entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  }, [entries, range]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const users = new Set(filtered.map((e) => e.user)).size;
    const todayCount = filtered.filter((e) =>
      e.timestamp.startsWith(new Date().toISOString().slice(0, 10)),
    ).length;
    const actions = new Set(filtered.map((e) => e.action)).size;
    return { total, users, todayCount, actions };
  }, [filtered]);

  // Group by date for the timeline
  const groupedByDay = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const e of filtered) {
      const day = e.timestamp.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const uniqueActions = Array.from(
    new Set(entries.map((e) => e.action)),
  ).sort();
  const uniqueUsers = Array.from(new Set(entries.map((e) => e.user))).sort();

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col">
      <AdminPageHeader
        eyebrow="Compliance"
        title="Audit Trail"
        subtitle="Every administrative action, who did it, and when."
        actions={
          <>
            <AdminDateRange value={range} onChange={setRange} />
            <button onClick={fetchAudit} className="btn-ghost !py-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </>
        }
        kpis={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AdminKpiTile
              label="Actions"
              value={stats.total.toLocaleString()}
              sub={`window · ${range}`}
              tone="var(--brand)"
              icon={<Activity className="w-3.5 h-3.5" />}
            />
            <AdminKpiTile
              label="Actors"
              value={stats.users.toLocaleString()}
              sub="distinct users"
              tone="var(--accent)"
              icon={<UserCircle2 className="w-3.5 h-3.5" />}
            />
            <AdminKpiTile
              label="Today"
              value={stats.todayCount.toLocaleString()}
              sub={new Date().toLocaleDateString()}
              tone="var(--success)"
              icon={<Calendar className="w-3.5 h-3.5" />}
            />
            <AdminKpiTile
              label="Action Types"
              value={stats.actions.toLocaleString()}
              sub="distinct verbs"
              tone="#a78bfa"
              icon={<Shield className="w-3.5 h-3.5" />}
            />
          </div>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources, details…"
            className="w-full pl-10 pr-4 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-subtle)] transition-all"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[12px] font-medium text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)]"
        >
          <option value="">All actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="px-3 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[12px] font-medium text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)]"
        >
          <option value="">All actors</option>
          {uniqueUsers.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-[13px] text-[var(--text-muted)]">
          Loading audit log…
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface p-10 text-center">
          <Shield className="w-8 h-8 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
          <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
            No audit entries in this window
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">
            {entries.length === 0
              ? "Actions are logged as users interact with the admin panel."
              : `Try widening the range — ${entries.length} entries exist outside ${range}.`}
          </p>
        </div>
      ) : (
        <>
          <div className="surface overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px] w-44">
                    When
                  </th>
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px] w-28">
                    Action
                  </th>
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px] w-32">
                    Actor
                  </th>
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px] w-28">
                    Type
                  </th>
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px]">
                    Resource
                  </th>
                  <th className="text-left px-4 py-2.5 eyebrow !text-[9.5px]">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((entry) => {
                  const tone = actionTone(entry.action);
                  return (
                    <tr
                      key={entry.id}
                      className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-[11.5px] text-[var(--text-muted)] font-mono whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
                            color: tone,
                          }}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11.5px] text-[var(--text-secondary)] font-mono truncate max-w-[140px]">
                        {entry.user}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-[var(--text-muted)]">
                        {entry.resourceType}
                      </td>
                      <td className="px-4 py-2.5 text-[11.5px] text-[var(--text-primary)] font-mono truncate max-w-[200px]">
                        {entry.resource}
                      </td>
                      <td className="px-4 py-2.5 text-[11.5px] text-[var(--text-muted)] truncate max-w-xs">
                        {entry.details || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-ghost !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="btn-ghost !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Daily breakdown */}
          {groupedByDay.length > 1 && (
            <div className="mt-6">
              <span className="eyebrow !text-[10px] mb-2 inline-block">
                Daily breakdown
              </span>
              <div className="surface p-4">
                <div className="flex items-end gap-1.5 h-24">
                  {groupedByDay
                    .slice(0, 30)
                    .reverse()
                    .map(([day, items]) => {
                      const max = Math.max(
                        ...groupedByDay.map(([, v]) => v.length),
                      );
                      const h = max > 0 ? (items.length / max) * 100 : 0;
                      return (
                        <div
                          key={day}
                          className="flex-1 flex flex-col items-center gap-1 group"
                          title={`${day} · ${items.length} actions`}
                        >
                          <div
                            className="w-full rounded-t-sm bg-[var(--brand)] opacity-60 group-hover:opacity-100 transition-opacity"
                            style={{ height: `${Math.max(2, h)}%` }}
                          />
                        </div>
                      );
                    })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[var(--text-muted)] font-mono">
                  <span>{groupedByDay[groupedByDay.length - 1]?.[0]}</span>
                  <span>{groupedByDay[0]?.[0]}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
