"use client";

import { useMemo } from "react";

function getToken(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

interface HeatmapChartProps {
  matrix: number[][];
  rowLabels: string[];
  colLabels: string[];
  colorScale: "diverging" | "sequential";
  title?: string;
}

function getCellColor(
  value: number,
  colorScale: "diverging" | "sequential",
): string {
  if (colorScale === "diverging") {
    // blue(-1) -> white(0) -> red(1)
    const clamped = Math.max(-1, Math.min(1, value));
    if (clamped < 0) {
      const intensity = Math.round(255 * (1 + clamped));
      return `rgb(${intensity}, ${intensity}, 255)`;
    } else {
      const intensity = Math.round(255 * (1 - clamped));
      return `rgb(255, ${intensity}, ${intensity})`;
    }
  } else {
    // sequential: white(0) -> red(100)
    const clamped = Math.max(0, Math.min(100, value));
    const ratio = clamped / 100;
    const r = 255;
    const g = Math.round(255 * (1 - ratio));
    const b = Math.round(255 * (1 - ratio));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getTextColor(
  value: number,
  colorScale: "diverging" | "sequential",
): string {
  const bgPrimary = getToken("--bg-primary") || "#ffffff";
  const textPrimary = getToken("--text-primary") || "#1f2937";
  if (colorScale === "diverging") {
    return Math.abs(value) > 0.6 ? bgPrimary : textPrimary;
  }
  return value > 60 ? bgPrimary : textPrimary;
}

function formatValue(
  value: number,
  colorScale: "diverging" | "sequential",
): string {
  if (colorScale === "diverging") {
    return value.toFixed(2);
  }
  return value.toFixed(1);
}

export default function HeatmapChart({
  matrix,
  rowLabels,
  colLabels,
  colorScale,
  title,
}: HeatmapChartProps) {
  const cells = useMemo(() => {
    return matrix.map((row, ri) =>
      row.map((val, ci) => ({
        value: val,
        bg: getCellColor(val, colorScale),
        fg: getTextColor(val, colorScale),
        display: formatValue(val, colorScale),
      })),
    );
  }, [matrix, colorScale]);

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
      {title && (
        <div className="text-xs font-medium text-gray-600 mb-2">{title}</div>
      )}
      <div className="overflow-auto" style={{ maxHeight: 400 }}>
        <table
          className="border-collapse text-[10px]"
          style={{ minWidth: "100%" }}
        >
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-white p-1 border border-gray-100" />
              {colLabels.map((col, ci) => (
                <th
                  key={ci}
                  className="sticky top-0 z-10 bg-white p-1 border border-gray-100 text-gray-500 font-medium truncate"
                  style={{ maxWidth: 80, minWidth: 40 }}
                  title={col}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => (
              <tr key={ri}>
                <td
                  className="sticky left-0 z-10 bg-white p-1 border border-gray-100 text-gray-500 font-medium truncate"
                  style={{ maxWidth: 100 }}
                  title={rowLabels[ri]}
                >
                  {rowLabels[ri]}
                </td>
                {row.map((_, ci) => {
                  const cell = cells[ri][ci];
                  return (
                    <td
                      key={ci}
                      className="p-1 border border-gray-100 text-center font-mono"
                      style={{
                        backgroundColor: cell.bg,
                        color: cell.fg,
                        minWidth: 40,
                      }}
                      title={`${rowLabels[ri]} / ${colLabels[ci]}: ${cell.display}`}
                    >
                      {cell.display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
        {colorScale === "diverging" ? (
          <>
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: "rgb(0,0,255)" }}
            />
            <span>-1</span>
            <span
              className="inline-block w-3 h-3 rounded border border-gray-200"
              style={{ backgroundColor: "rgb(255,255,255)" }}
            />
            <span>0</span>
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: "rgb(255,0,0)" }}
            />
            <span>+1</span>
          </>
        ) : (
          <>
            <span
              className="inline-block w-3 h-3 rounded border border-gray-200"
              style={{ backgroundColor: "rgb(255,255,255)" }}
            />
            <span>0%</span>
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: "rgb(255,128,128)" }}
            />
            <span>50%</span>
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: "rgb(255,0,0)" }}
            />
            <span>100%</span>
          </>
        )}
      </div>
    </div>
  );
}
