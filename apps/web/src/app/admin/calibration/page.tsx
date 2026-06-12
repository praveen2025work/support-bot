"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Play, Activity, TrendingUp, Clock } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf";
import { AdminPageHeader, AdminKpiTile } from "../components/AdminPageHeader";

interface CalibrationRecord {
  timestamp: string;
  testSetSize: number;
  testSetHash: string;
  best: { weights: string; threshold: number; score: number };
  current: {
    weights: string;
    threshold: number;
    correctConfident: number;
    wrongConfident: number;
    oodFalseConfident: number;
    posTotal: number;
    oodTotal: number;
    compositeScore: number;
  };
}

function TrendSparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <p className="text-sm text-gray-400">
        Need at least two runs to chart drift over time.
      </p>
    );
  }
  const W = 600;
  const H = 140;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((v - min) / span) * (H - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-36"
      preserveAspectRatio="none"
      role="img"
      aria-label="Calibration composite score over time"
    >
      <polyline
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        points={points.join(" ")}
      />
      {points.map((p, i) => {
        const [x, y] = p.split(",");
        return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--brand)" />;
      })}
    </svg>
  );
}

export default function CalibrationPage() {
  const [history, setHistory] = useState<CalibrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/calibration");
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const runNow = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/calibration/run", {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (!res.ok) {
        setError(`Calibration run failed (${res.status})`);
        return;
      }
      await fetchHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  // history is newest-first; chart wants chronological.
  const chronological = [...history].reverse();
  const latest = history[0];
  const previous = history[1];
  const drift =
    latest && previous
      ? Math.abs(
          latest.current.compositeScore - previous.current.compositeScore,
        )
      : null;

  return (
    <div className="flex flex-col">
      <AdminPageHeader
        eyebrow="NLP"
        title="Threshold Calibration"
        subtitle="Composite score of the live NLP config against a frozen test set, over time."
        actions={
          <>
            <button onClick={fetchHistory} className="btn-ghost !py-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={runNow}
              disabled={running}
              className="btn-primary !py-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {running ? "Running…" : "Run now"}
            </button>
          </>
        }
        kpis={
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AdminKpiTile
              label="Latest Composite"
              value={latest ? latest.current.compositeScore.toFixed(1) : "—"}
              sub={latest ? `${latest.current.posTotal} positives` : "no runs"}
              tone="var(--brand)"
              icon={<Activity className="w-3.5 h-3.5" />}
            />
            <AdminKpiTile
              label="Drift vs Previous"
              value={drift != null ? drift.toFixed(1) : "—"}
              sub={previous ? "Δ composite" : "needs 2 runs"}
              tone={
                drift != null && drift > 2 ? "var(--danger)" : "var(--success)"
              }
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
            <AdminKpiTile
              label="Last Run"
              value={
                latest ? new Date(latest.timestamp).toLocaleDateString() : "—"
              }
              sub={
                latest ? new Date(latest.timestamp).toLocaleTimeString() : ""
              }
              tone="var(--accent)"
              icon={<Clock className="w-3.5 h-3.5" />}
            />
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading calibration history…</p>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            No calibration runs yet. Click “Run now” to compute the first
            baseline, or enable the scheduler (CALIBRATION_ENABLED=true).
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Composite score over time
            </h2>
            <TrendSparkline
              values={chronological.map((r) => r.current.compositeScore)}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">When</th>
                  <th className="text-right px-4 py-2 font-medium">
                    Composite
                  </th>
                  <th className="text-right px-4 py-2 font-medium">Correct</th>
                  <th className="text-right px-4 py-2 font-medium">Wrong</th>
                  <th className="text-right px-4 py-2 font-medium">OOD FP</th>
                  <th className="text-left px-4 py-2 font-medium">
                    Best (swept)
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr
                    key={r.timestamp}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-2 text-xs text-gray-500 font-mono whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-800 tabular-nums">
                      {r.current.compositeScore.toFixed(1)}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600">
                      {r.current.correctConfident}/{r.current.posTotal}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600">
                      {r.current.wrongConfident}
                    </td>
                    <td className="px-4 py-2 text-right text-amber-600">
                      {r.current.oodFalseConfident}/{r.current.oodTotal}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 font-mono">
                      {r.best.weights} @ {r.best.threshold}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
