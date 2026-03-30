"use client";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { WatchAlert } from "@/types/watch";

interface AlertCardProps {
  alert: WatchAlert;
  onMarkRead: (id: string) => void;
  onViewData: (queryName: string) => void;
}

function SeverityIcon({ severity }: { severity: WatchAlert["severity"] }) {
  if (severity === "critical") {
    return (
      <AlertTriangle className="w-4 h-4 text-[var(--danger)] flex-shrink-0" />
    );
  }
  if (severity === "warning") {
    return (
      <AlertCircle className="w-4 h-4 text-[var(--warning,#f59e0b)] flex-shrink-0" />
    );
  }
  return <Info className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />;
}

function severityBorderColor(severity: WatchAlert["severity"]): string {
  if (severity === "critical") return "border-l-[var(--danger)]";
  if (severity === "warning") return "border-l-[var(--warning,#f59e0b)]";
  return "border-l-[var(--accent)]";
}

export function AlertCard({ alert, onMarkRead, onViewData }: AlertCardProps) {
  const formattedTime = new Date(alert.timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`border-l-2 ${severityBorderColor(alert.severity)} bg-[var(--bg-secondary)] rounded-[var(--radius-md)] p-3 transition-opacity ${alert.read ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-2">
        <SeverityIcon severity={alert.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
              {alert.ruleName}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
              {formattedTime}
            </span>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            {alert.message}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {!alert.read && (
              <button
                onClick={() => onMarkRead(alert.id)}
                className="text-[11px] text-[var(--accent)] hover:underline transition-colors"
              >
                Mark read
              </button>
            )}
            <button
              onClick={() => onViewData(alert.queryName)}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:underline transition-colors"
            >
              View Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
