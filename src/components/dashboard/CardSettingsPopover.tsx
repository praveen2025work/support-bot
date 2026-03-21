"use client";

import { useState, useRef, useEffect } from "react";
import type { EventLinkConfig } from "@/types/dashboard";
import { Settings, Radio } from "lucide-react";

interface CardSettingsPopoverProps {
  label: string;
  autoRun: boolean;
  eventLink: EventLinkConfig;
  displayMode?: "auto" | "table" | "chart";
  compactAuto?: boolean;
  stompEnabled?: boolean;
  refreshIntervalSec?: number;
  onUpdate: (partial: {
    label?: string;
    autoRun?: boolean;
    eventLink?: EventLinkConfig;
    displayMode?: "auto" | "table" | "chart";
    compactAuto?: boolean;
    stompEnabled?: boolean;
    refreshIntervalSec?: number;
  }) => void;
}

export function CardSettingsPopover({
  label,
  autoRun,
  eventLink,
  displayMode = "auto",
  compactAuto = true,
  stompEnabled = false,
  refreshIntervalSec = 0,
  onUpdate,
}: CardSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 hover:text-gray-600 rounded"
        title="Card settings"
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Card Settings
          </h4>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Label
            </label>
            <input
              value={label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            />
          </div>

          {/* Display mode */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Display Mode
            </label>
            <select
              value={displayMode}
              onChange={(e) =>
                onUpdate({
                  displayMode: e.target.value as "auto" | "table" | "chart",
                })
              }
              className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded"
            >
              <option value="auto">Auto (Table | Chart)</option>
              <option value="table">Table Only</option>
              <option value="chart">Chart Only</option>
            </select>
          </div>

          {/* Compact auto toggle */}
          {displayMode === "auto" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compactAuto}
                onChange={(e) => onUpdate({ compactAuto: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Compact (tab toggle)
              </span>
            </label>
          )}

          {/* Auto-run */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => onUpdate({ autoRun: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-run on load
            </span>
          </label>

          {/* Event link mode */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Cross-card linking
            </label>
            <select
              value={eventLink.mode}
              onChange={(e) =>
                onUpdate({
                  eventLink: {
                    ...eventLink,
                    mode: e.target.value as EventLinkConfig["mode"],
                  },
                })
              }
              className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded"
            >
              <option value="auto">Auto (match by column name)</option>
              <option value="manual">Manual (explicit mappings)</option>
              <option value="disabled">Disabled (ignore events)</option>
            </select>
          </div>

          {/* Live notifications */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={stompEnabled}
              onChange={(e) => onUpdate({ stompEnabled: e.target.checked })}
              className="w-4 h-4 text-cyan-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 inline-flex items-center gap-1">
              <Radio size={12} className="text-cyan-500" />
              Live notifications
            </span>
          </label>

          {/* Auto-refresh interval */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Auto-refresh interval
            </label>
            <select
              value={refreshIntervalSec}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onUpdate({ refreshIntervalSec: val > 0 ? val : 0 });
              }}
              className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded"
            >
              <option value={0}>Off</option>
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
