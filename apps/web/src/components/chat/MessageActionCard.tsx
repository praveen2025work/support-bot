"use client";

import type { ReactNode } from "react";

export type ActionStatus = "ready" | "critical" | "info" | "success";

interface ActionItem {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

interface MessageActionCardProps {
  status: ActionStatus;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ActionItem[];
}

const STATUS_TONES: Record<
  ActionStatus,
  { bg: string; fg: string; label: string }
> = {
  ready: {
    bg: "var(--success-subtle)",
    fg: "var(--success)",
    label: "Ready",
  },
  critical: {
    bg: "var(--danger-subtle)",
    fg: "var(--danger)",
    label: "Critical",
  },
  info: {
    bg: "var(--brand-subtle)",
    fg: "var(--brand)",
    label: "Info",
  },
  success: {
    bg: "var(--success-subtle)",
    fg: "var(--success)",
    label: "Done",
  },
};

/**
 * Stitch-style actionable card surfaced inside a chat message.
 * Pairs a status pill (Ready/Critical/etc.) with a title, optional
 * description, and one or two action buttons.
 */
export function MessageActionCard({
  status,
  title,
  description,
  icon,
  actions,
}: MessageActionCardProps) {
  const tone = STATUS_TONES[status];
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-xs)] flex flex-col gap-2.5">
      <div className="flex items-start gap-3">
        {icon && (
          <span
            className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: tone.bg, color: tone.fg }}
          >
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[9.5px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: tone.bg, color: tone.fg }}
            >
              {tone.label}
            </span>
            <span className="font-display text-[13px] font-bold tracking-tight text-[var(--text-primary)] truncate leading-tight">
              {title}
            </span>
          </div>
          {description && (
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className={
                a.variant === "primary" || i === 0
                  ? "btn-primary !py-1.5 !px-3 !text-[11.5px]"
                  : "btn-ghost !py-1.5 !px-3 !text-[11.5px]"
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MessageActionGroupProps {
  cards: MessageActionCardProps[];
}

/**
 * Stack of action cards used when the assistant suggests multiple
 * remediation steps (e.g. "Schedule Dataset Refresh" + "Deploy Model
 * Update"). Mirrors the Stitch mitr_ai_actionable_chat_workspace
 * remediation panel.
 */
export function MessageActionGroup({ cards }: MessageActionGroupProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 mt-2.5">
      {cards.map((c, i) => (
        <MessageActionCard key={i} {...c} />
      ))}
    </div>
  );
}
