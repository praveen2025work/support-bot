"use client";

import { useState, useCallback } from "react";

interface AddToDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: {
    dashboard: string;
    cardTitle: string;
    displayMode: "auto" | "table" | "chart";
    autoRun: boolean;
  }) => void;
  defaultTitle: string;
}

const DASHBOARD_OPTIONS = [
  "Main Dashboard",
  "Finance Dashboard",
  "Analytics Dashboard",
] as const;

const DISPLAY_MODE_OPTIONS: {
  value: "auto" | "table" | "chart";
  label: string;
}[] = [
  { value: "auto", label: "Auto" },
  { value: "table", label: "Table only" },
  { value: "chart", label: "Chart only" },
];

export function AddToDashboardModal({
  isOpen,
  onClose,
  onAdd,
  defaultTitle,
}: AddToDashboardModalProps) {
  if (!isOpen) return null;

  // Inner component remounts each time modal opens, resetting state
  return (
    <AddToDashboardForm
      onClose={onClose}
      onAdd={onAdd}
      defaultTitle={defaultTitle}
    />
  );
}

function AddToDashboardForm({
  onClose,
  onAdd,
  defaultTitle,
}: Omit<AddToDashboardModalProps, "isOpen">) {
  const [dashboard, setDashboard] = useState<string>(DASHBOARD_OPTIONS[0]);
  const [cardTitle, setCardTitle] = useState(defaultTitle);
  const [displayMode, setDisplayMode] = useState<"auto" | "table" | "chart">(
    "auto",
  );
  const [autoRun, setAutoRun] = useState(true);

  const handleSubmit = useCallback(() => {
    onAdd({ dashboard, cardTitle, displayMode, autoRun });
    onClose();
  }, [onAdd, onClose, dashboard, cardTitle, displayMode, autoRun]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] rounded-[var(--radius-lg)] border border-[var(--border)] shadow-xl w-[440px] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">
            Add to Dashboard
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <div className="mb-4">
            <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Dashboard
            </label>
            <select
              value={dashboard}
              onChange={(e) => setDashboard(e.target.value)}
              className="w-full text-[12px] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)]"
            >
              {DASHBOARD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Card Title
            </label>
            <input
              type="text"
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              className="w-full text-[12px] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)]"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Display Mode
            </label>
            <select
              value={displayMode}
              onChange={(e) =>
                setDisplayMode(e.target.value as "auto" | "table" | "chart")
              }
              className="w-full text-[12px] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)]"
            >
              {DISPLAY_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="accent-[var(--brand)]"
              />
              <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Auto-run on Load
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--border)] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="text-[12px] px-4 py-2 rounded-[var(--radius-md)] bg-[var(--brand)] text-[var(--brand-text)] hover:opacity-90 transition-opacity"
          >
            Add Card
          </button>
        </div>
      </div>
    </div>
  );
}
