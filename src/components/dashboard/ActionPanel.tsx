"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { X, ExternalLink, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

// ── Constants ─────────────────────────────────────────────────────────

const MIN_WIDTH = 320;
const MAX_WIDTH_VW = 80; // percent of viewport
const DEFAULT_WIDTH = 480;
const STORAGE_KEY = "actionPanelWidth";

// ── Types ────────────────────────────────────────────────────────────

export interface ActionPanelContext {
  /** Card ID that triggered the action */
  cardId: string;
  /** Query name of the card */
  queryName: string;
  /** Current card filters */
  filters: Record<string, string>;
  /** Card label */
  label: string;
  /** Dashboard ID */
  dashboardId?: string;
  /** Current user ID */
  userId?: string;
  /** Any additional context to pass to the external app */
  extra?: Record<string, unknown>;
}

/** Enhanced outbound message with versioning for external UI consumers */
export interface ChatbotContextMessage {
  type: "chatbot:context" | "chatbot:update";
  version: "1.0";
  payload: ActionPanelContext;
  /** ISO timestamp of when the message was sent */
  timestamp: string;
  /** Origin identifier so external apps can verify the source */
  source: "chatbot-dashboard";
}

export interface ActionPanelConfig {
  /** URL of the external application to load in iframe */
  url: string;
  /** Title shown in the panel header */
  title: string;
  /** Context to pass via postMessage */
  context: ActionPanelContext;
  /** Width of the panel in pixels (default: 480) */
  width?: string;
}

/** Messages sent TO the iframe (uses ChatbotContextMessage structure) */
type OutboundMessage = ChatbotContextMessage;

/** Messages received FROM the iframe */
interface InboundMessage {
  type: "action:complete" | "action:close" | "action:resize";
  /** For action:complete — optional card IDs to refresh */
  refreshCardIds?: string[];
  /** For action:resize — new width */
  width?: string;
  /** Any result data */
  result?: unknown;
}

interface ActionPanelProps {
  config: ActionPanelConfig | null;
  onClose: () => void;
  /** Called when the external app reports an action is complete */
  onActionComplete?: (cardIds: string[], result?: unknown) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────

function getStoredWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const n = parseInt(stored, 10);
    if (!isNaN(n) && n >= MIN_WIDTH) return n;
  }
  return DEFAULT_WIDTH;
}

function clampWidth(px: number): number {
  const maxPx = (window.innerWidth * MAX_WIDTH_VW) / 100;
  return Math.max(MIN_WIDTH, Math.min(px, maxPx));
}

// ── Component ────────────────────────────────────────────────────────

export function ActionPanel({
  config,
  onClose,
  onActionComplete,
}: ActionPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => getStoredWidth());
  const isDragging = useRef(false);
  useBodyScrollLock(!!config);

  // Send context to iframe once it loads
  const sendContext = useCallback(() => {
    if (!config || !iframeRef.current?.contentWindow) return;
    const message: OutboundMessage = {
      type: "chatbot:context",
      version: "1.0",
      payload: config.context,
      timestamp: new Date().toISOString(),
      source: "chatbot-dashboard",
    };
    try {
      iframeRef.current.contentWindow.postMessage(message, "*");
    } catch {
      // Cross-origin may block — that's ok, iframe can use URL params as fallback
    }
  }, [config]);

  // Listen for messages from iframe
  useEffect(() => {
    if (!config) return;

    function handleMessage(event: MessageEvent) {
      // Only process structured messages
      if (!event.data || typeof event.data !== "object" || !event.data.type)
        return;
      const msg = event.data as InboundMessage;

      switch (msg.type) {
        case "action:complete":
          onActionComplete?.(msg.refreshCardIds || [], msg.result);
          break;
        case "action:close":
          onClose();
          break;
        case "action:resize":
          if (msg.width) {
            const px = parseInt(msg.width, 10);
            if (!isNaN(px)) {
              const clamped = clampWidth(px);
              setPanelWidth(clamped);
              localStorage.setItem(STORAGE_KEY, String(clamped));
            }
          }
          break;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [config, onClose, onActionComplete]);

  // Drag-to-resize handler
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const startX = e.clientX;
      const startWidth = panelWidth;

      function onMouseMove(moveEvent: MouseEvent) {
        if (!isDragging.current) return;
        // Panel is on the right — dragging left increases width
        const delta = startX - moveEvent.clientX;
        const newWidth = clampWidth(startWidth + delta);
        setPanelWidth(newWidth);
      }

      function onMouseUp() {
        if (!isDragging.current) return;
        isDragging.current = false;
        // Persist final width
        setPanelWidth((w) => {
          localStorage.setItem(STORAGE_KEY, String(w));
          return w;
        });
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        // Re-enable iframe pointer events
        if (iframeRef.current) {
          iframeRef.current.style.pointerEvents = "";
        }
      }

      // Disable iframe pointer events during drag to prevent it from capturing mouse
      if (iframeRef.current) {
        iframeRef.current.style.pointerEvents = "none";
      }
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [panelWidth],
  );

  if (!config) return null;

  // Build iframe URL with context as query params (fallback for cross-origin)
  const iframeUrl = (() => {
    try {
      // If the URL is absolute (starts with http/https), use it directly
      const base = config.url.startsWith("http")
        ? config.url
        : new URL(config.url, window.location.origin).toString();
      const url = new URL(base);
      url.searchParams.set("cardId", config.context.cardId);
      url.searchParams.set("queryName", config.context.queryName);
      if (config.context.userId) {
        url.searchParams.set("userId", config.context.userId);
      }
      for (const [key, val] of Object.entries(config.context.filters)) {
        url.searchParams.set(`filter_${key}`, val);
      }
      return url.toString();
    } catch {
      // Fallback: just use the raw URL
      return config.url;
    }
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 h-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col transition-none"
        style={{ width: `${panelWidth}px`, maxWidth: "90vw" }}
      >
        {/* Drag handle — left edge */}
        <div
          onMouseDown={handleDragStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors"
          title="Drag to resize"
        >
          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-400 transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ExternalLink size={16} className="text-blue-500 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {config.title}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setLoading(true);
                setError(false);
                iframeRef.current?.contentWindow?.location.reload();
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title="Reload"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Context bar */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50 text-[10px] text-gray-500 dark:text-gray-400 shrink-0">
          <span className="font-medium">{config.context.label}</span>
          {Object.keys(config.context.filters).length > 0 && (
            <span className="ml-2">
              {Object.entries(config.context.filters)
                .map(([k, v]) => `${k}=${v}`)
                .join(", ")}
            </span>
          )}
        </div>

        {/* Iframe */}
        <div className="flex-1 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-800 z-10 gap-2">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm text-gray-500">
                Failed to load external application
              </p>
              <button
                onClick={() => {
                  setError(false);
                  setLoading(true);
                  if (iframeRef.current) {
                    iframeRef.current.src = iframeUrl;
                  }
                }}
                className="text-xs text-blue-500 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            className="w-full h-full border-0"
            onLoad={() => {
              setLoading(false);
              setError(false);
              // Send context via postMessage once loaded
              setTimeout(sendContext, 100);
            }}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            title={config.title}
          />
        </div>
      </div>
    </>
  );
}
