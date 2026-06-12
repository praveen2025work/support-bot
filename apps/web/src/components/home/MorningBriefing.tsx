"use client";

import { AlertTriangle, Bell, CheckCircle } from "lucide-react";
import type { BriefingSummary } from "@/types/home-feed";

interface MorningBriefingProps {
  briefing: BriefingSummary;
}

export function MorningBriefing({ briefing }: MorningBriefingProps) {
  const hasAlerts =
    briefing.anomaliesDetected > 0 || briefing.watchAlertsTriggered > 0;

  const borderColor = hasAlerts
    ? "border-amber-400"
    : "border-[var(--success,#22c55e)]";

  const iconColor = hasAlerts
    ? "text-amber-400"
    : "text-[var(--success,#22c55e)]";

  return (
    <div
      className={`rounded-[var(--radius-md)] border-l-4 ${borderColor} bg-[var(--bg-secondary)] p-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
          {hasAlerts ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
            {briefing.message}
          </p>
          {(briefing.anomaliesDetected > 0 ||
            briefing.watchAlertsTriggered > 0) && (
            <div className="flex items-center gap-4 mt-2">
              {briefing.anomaliesDetected > 0 && (
                <span className="flex items-center gap-1 text-[12px] text-amber-500">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {briefing.anomaliesDetected}{" "}
                  {briefing.anomaliesDetected === 1 ? "anomaly" : "anomalies"}
                </span>
              )}
              {briefing.watchAlertsTriggered > 0 && (
                <span className="flex items-center gap-1 text-[12px] text-amber-500">
                  <Bell className="w-3.5 h-3.5" />
                  {briefing.watchAlertsTriggered}{" "}
                  {briefing.watchAlertsTriggered === 1 ? "alert" : "alerts"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
