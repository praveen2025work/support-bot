"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  X,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  Globe,
  Maximize2,
} from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

// ── Constants ─────────────────────────────────────────────────────────

const MIN_WIDTH = 320;
const MAX_WIDTH_VW = 80; // percent of viewport
const DEFAULT_WIDTH = 480;
const STORAGE_KEY = "actionPanelWidth";
const IFRAME_LOAD_TIMEOUT_MS = 8000;

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

/** Build the full iframe URL with context params appended as query strings */
function buildIframeUrl(config: ActionPanelConfig): string {
  try {
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
    return config.url;
  }
}

/**
 * Check if a URL is same-origin or a local dev URL
 * (these are more likely to allow iframe embedding)
 */
function isLikelyEmbeddable(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    // Same origin is always embeddable
    if (parsed.origin === window.location.origin) return true;
    // localhost / 127.0.0.1 dev servers are usually embeddable
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0"
    )
      return true;
    return false;
  } catch {
    return false;
  }
}

type PanelMode = "iframe" | "fallback";

// ── Component ────────────────────────────────────────────────────────

export function ActionPanel({
  config,
  onClose,
  onActionComplete,
}: ActionPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PanelMode>("iframe");
  const [iframeError, setIframeError] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => getStoredWidth());
  const isDragging = useRef(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupRef = useRef<Window | null>(null);
  useBodyScrollLock(!!config);

  // Reset state when config changes
  useEffect(() => {
    if (config) {
      const embeddable = isLikelyEmbeddable(config.url);
      // Reset internal panel state when switching to a different action config.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(embeddable ? "iframe" : "fallback");
      setLoading(embeddable);
      setIframeError(false);
    }
  }, [config]);

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

  // Iframe load timeout — if it takes too long, it's probably blocked
  useEffect(() => {
    if (!config || mode !== "iframe") return;
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

    loadTimeoutRef.current = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setIframeError(true);
      }
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [config, mode, loading]);

  // Listen for messages from iframe or popup
  useEffect(() => {
    if (!config) return;

    function handleMessage(event: MessageEvent) {
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

  // Clean up popup on unmount
  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  // Drag-to-resize handler
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const startX = e.clientX;
      const startWidth = panelWidth;

      function onMouseMove(moveEvent: MouseEvent) {
        if (!isDragging.current) return;
        const delta = startX - moveEvent.clientX;
        const newWidth = clampWidth(startWidth + delta);
        setPanelWidth(newWidth);
      }

      function onMouseUp() {
        if (!isDragging.current) return;
        isDragging.current = false;
        setPanelWidth((w) => {
          localStorage.setItem(STORAGE_KEY, String(w));
          return w;
        });
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (iframeRef.current) {
          iframeRef.current.style.pointerEvents = "";
        }
      }

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

  const openInNewTab = useCallback(() => {
    if (!config) return;
    const url = buildIframeUrl(config);
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    popupRef.current = popup;
  }, [config]);

  const switchToIframe = useCallback(() => {
    setMode("iframe");
    setLoading(true);
    setIframeError(false);
  }, []);

  if (!config) return null;

  const iframeUrl = buildIframeUrl(config);

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
            {mode === "iframe" && (
              <button
                onClick={() => {
                  setLoading(true);
                  setIframeError(false);
                  if (iframeRef.current) {
                    iframeRef.current.src = iframeUrl;
                  }
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                title="Reload"
              >
                <RefreshCw size={14} />
              </button>
            )}
            <button
              onClick={openInNewTab}
              className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors"
              title="Open in new tab"
            >
              <Maximize2 size={14} />
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

        {/* Content area */}
        <div className="flex-1 relative overflow-hidden">
          {mode === "iframe" && (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              )}
              {iframeError && (
                <IframeBlockedFallback
                  url={config.url}
                  onOpenNewTab={openInNewTab}
                  onRetryIframe={switchToIframe}
                />
              )}
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                className="w-full h-full border-0"
                onLoad={() => {
                  if (loadTimeoutRef.current)
                    clearTimeout(loadTimeoutRef.current);
                  setLoading(false);

                  // Detect X-Frame-Options block: the iframe loads but shows an error page.
                  // We can detect this for same-origin by checking contentDocument.
                  // For cross-origin, we rely on the timeout.
                  try {
                    const doc = iframeRef.current?.contentDocument;
                    if (doc) {
                      const body = doc.body?.innerText || "";
                      if (
                        body.includes("refused to connect") ||
                        body.includes("blocked") ||
                        body.length === 0
                      ) {
                        setIframeError(true);
                        return;
                      }
                    }
                  } catch {
                    // Cross-origin — can't inspect, assume OK if loaded within timeout
                  }

                  setIframeError(false);
                  setTimeout(sendContext, 100);
                }}
                onError={() => {
                  if (loadTimeoutRef.current)
                    clearTimeout(loadTimeoutRef.current);
                  setLoading(false);
                  setIframeError(true);
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                title={config.title}
              />
            </>
          )}

          {mode === "fallback" && (
            <FallbackPanel
              config={config}
              iframeUrl={iframeUrl}
              onOpenNewTab={openInNewTab}
              onTryIframe={switchToIframe}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ── Fallback: iframe blocked ────────────────────────────────────────

function IframeBlockedFallback({
  url,
  onOpenNewTab,
  onRetryIframe,
}: {
  url: string;
  onOpenNewTab: () => void;
  onRetryIframe: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-800 z-10 gap-4 px-6 text-center">
      <AlertCircle size={36} className="text-amber-400" />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          This site can&apos;t be embedded
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
          <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded break-all">
            {url}
          </span>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          The external site blocks iframe embedding via its security headers
          (X-Frame-Options / CSP).
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={onOpenNewTab}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink size={14} />
          Open in New Tab
        </button>
        <button
          onClick={onRetryIframe}
          className="flex items-center justify-center gap-1.5 w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <RefreshCw size={12} />
          Retry in iframe
        </button>
      </div>
    </div>
  );
}

// ── Fallback: external site panel ───────────────────────────────────

function FallbackPanel({
  config,
  iframeUrl,
  onOpenNewTab,
  onTryIframe,
}: {
  config: ActionPanelConfig;
  iframeUrl: string;
  onOpenNewTab: () => void;
  onTryIframe: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
        <Globe size={32} className="text-blue-500" />
      </div>

      <div className="space-y-2">
        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">
          External Application
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          This action opens an external site that may not support iframe
          embedding. Click below to open it in a new tab.
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono break-all max-w-sm">
          {config.url}
        </p>
      </div>

      {/* Context summary */}
      <div className="w-full max-w-xs bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-left space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Context passed
        </p>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
          <div>
            <span className="text-gray-400">Card:</span> {config.context.label}
          </div>
          <div>
            <span className="text-gray-400">Query:</span>{" "}
            {config.context.queryName}
          </div>
          {Object.keys(config.context.filters).length > 0 && (
            <div>
              <span className="text-gray-400">Filters:</span>{" "}
              {Object.entries(config.context.filters)
                .map(([k, v]) => `${k}=${v}`)
                .join(", ")}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={onOpenNewTab}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink size={14} />
          Open in New Tab
        </button>
        <button
          onClick={onTryIframe}
          className="flex items-center justify-center gap-1.5 w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Try loading in iframe
        </button>
        <a
          href={iframeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-gray-400 hover:text-blue-500 transition-colors"
        >
          Copy link with context params
        </a>
      </div>
    </div>
  );
}
