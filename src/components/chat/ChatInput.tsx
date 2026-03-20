"use client";

import { useState, useCallback, useRef } from "react";
import {
  Paperclip,
  Plus,
  Trash2,
  LogOut,
  BarChart3,
  Table2,
  LayoutGrid,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type DisplayMode = "auto" | "table" | "chart";

const DISPLAY_OPTIONS: {
  value: DisplayMode;
  label: string;
  icon: typeof BarChart3;
}[] = [
  { value: "auto", label: "Auto", icon: LayoutGrid },
  { value: "table", label: "Table", icon: Table2 },
  { value: "chart", label: "Chart", icon: BarChart3 },
];

export function ChatInput({
  onSend,
  disabled,
  onNewSession,
  onClearChat,
  onDisconnect,
  onFileSelect,
  platform = "web",
  displayMode = "auto",
  onDisplayModeChange,
  compactAuto = true,
  onCompactAutoChange,
  hasResults = false,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  onNewSession: () => void;
  onClearChat: () => void;
  onDisconnect: () => void;
  onFileSelect?: (file: File) => void;
  platform?: "web" | "widget";
  displayMode?: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  compactAuto?: boolean;
  onCompactAutoChange?: (compact: boolean) => void;
  hasResults?: boolean;
}) {
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  }, [text, disabled, onSend]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileSelect) {
        onFileSelect(file);
      }
      // Reset so re-selecting the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onFileSelect],
  );

  const displayControls = hasResults && onDisplayModeChange && (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
        {DISPLAY_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = displayMode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onDisplayModeChange(opt.value)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                active
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title={`${opt.label} view`}
            >
              <Icon size={10} />
              {opt.label}
            </button>
          );
        })}
      </div>
      {displayMode === "auto" && onCompactAutoChange && (
        <button
          onClick={() => onCompactAutoChange(!compactAuto)}
          className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          title={
            compactAuto
              ? "Compact: tab toggle (click to stack)"
              : "Stacked: table + chart (click for tabs)"
          }
        >
          {compactAuto ? (
            <ToggleRight size={12} className="text-blue-500" />
          ) : (
            <ToggleLeft size={12} />
          )}
          <span>{compactAuto ? "Compact" : "Stacked"}</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 flex-shrink-0">
      <div className="flex gap-2 p-3 pb-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf,.docx,.doc"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
        {/* Paperclip / attach button */}
        {onFileSelect && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="rounded-full p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach a file (CSV, Excel, PDF, DOCX)"
            aria-label="Attach file"
          >
            <Paperclip size={18} />
          </button>
        )}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
      {/* Session actions + display controls */}
      <div className="flex items-center justify-center gap-2 px-3 pb-2 pt-0">
        {platform === "widget" ? (
          <>
            {/* Widget: icon-only session buttons to save space */}
            <button
              onClick={onNewSession}
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
              title="New Session"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={onClearChat}
              disabled={disabled}
              className="p-1.5 rounded-md text-gray-400 hover:text-orange-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Clear Chat"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onDisconnect}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors"
              title="Disconnect"
            >
              <LogOut size={14} />
            </button>
            {displayControls && (
              <>
                <span className="text-gray-200">|</span>
                {displayControls}
              </>
            )}
          </>
        ) : (
          <>
            {/* Web: labeled session buttons */}
            <button
              onClick={onNewSession}
              className="text-[11px] text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
              title="Start a new conversation session"
            >
              <Plus size={12} />
              New Session
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={onClearChat}
              disabled={disabled}
              className="text-[11px] text-gray-400 hover:text-orange-500 transition-colors flex items-center gap-1 disabled:opacity-50"
              title="Clear all messages"
            >
              <Trash2 size={12} />
              Clear Chat
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={onDisconnect}
              className="text-[11px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
              title="Disconnect and end session"
            >
              <LogOut size={12} />
              Disconnect
            </button>
            {displayControls && (
              <>
                <span className="text-gray-200">|</span>
                {displayControls}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
