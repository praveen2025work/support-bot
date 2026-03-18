'use client';

import { useState, useCallback, useRef } from 'react';

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
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  }, [text, disabled, onSend]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileSelect) {
        onFileSelect(file);
      }
      // Reset so re-selecting the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [onFileSelect]
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
        )}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Session
        </button>
        <span className="text-gray-200">|</span>
        <button
          onClick={onClearChat}
          disabled={disabled}
          className="text-[11px] text-gray-400 hover:text-orange-500 transition-colors flex items-center gap-1 disabled:opacity-50"
          title="Clear all messages"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
          Clear Chat
        </button>
        <span className="text-gray-200">|</span>
        <button
          onClick={onDisconnect}
          className="text-[11px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
          title="Disconnect and end session"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Disconnect
        </button>
      </div>
    </div>
  );
}
