"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

/** Context received from the chatbot dashboard via postMessage */
interface ChatbotContext {
  cardId: string;
  queryName: string;
  filters: Record<string, string>;
  label: string;
  dashboardId?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

export default function ActionPanelDemo() {
  const searchParams = useSearchParams();
  const [context, setContext] = useState<ChatbotContext | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [actionNote, setActionNote] = useState("");
  const [activeTab, setActiveTab] = useState<"demo" | "docs">("demo");

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Listen for postMessage from parent (chatbot dashboard)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;
      if (
        event.data.type === "chatbot:context" ||
        event.data.type === "chatbot:update"
      ) {
        const payload = event.data.payload as ChatbotContext;
        setContext(payload);
        addLog(
          `Received ${event.data.type} v${event.data.version} from ${event.data.source}`,
        );
        addLog(`Query: ${payload.queryName}, Card: ${payload.label}`);
        if (Object.keys(payload.filters).length > 0) {
          addLog(`Filters: ${JSON.stringify(payload.filters)}`);
        }
        if (payload.extra) {
          addLog(`Extra: ${JSON.stringify(payload.extra)}`);
        }
      }
    }

    window.addEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial log entry on mount
    addLog("Action Panel loaded, listening for postMessage...");

    // Also read URL params as fallback
    const cardId = searchParams.get("cardId");
    const queryName = searchParams.get("queryName");
    if (cardId && queryName) {
      const filters: Record<string, string> = {};
      searchParams.forEach((val, key) => {
        if (key.startsWith("filter_"))
          filters[key.replace("filter_", "")] = val;
      });
      setContext({
        cardId,
        queryName,
        filters,
        label: queryName,
        userId: searchParams.get("userId") || undefined,
      });
      addLog(`Loaded context from URL params: ${queryName}`);
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [searchParams, addLog]);

  // Send action:complete back to parent
  const handleComplete = () => {
    window.parent.postMessage(
      {
        type: "action:complete",
        refreshCardIds: context ? [context.cardId] : [],
        result: { note: actionNote, timestamp: new Date().toISOString() },
      },
      "*",
    );
    addLog("Sent action:complete to parent");
  };

  // Send action:close back to parent
  const handleClose = () => {
    window.parent.postMessage({ type: "action:close" }, "*");
    addLog("Sent action:close to parent");
  };

  // Request panel resize
  const handleResize = (width: string) => {
    window.parent.postMessage({ type: "action:resize", width }, "*");
    addLog(`Sent action:resize width=${width}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 text-sm">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Action Panel Demo
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Sample external UI loaded inside the dashboard Action Panel iframe.
            This app receives context from the chatbot via{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
              postMessage
            </code>{" "}
            and can send actions back. Works with any framework (React, Angular,
            Vue, vanilla JS).
          </p>
          {/* Tab toggle */}
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setActiveTab("demo")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === "demo" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              Live Demo
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === "docs" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              Integration Guide
            </button>
          </div>
        </div>

        {activeTab === "demo" ? (
          <>
            {/* Context Display */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Received Context
              </h2>
              {context ? (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-[100px_1fr] gap-1">
                    <span className="font-medium text-gray-500">Card ID:</span>
                    <span className="text-gray-800 dark:text-gray-200 font-mono">
                      {context.cardId}
                    </span>
                    <span className="font-medium text-gray-500">Query:</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {context.queryName}
                    </span>
                    <span className="font-medium text-gray-500">Label:</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {context.label}
                    </span>
                    {context.dashboardId && (
                      <>
                        <span className="font-medium text-gray-500">
                          Dashboard:
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 font-mono">
                          {context.dashboardId}
                        </span>
                      </>
                    )}
                    {context.userId && (
                      <>
                        <span className="font-medium text-gray-500">User:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {context.userId}
                        </span>
                      </>
                    )}
                  </div>
                  {Object.keys(context.filters).length > 0 && (
                    <div>
                      <span className="font-medium text-gray-500">
                        Filters:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(context.filters).map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px]"
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {context.extra && Object.keys(context.extra).length > 0 && (
                    <div>
                      <span className="font-medium text-gray-500">
                        Extra / Metadata:
                      </span>
                      <pre className="mt-1 p-2 rounded bg-gray-100 dark:bg-gray-700 text-[10px] overflow-x-auto">
                        {JSON.stringify(context.extra, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Waiting for context from dashboard...
                </p>
              )}
            </div>

            {/* Action Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Take Action
              </h2>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Add a note or comment..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none"
                rows={3}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleComplete}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Complete Action
                </button>
                <button
                  onClick={handleClose}
                  className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Close Panel
                </button>
              </div>
              {/* Resize buttons */}
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] text-gray-400 self-center">
                  Resize:
                </span>
                {["400px", "600px", "800px"].map((w) => (
                  <button
                    key={w}
                    onClick={() => handleResize(w)}
                    className="px-2 py-1 text-[10px] text-gray-500 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Event Log
              </h2>
              <div className="bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[10px] text-green-400">
                {logs.length > 0 ? (
                  logs.map((log, i) => <div key={i}>{log}</div>)
                ) : (
                  <span className="text-gray-600">No events yet...</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Integration Guide */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                How Context is Sent to Your App
              </h2>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-3">
                <p>
                  The chatbot dashboard loads your app in an iframe and passes
                  context via two mechanisms:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        postMessage (primary)
                      </span>
                      <p className="text-[11px] mt-0.5">
                        After your iframe loads, the dashboard sends a{" "}
                        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                          chatbot:context
                        </code>{" "}
                        message with the full payload. This works for
                        same-origin and cross-origin apps.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        URL query params (fallback)
                      </span>
                      <p className="text-[11px] mt-0.5">
                        Context is also appended to the iframe URL:{" "}
                        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                          ?cardId=X&queryName=Y&filter_key=value
                        </code>
                        . Useful if postMessage is blocked.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inbound message format */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Inbound Message (Dashboard → Your App)
              </h2>
              <pre className="p-3 rounded-lg bg-gray-900 text-green-400 text-[10px] overflow-x-auto font-mono">
                {`window.addEventListener("message", (event) => {
  if (event.data?.type === "chatbot:context") {
    const { payload, version, source, timestamp } = event.data;
    // payload contains:
    // {
    //   cardId: "card_abc123",
    //   queryName: "pnl_summary",
    //   label: "P&L Income Statement",
    //   filters: { fiscal_year: "FY2025", region: "US" },
    //   dashboardId: "pnl-executive-view",
    //   userId: "jdoe",
    //   extra: {
    //     department: "Finance",
    //     reportType: "pnl",
    //     contextFields: { fiscal_year: "FY2025" }
    //   }
    // }
    console.log("Context received:", payload);
  }
});`}
              </pre>
            </div>

            {/* Outbound messages */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Outbound Messages (Your App → Dashboard)
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-semibold text-gray-500">
                    Complete an action & refresh cards:
                  </span>
                  <pre className="mt-1 p-2 rounded-lg bg-gray-900 text-green-400 text-[10px] overflow-x-auto font-mono">
                    {`window.parent.postMessage({
  type: "action:complete",
  refreshCardIds: ["card_abc123"],
  result: { approved: true, note: "Looks good" }
}, "*");`}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-gray-500">
                    Close the panel:
                  </span>
                  <pre className="mt-1 p-2 rounded-lg bg-gray-900 text-green-400 text-[10px] overflow-x-auto font-mono">
                    {`window.parent.postMessage({
  type: "action:close"
}, "*");`}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-gray-500">
                    Request panel resize:
                  </span>
                  <pre className="mt-1 p-2 rounded-lg bg-gray-900 text-green-400 text-[10px] overflow-x-auto font-mono">
                    {`window.parent.postMessage({
  type: "action:resize",
  width: "700px"
}, "*");`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Framework examples */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Framework Examples
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    Angular
                  </span>
                  <pre className="mt-1 p-2 rounded-lg bg-gray-900 text-green-400 text-[10px] overflow-x-auto font-mono">
                    {`// app.component.ts
@HostListener('window:message', ['$event'])
onMessage(event: MessageEvent) {
  if (event.data?.type === 'chatbot:context') {
    this.context = event.data.payload;
  }
}`}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">
                    Vue 3
                  </span>
                  <pre className="mt-1 p-2 rounded-lg bg-gray-900 text-green-400 text-[10px] overflow-x-auto font-mono">
                    {`// composable
onMounted(() => {
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'chatbot:context')
      context.value = e.data.payload;
  });
});`}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
                    Vanilla JS
                  </span>
                  <pre className="mt-1 p-2 rounded-lg bg-gray-900 text-green-400 text-[10px] overflow-x-auto font-mono">
                    {`<script>
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'chatbot:context') {
    document.getElementById('info').textContent =
      JSON.stringify(e.data.payload, null, 2);
  }
});
</script>`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Important notes */}
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30 p-4">
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                Important Notes
              </h2>
              <ul className="text-[11px] text-amber-700 dark:text-amber-400 space-y-1.5 list-disc pl-4">
                <li>
                  Your app must allow iframe embedding (no{" "}
                  <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                    X-Frame-Options: DENY
                  </code>{" "}
                  header)
                </li>
                <li>
                  Sites like google.com, github.com block iframe embedding — use
                  your own hosted app
                </li>
                <li>
                  The iframe sandbox allows: scripts, same-origin, forms, popups
                </li>
                <li>
                  Panel width can be adjusted by the user via drag handle (left
                  edge) or by your app via{" "}
                  <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                    action:resize
                  </code>
                </li>
                <li>Width is persisted in localStorage across sessions</li>
                <li>
                  Context is sent once after iframe loads; listen for{" "}
                  <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                    chatbot:update
                  </code>{" "}
                  for subsequent filter changes
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
