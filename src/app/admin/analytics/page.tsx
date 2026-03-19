"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf";
import { useSSE } from "@/hooks/useSSE";

interface QueryStat {
  id: string;
  queryName: string;
  success: boolean;
  durationMs: number;
  timestamp: string;
  filters?: Record<string, unknown>;
}

interface AggregatedStat {
  queryName: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  failureRate: string;
  avgDurationMs: number;
  p50Ms: number;
  p95Ms: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<QueryStat[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const { events: liveEvents, connected: sseConnected } = useSSE("/api/events");

  const fetchStats = useCallback(async () => {
    try {
      let url = "/api/admin/stats";
      const params = new URLSearchParams();
      if (filterQuery) params.set("queryName", filterQuery);
      if (timeRange !== "all") {
        const now = new Date();
        const since = new Date();
        if (timeRange === "1h") since.setHours(now.getHours() - 1);
        else if (timeRange === "24h") since.setDate(now.getDate() - 1);
        else if (timeRange === "7d") since.setDate(now.getDate() - 7);
        params.set("since", since.toISOString());
      }
      if (params.toString()) url += "?" + params.toString();

      const res = await fetch(url);
      const data = await res.json();
      setStats(data.stats || []);
      setAggregated(data.aggregated || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterQuery, timeRange]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const totalExecs = aggregated.reduce((s, a) => s + a.totalExecutions, 0);
  const totalFails = aggregated.reduce((s, a) => s + a.failureCount, 0);
  const avgDuration =
    aggregated.length > 0
      ? Math.round(
          aggregated.reduce(
            (s, a) => s + a.avgDurationMs * a.totalExecutions,
            0,
          ) / Math.max(totalExecs, 1),
        )
      : 0;

  const sortedAgg = [...aggregated].sort(
    (a, b) => b.totalExecutions - a.totalExecutions,
  );

  return (
    <div>
      <div className="pb-6 mb-6 border-b border-gray-100">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">
          Query execution statistics and performance metrics
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Total Executions
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {totalExecs}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Unique Queries
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {aggregated.length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Avg Duration
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {avgDuration}ms
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Failure Rate
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${totalFails > 0 ? "text-red-600" : "text-green-600"}`}
          >
            {totalExecs > 0
              ? ((totalFails / totalExecs) * 100).toFixed(1)
              : "0.0"}
            %
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="all">All time</option>
          <option value="1h">Last hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
        <select
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="">All queries</option>
          {aggregated.map((a) => (
            <option key={a.queryName} value={a.queryName}>
              {a.queryName}
            </option>
          ))}
        </select>
        <button
          onClick={fetchStats}
          className="text-sm text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading stats...</p>
      ) : aggregated.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            No execution data yet. Run some queries in the chatbot to see
            analytics here.
          </p>
        </div>
      ) : (
        <>
          {/* Query performance table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                Query Performance
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Query
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Executions
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Failures
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fail Rate
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg (ms)
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    p50 (ms)
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    p95 (ms)
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAgg.map((a) => (
                  <tr
                    key={a.queryName}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-2 font-medium text-gray-900 font-mono text-xs">
                      {a.queryName}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {a.totalExecutions}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600">
                      {a.successCount}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600">
                      {a.failureCount}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                          a.failureCount > 0
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {a.failureRate}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {a.avgDurationMs}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {a.p50Ms}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {a.p95Ms}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Execution volume bar chart (simple CSS) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Execution Volume by Query
            </h2>
            <div className="space-y-2">
              {sortedAgg.slice(0, 10).map((a) => {
                const maxExecs = sortedAgg[0]?.totalExecutions || 1;
                const pct = (a.totalExecutions / maxExecs) * 100;
                return (
                  <div key={a.queryName} className="flex items-center gap-3">
                    <div className="w-36 text-xs font-mono text-gray-600 truncate">
                      {a.queryName}
                    </div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-12 text-xs text-right text-gray-500">
                      {a.totalExecutions}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent executions log */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                Recent Executions ({stats.length})
              </h2>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50/80">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Query
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats]
                    .reverse()
                    .slice(0, 50)
                    .map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-1.5 text-gray-500">
                          {new Date(s.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-1.5 font-mono text-gray-700">
                          {s.queryName}
                        </td>
                        <td className="px-4 py-1.5 text-right text-gray-700">
                          {s.durationMs}ms
                        </td>
                        <td className="px-4 py-1.5 text-center">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${s.success ? "bg-green-500" : "bg-red-500"}`}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Live Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Live Activity</h2>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${sseConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-xs text-gray-500">
              {sseConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {liveEvents.length === 0 ? (
            <p className="text-xs text-gray-400 p-4 text-center">
              No live events yet. Activity will appear here in real time.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50/80">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intent
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...liveEvents]
                  .reverse()
                  .slice(0, 10)
                  .map((ev, i) => {
                    const d = ev.data as Record<string, unknown>;
                    return (
                      <tr
                        key={`${ev.timestamp}-${i}`}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-1.5 text-gray-500">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-1.5 text-gray-700">{ev.type}</td>
                        <td className="px-4 py-1.5 font-mono text-gray-700">
                          {(d.intent as string) || "-"}
                        </td>
                        <td className="px-4 py-1.5 text-right text-gray-700">
                          {d.executionMs != null ? `${d.executionMs}ms` : "-"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
