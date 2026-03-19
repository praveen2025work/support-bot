"use client";

import { useState, useCallback, useRef } from "react";
import { Paperclip, Plus, Trash2, LogOut } from "lucide-react";

export function ChatInput({
  onSend,
  disabled,
  onNewSession,
  onClearChat,
  onDisconnect,
  onFileSelect,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  onNewSession: () => void;
  onClearChat: () => void;
  onDisconnect: () => void;
  onFileSelect?: (file: File) => void;
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
      {/* Session actions */}
      <div className="flex items-center justify-center gap-3 px-3 pb-2 pt-0">
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
      </div>
    </div>
  );
}
