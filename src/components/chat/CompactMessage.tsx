"use client";
import { ArrowRight } from "lucide-react";

interface MessageMeta {
  queryName?: string;
  rowCount?: number;
  groupCount?: number;
  metrics?: Array<{ label: string; value: string; color?: string }>;
}

interface CompactMessageProps {
  role: "user" | "bot";
  text: string;
  meta?: MessageMeta;
  onViewInPanel?: () => void;
}

export function CompactMessage({
  role,
  text,
  meta,
  onViewInPanel,
}: CompactMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end" data-role="user">
        <div className="bg-[var(--brand)] text-[var(--brand-text)] rounded-[12px_12px_4px_12px] px-3 py-2 text-[12px] max-w-[85%]">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start" data-role="bot">
      <div className="max-w-[90%]">
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px_12px_12px_4px] px-3 py-2">
          <div className="text-[12px] font-medium text-[var(--text-primary)]">
            {text}
          </div>
          {meta && (
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {meta.groupCount && <span>{meta.groupCount} groups</span>}
              {meta.groupCount && meta.rowCount && <span> &middot; </span>}
              {meta.rowCount && <span>{meta.rowCount} rows</span>}
            </div>
          )}
          {meta?.metrics && meta.metrics.length > 0 && (
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {meta.metrics.map((m, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)]"
                  style={{
                    color: m.color ?? "var(--brand)",
                    backgroundColor: m.color
                      ? `${m.color}15`
                      : "var(--brand-subtle)",
                  }}
                >
                  {m.label} {m.value}
                </span>
              ))}
            </div>
          )}
          {onViewInPanel && meta?.queryName && (
            <div className="mt-1.5">
              <button
                onClick={onViewInPanel}
                className="text-[10px] text-[var(--brand)] bg-[var(--brand-subtle)] px-1.5 py-0.5 rounded-[var(--radius-sm)] inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                View in panel <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
