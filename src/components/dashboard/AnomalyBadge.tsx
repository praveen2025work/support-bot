"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface AnomalyInfo {
  queryName: string;
  columnName: string;
  currentValue: number;
  expectedMean: number;
  zScore: number;
  severity: "info" | "warning" | "critical";
  direction: "spike" | "drop";
  message: string;
}

export function AnomalyBadge({ anomalies }: { anomalies: AnomalyInfo[] }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (anomalies.length === 0) return null;

  const maxSeverity = anomalies.some((a) => a.severity === "critical")
    ? "critical"
    : anomalies.some((a) => a.severity === "warning")
      ? "warning"
      : "info";

  const colors = {
    critical: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const dotColors = {
    critical: "bg-red-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${colors[maxSeverity]}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[maxSeverity]} animate-pulse`}
        />
        {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"}
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
            Anomalies Detected
          </p>
          <div className="space-y-1.5">
            {anomalies.map((a, i) => (
              <div
                key={i}
                className={`rounded p-1.5 text-[11px] ${colors[a.severity]}`}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${dotColors[a.severity]}`}
                  />
                  <span className="font-medium">{a.columnName}</span>
                  <span className="text-[10px] opacity-75">
                    ({a.direction === "spike" ? "+" : "-"}
                    {Math.abs(a.zScore).toFixed(1)} std)
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] opacity-80">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnomalyAlert({ anomalies }: { anomalies: AnomalyInfo[] }) {
  if (anomalies.length === 0) return null;

  const hasCritical = anomalies.some((a) => a.severity === "critical");

  return (
    <div
      className={`rounded-lg border p-3 text-xs ${
        hasCritical
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <AlertTriangle
          size={16}
          className={hasCritical ? "text-red-500" : "text-amber-500"}
        />
        <span
          className={`font-semibold ${hasCritical ? "text-red-700" : "text-amber-700"}`}
        >
          {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"}{" "}
          detected
        </span>
      </div>
      <div className="space-y-1">
        {anomalies.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                a.severity === "critical"
                  ? "bg-red-500"
                  : a.severity === "warning"
                    ? "bg-amber-500"
                    : "bg-blue-500"
              }`}
            />
            <span
              className={`${hasCritical ? "text-red-700" : "text-amber-700"}`}
            >
              {a.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
