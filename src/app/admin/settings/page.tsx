"use client";

import { useState, useEffect } from "react";
import { csrfHeaders } from "@/lib/csrf";

interface PlatformConfig {
  nlpConfidenceThreshold: number;
  fuzzyConfidenceThreshold: number;
  sessionTtlMinutes: number;
  apiCacheTtlMinutes: number;
  apiBaseUrl: string;
  mockApiUrl: string;
  enabledPlatforms: string[];
  stompBrokerUrl: string;
  stompDestination: string;
  stompEnabled: boolean;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<PlatformConfig>({
    nlpConfidenceThreshold: 0.65,
    fuzzyConfidenceThreshold: 0.5,
    sessionTtlMinutes: 30,
    apiCacheTtlMinutes: 5,
    apiBaseUrl: "",
    mockApiUrl: "http://localhost:8080",
    enabledPlatforms: ["web", "widget"],
    stompBrokerUrl: "",
    stompDestination: "/topic/notifications",
    stompEnabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Read initial section from URL query param (e.g. ?section=stomp)
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("section") || "nlp";
    }
    return "nlp";
  });

  // Load current settings from constants (read-only display for now)
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.config) setConfig((prev) => ({ ...prev, ...d.config }));
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  // Load STOMP config from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("chatbot_stomp_config");
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig((prev) => ({
          ...prev,
          stompBrokerUrl: parsed.brokerUrl || "",
          stompDestination: parsed.destination || "/topic/notifications",
          stompEnabled: parsed.enabled ?? false,
        }));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveStomp = () => {
    const stompConfig = {
      brokerUrl: config.stompBrokerUrl,
      destination: config.stompDestination,
      enabled: config.stompEnabled,
    };
    localStorage.setItem("chatbot_stomp_config", JSON.stringify(stompConfig));
    // Also set on window for immediate use by useStompNotifications
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__STOMP_BROKER_URL__ =
        config.stompBrokerUrl || undefined;
      (window as unknown as Record<string, unknown>).__STOMP_DESTINATION__ =
        config.stompDestination || undefined;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    { id: "nlp", label: "NLP Pipeline" },
    { id: "api", label: "API & Cache" },
    { id: "stomp", label: "STOMP / Live" },
    { id: "platforms", label: "Platforms" },
    { id: "about", label: "About" },
  ];

  return (
    <div>
      <div className="pb-6 mb-6 border-b border-gray-100">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Platform configuration and thresholds
        </p>
      </div>

      <div className="flex gap-6">
        {/* Section nav */}
        <div className="w-40 shrink-0">
          <div className="space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === s.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings content */}
        <div className="flex-1">
          {activeSection === "nlp" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                NLP Pipeline Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    NLP Confidence Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.nlpConfidenceThreshold}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        nlpConfidenceThreshold: parseFloat(e.target.value),
                      })
                    }
                    className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Minimum confidence for NLP classifier. Below this, falls
                    back to fuzzy matching. Default: 0.65
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Fuzzy Match Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.fuzzyConfidenceThreshold}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        fuzzyConfidenceThreshold: parseFloat(e.target.value),
                      })
                    }
                    className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Minimum score for fuzzy FAQ matching. Below this, returns
                    unknown intent. Default: 0.5
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Session TTL (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={config.sessionTtlMinutes}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sessionTtlMinutes: parseInt(e.target.value),
                      })
                    }
                    className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    How long conversation sessions persist in memory. Default:
                    30 minutes
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "api" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                API & Cache Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    API Base URL
                  </label>
                  <input
                    value={config.apiBaseUrl}
                    onChange={(e) =>
                      setConfig({ ...config, apiBaseUrl: e.target.value })
                    }
                    placeholder="e.g. https://api.yourcompany.com"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Base URL for production API. Leave empty to use mock API.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Mock API URL
                  </label>
                  <input
                    value={config.mockApiUrl}
                    onChange={(e) =>
                      setConfig({ ...config, mockApiUrl: e.target.value })
                    }
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    URL for development mock API server. Default:
                    http://localhost:8080
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Response Cache TTL (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={config.apiCacheTtlMinutes}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        apiCacheTtlMinutes: parseInt(e.target.value),
                      })
                    }
                    className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    How long API responses are cached in memory. Set to 0 to
                    disable caching. Default: 5 minutes
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "stomp" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                STOMP / Live Notifications
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Configure the WebSocket STOMP broker for real-time dashboard
                card refresh. These settings are stored in the browser and can
                be changed per environment.
              </p>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.stompEnabled}
                    onChange={(e) =>
                      setConfig({ ...config, stompEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-cyan-600 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      Enable STOMP Notifications
                    </div>
                    <div className="text-xs text-gray-400">
                      Master switch — when off, no WebSocket connections are
                      made regardless of per-dashboard toggles
                    </div>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    STOMP Broker URL
                  </label>
                  <input
                    value={config.stompBrokerUrl}
                    onChange={(e) =>
                      setConfig({ ...config, stompBrokerUrl: e.target.value })
                    }
                    placeholder="ws://localhost:15674/ws"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    WebSocket endpoint for the STOMP broker. Falls back to{" "}
                    <code className="bg-gray-100 px-1 rounded text-[10px]">
                      NEXT_PUBLIC_STOMP_BROKER_URL
                    </code>{" "}
                    env var if empty.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Subscription Destination
                  </label>
                  <input
                    value={config.stompDestination}
                    onChange={(e) =>
                      setConfig({ ...config, stompDestination: e.target.value })
                    }
                    placeholder="/topic/notifications"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    STOMP topic to subscribe to. Messages must include{" "}
                    <code className="bg-gray-100 px-1 rounded text-[10px]">
                      {`{"application":"chatbot"}`}
                    </code>{" "}
                    to be processed.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <h4 className="text-xs font-semibold text-blue-700 mb-1">
                    Environment Quick Switch
                  </h4>
                  <p className="text-xs text-blue-600 mb-2">
                    Click a preset to fill in the broker URL for common
                    environments:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        label: "Local (RabbitMQ)",
                        url: "ws://localhost:15674/ws",
                      },
                      {
                        label: "Local (ActiveMQ)",
                        url: "ws://localhost:61614/ws",
                      },
                      {
                        label: "Dev",
                        url: "wss://stomp-dev.yourcompany.com/ws",
                      },
                      { label: "QA", url: "wss://stomp-qa.yourcompany.com/ws" },
                      { label: "Prod", url: "wss://stomp.yourcompany.com/ws" },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() =>
                          setConfig({ ...config, stompBrokerUrl: preset.url })
                        }
                        className="px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleSaveStomp}
                  className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg shadow-sm hover:bg-cyan-700"
                >
                  Save STOMP Settings
                </button>
                {saved && (
                  <span className="text-xs text-green-600">
                    Settings saved successfully
                  </span>
                )}
              </div>
            </div>
          )}

          {activeSection === "platforms" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Platform Configuration
              </h2>

              <div className="space-y-3">
                {[
                  {
                    id: "web",
                    label: "Web Chat",
                    desc: "Main chat interface at /",
                  },
                  {
                    id: "widget",
                    label: "Embedded Widget",
                    desc: "Iframe-based embeddable widget at /widget",
                  },
                  {
                    id: "teams",
                    label: "Microsoft Teams",
                    desc: "Teams webhook integration",
                  },
                ].map((platform) => (
                  <label
                    key={platform.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.enabledPlatforms.includes(platform.id)}
                      onChange={(e) => {
                        const platforms = e.target.checked
                          ? [...config.enabledPlatforms, platform.id]
                          : config.enabledPlatforms.filter(
                              (p) => p !== platform.id,
                            );
                        setConfig({ ...config, enabledPlatforms: platforms });
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {platform.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {platform.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeSection === "about" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Platform Information
              </h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Platform</span>
                  <span className="font-medium">
                    Multi-Tenant Embedded Bot Platform
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">NLP Engine</span>
                  <span className="font-mono text-xs">
                    @nlpjs/nlp (classical NLP, no LLM)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Fuzzy Matching</span>
                  <span className="font-mono text-xs">Fuse.js</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Framework</span>
                  <span className="font-mono text-xs">
                    Next.js 14 + React 18
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Adapters</span>
                  <span>Web, Widget, Microsoft Teams</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Query Types</span>
                  <span>API, Document, CSV, URL</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Data Storage</span>
                  <span>JSON config files + Mock API</span>
                </div>
              </div>
            </div>
          )}

          {activeSection !== "about" && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              {saved && (
                <span className="text-xs text-green-600">
                  Settings saved successfully
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
