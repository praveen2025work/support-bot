"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf";

interface MetricBaseline {
  queryName: string;
  columnName: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  sampleCount: number;
  lastUpdated: string;
}

interface AnomalyConfig {
  enabled: boolean;
  zScoreWarning: number;
  zScoreCritical: number;
  minSamples: number;
  trackedColumns: string[];
}

export default function AnomalyPage() {
  const [tab, setTab] = useState<"config" | "baselines">("config");
  const [config, setConfig] = useState<AnomalyConfig | null>(null);
  const [baselines, setBaselines] = useState<MetricBaseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [groupId, setGroupId] = useState("default");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/anomaly/config?groupId=${encodeURIComponent(groupId)}`,
        {
          headers: csrfHeaders(),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch {
      /* ignore */
    }
  }, [groupId]);

  const fetchBaselines = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/anomaly/baselines?groupId=${encodeURIComponent(groupId)}`,
        {
          headers: csrfHeaders(),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setBaselines(data.baselines || []);
      }
    } catch {
      /* ignore */
    }
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await Promise.all([fetchConfig(), fetchBaselines()]);
      if (!cancelled) setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchConfig, fetchBaselines]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch("/api/admin/anomaly/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ groupId, config }),
      });
      await fetchConfig();
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const rebuildBaselines = async () => {
    setRebuilding(true);
    try {
      const res = await fetch("/api/admin/anomaly/rebuild-baselines", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        const data = await res.json();
        setBaselines(data.baselines || []);
      }
    } catch {
      /* ignore */
    }
    setRebuilding(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Anomaly Detection
        </h1>
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Anomaly Detection
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor query results for unusual numeric patterns using z-score and
            IQR analysis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Group:</label>
          <input
            type="text"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 w-32"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["config", "baselines"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "config" ? "Configuration" : "Baselines"}
          </button>
        ))}
      </div>

      {tab === "config" && config && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 w-40">
              Enabled
            </label>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 w-40">
              Warning Z-Score
            </label>
            <input
              type="number"
              step="0.1"
              value={config.zScoreWarning}
              onChange={(e) =>
                setConfig({
                  ...config,
                  zScoreWarning: parseFloat(e.target.value) || 2,
                })
              }
              className="text-sm border border-gray-300 rounded px-2 py-1 w-24"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 w-40">
              Critical Z-Score
            </label>
            <input
              type="number"
              step="0.1"
              value={config.zScoreCritical}
              onChange={(e) =>
                setConfig({
                  ...config,
                  zScoreCritical: parseFloat(e.target.value) || 3,
                })
              }
              className="text-sm border border-gray-300 rounded px-2 py-1 w-24"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 w-40">
              Min Samples
            </label>
            <input
              type="number"
              value={config.minSamples}
              onChange={(e) =>
                setConfig({
                  ...config,
                  minSamples: parseInt(e.target.value) || 5,
                })
              }
              className="text-sm border border-gray-300 rounded px-2 py-1 w-24"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}

      {tab === "baselines" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {baselines.length} baseline metric(s) tracked
            </p>
            <button
              onClick={rebuildBaselines}
              disabled={rebuilding}
              className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {rebuilding ? "Rebuilding..." : "Rebuild Baselines"}
            </button>
          </div>

          {baselines.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No baselines yet. Run queries to start building baselines, or
              click Rebuild.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-200 rounded">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Query
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Column
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Mean
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Std Dev
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Min
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Max
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Samples
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {baselines.map((b, i) => (
                    <tr
                      key={`${b.queryName}-${b.columnName}`}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-50/50 transition-colors`}
                    >
                      <td className="px-3 py-2 border-b border-gray-100 font-medium text-gray-800">
                        {b.queryName}
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100 text-gray-600">
                        {b.columnName}
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right">
                        {b.mean.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right">
                        {b.stdDev.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right">
                        {b.min.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right">
                        {b.max.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right">
                        {b.sampleCount}
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100 text-gray-400">
                        {new Date(b.lastUpdated).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
