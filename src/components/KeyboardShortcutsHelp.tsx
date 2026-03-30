"use client";

import { useState, useEffect } from "react";

interface ShortcutInfo {
  keys: string;
  description: string;
}

const SHORTCUTS: ShortcutInfo[] = [
  { keys: "Ctrl + K", description: "Focus search / chat input" },
  { keys: "Ctrl + /", description: "Show keyboard shortcuts" },
  { keys: "Ctrl + \\", description: "Toggle dark mode" },
  { keys: "Ctrl + Shift + N", description: "New chat session" },
  { keys: "Escape", description: "Close modal / clear focus" },
];

const ADMIN_SHORTCUTS: ShortcutInfo[] = [
  { keys: "G then A", description: "Go to Analytics" },
  { keys: "G then L", description: "Go to Logs" },
  { keys: "G then S", description: "Go to Settings" },
  { keys: "G then U", description: "Go to Users" },
];

export function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-2xl w-[480px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            General
          </h3>
          <div className="space-y-2 mb-6">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{s.description}</span>
                <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded border border-gray-200">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Admin Navigation
          </h3>
          <div className="space-y-2">
            {ADMIN_SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{s.description}</span>
                <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded border border-gray-200">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
