/**
 * components/MLBotBubble.tsx
 * Renders ML analysis results as rich chat bubbles
 * Supports inline Chart.js charts, tables, download button — no new UI needed
 *
 * Gap fixes: I — added duplicates/regression/summary meta, P — Chart.js error handling
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { MLBotMessage } from "../types/ml";

// ─── Chart renderer (loads Chart.js once, with error handling for Gap P) ──────

let chartJsLoaded = false;
let chartJsFailed = false;

function loadChartJs(): Promise<void> {
  if (chartJsLoaded || typeof window === "undefined") return Promise.resolve();
  if (chartJsFailed)
    return Promise.reject(new Error("Chart.js failed to load"));

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
    script.onload = () => {
      chartJsLoaded = true;
      resolve();
    };
    script.onerror = () => {
      chartJsFailed = true;
      reject(new Error("Failed to load Chart.js from CDN"));
    };
    document.head.appendChild(script);
  });
}

// ─── Inline Chart Component ────────────────────────────────────────────────────

function InlineChart({ config }: { config: MLBotMessage["chart"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config || !canvasRef.current) return;
    loadChartJs()
      .then(() => {
        const Chart = (
          window as unknown as {
            Chart: new (
              el: HTMLCanvasElement,
              cfg: unknown,
            ) => { destroy(): void };
          }
        ).Chart;
        if (!Chart) {
          setError("Chart.js not available");
          return;
        }

        if (chartRef.current)
          (chartRef.current as { destroy(): void }).destroy();

        const COLORS = [
          "#185FA5",
          "#1D9E75",
          "#D85A30",
          "#BA7517",
          "#993556",
          "#3C3489",
        ];
        const datasets = config.datasets.map((ds, i) => ({
          ...ds,
          backgroundColor: ds.backgroundColor ?? COLORS[i % COLORS.length],
          borderColor: ds.borderColor ?? COLORS[i % COLORS.length],
          borderWidth: 1.5,
          tension: 0.3,
          pointRadius: config.type === "scatter" ? 4 : 0,
          fill: false,
        }));

        chartRef.current = new Chart(canvasRef.current!, {
          type: config.type === "heatmap" ? "bar" : config.type,
          data: { labels: config.labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: datasets.length > 1,
                position: "bottom",
                labels: { boxWidth: 10, font: { size: 11 }, padding: 12 },
              },
            },
            scales: ["bar", "line", "scatter"].includes(config.type)
              ? {
                  x: {
                    grid: { color: "rgba(128,128,128,0.1)" },
                    ticks: { font: { size: 10 }, maxTicksLimit: 8 },
                  },
                  y: {
                    grid: { color: "rgba(128,128,128,0.1)" },
                    ticks: { font: { size: 10 } },
                  },
                }
              : {},
          },
        });
      })
      .catch(() => {
        setError("Could not load chart library");
      });

    return () => {
      if (chartRef.current) (chartRef.current as { destroy(): void }).destroy();
    };
  }, [config]);

  if (error) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: "8px 12px",
          fontSize: 12,
          color: "var(--color-text-secondary)",
          background: "var(--color-background-secondary)",
          borderRadius: 6,
        }}
      >
        Chart unavailable: {error}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: 200, marginTop: 12 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── Data Table Component ──────────────────────────────────────────────────────

function InlineTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  const [expanded, setExpanded] = useState(false);
  const displayRows = expanded ? rows : rows.slice(0, 5);

  return (
    <div style={{ marginTop: 12, overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                style={{
                  textAlign: "left",
                  padding: "5px 10px",
                  borderBottom: "1px solid rgba(128,128,128,0.2)",
                  color: "var(--color-text-secondary)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr
              key={i}
              style={{
                background:
                  i % 2 === 0 ? "transparent" : "rgba(128,128,128,0.04)",
              }}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "4px 10px",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            marginTop: 6,
            fontSize: 11,
            background: "none",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            padding: "2px 4px",
          }}
        >
          {expanded ? "Show less" : `Show all ${rows.length} rows`}
        </button>
      )}
    </div>
  );
}

// ─── Analysis Metadata (Gap I fix: added duplicates, regression, summary) ─────

const ANALYSIS_META: Record<
  string,
  { icon: string; color: string; bg: string }
> = {
  profile: { icon: "???", color: "#185FA5", bg: "#E6F1FB" },
  anomaly: { icon: "!", color: "#993C1D", bg: "#FAECE7" },
  trend: { icon: "^", color: "#0F6E56", bg: "#E1F5EE" },
  forecast: { icon: "o", color: "#854F0B", bg: "#FAEEDA" },
  cluster: { icon: "*", color: "#3C3489", bg: "#EEEDFE" },
  correlation: { icon: "~", color: "#3B6D11", bg: "#EAF3DE" },
  histogram: { icon: "#", color: "#185FA5", bg: "#E6F1FB" },
  duplicates: { icon: "=", color: "#6B3A8A", bg: "#F3EAFA" },
  regression: { icon: "f", color: "#0A5C7F", bg: "#E1F0F7" },
  summary: { icon: "S", color: "#3D6B0F", bg: "#EAF3DE" },
};

// ─── Main Bubble Component ─────────────────────────────────────────────────────

interface MLBotBubbleProps {
  message: MLBotMessage;
  onDownload?: (csv: string, filename: string) => void;
}

export default function MLBotBubble({ message, onDownload }: MLBotBubbleProps) {
  const meta = ANALYSIS_META[message.analysisType] ?? ANALYSIS_META.profile;

  function handleDownload() {
    if (!message.downloadPayload || !onDownload) return;
    onDownload(message.downloadPayload, `${message.analysisType}-results.csv`);
  }

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12,
        padding: "14px 16px",
        maxWidth: 680,
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: 6,
            background: meta.bg,
            color: meta.color,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {meta.icon}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            flex: 1,
          }}
        >
          {message.headline}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--color-text-secondary)",
            background: "var(--color-background-secondary)",
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          {message.executionMs}ms · {message.rowsAnalyzed.toLocaleString()} rows
        </span>
      </div>

      {/* Detail bullets */}
      {message.details.length > 0 && (
        <ul
          style={{
            margin: "0 0 10px 0",
            paddingLeft: 18,
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {message.details.map((d, i) => (
            <li
              key={i}
              style={{ color: "var(--color-text-secondary)", marginBottom: 2 }}
            >
              {d}
            </li>
          ))}
        </ul>
      )}

      {/* Inline chart */}
      {message.chart && <InlineChart config={message.chart} />}

      {/* Data table */}
      {message.tableData && (
        <InlineTable
          headers={message.tableData.headers}
          rows={message.tableData.rows}
        />
      )}

      {/* Footer actions */}
      {message.downloadPayload && (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            onClick={handleDownload}
            style={{
              fontSize: 11,
              padding: "4px 12px",
              borderRadius: 6,
              background: "transparent",
              border: "0.5px solid var(--color-border-secondary)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            Export results as CSV
          </button>
        </div>
      )}
    </div>
  );
}
