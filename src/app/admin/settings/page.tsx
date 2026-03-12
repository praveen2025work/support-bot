'use client';

import { useState, useEffect } from 'react';

interface PlatformConfig {
  nlpConfidenceThreshold: number;
  fuzzyConfidenceThreshold: number;
  sessionTtlMinutes: number;
  apiCacheTtlMinutes: number;
  apiBaseUrl: string;
  mockApiUrl: string;
  enabledPlatforms: string[];
}

export default function SettingsPage() {
  const [config, setConfig] = useState<PlatformConfig>({
    nlpConfidenceThreshold: 0.65,
    fuzzyConfidenceThreshold: 0.5,
    sessionTtlMinutes: 30,
    apiCacheTtlMinutes: 5,
    apiBaseUrl: '',
    mockApiUrl: 'http://localhost:8080',
    enabledPlatforms: ['web', 'widget'],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('nlp');

  // Load current settings from constants (read-only display for now)
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.config) setConfig(d.config);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'nlp', label: 'NLP Pipeline' },
    { id: 'api', label: 'API & Cache' },
    { id: 'platforms', label: 'Platforms' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Platform configuration and thresholds</p>
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
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings content */}
        <div className="flex-1">
          {activeSection === 'nlp' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">NLP Pipeline Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    NLP Confidence Threshold
                  </label>
                  <input
                    type="number"
                    min="0" max="1" step="0.05"
                    value={config.nlpConfidenceThreshold}
                    onChange={(e) => setConfig({ ...config, nlpConfidenceThreshold: parseFloat(e.target.value) })}
                    className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Minimum confidence for NLP classifier. Below this, falls back to fuzzy matching. Default: 0.65
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Fuzzy Match Threshold
                  </label>
                  <input
                    type="number"
                    min="0" max="1" step="0.05"
                    value={config.fuzzyConfidenceThreshold}
                    onChange={(e) => setConfig({ ...config, fuzzyConfidenceThreshold: parseFloat(e.target.value) })}
                    className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Minimum score for fuzzy FAQ matching. Below this, returns unknown intent. Default: 0.5
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Session TTL (minutes)
                  </label>
                  <input
                    type="number"
                    min="1" max="1440"
                    value={config.sessionTtlMinutes}
                    onChange={(e) => setConfig({ ...config, sessionTtlMinutes: parseInt(e.target.value) })}
                    className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    How long conversation sessions persist in memory. Default: 30 minutes
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">API & Cache Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    API Base URL
                  </label>
                  <input
                    value={config.apiBaseUrl}
                    onChange={(e) => setConfig({ ...config, apiBaseUrl: e.target.value })}
                    placeholder="e.g. https://api.yourcompany.com"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">Base URL for production API. Leave empty to use mock API.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Mock API URL
                  </label>
                  <input
                    value={config.mockApiUrl}
                    onChange={(e) => setConfig({ ...config, mockApiUrl: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">URL for development mock API server. Default: http://localhost:8080</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Response Cache TTL (minutes)
                  </label>
                  <input
                    type="number"
                    min="0" max="60"
                    value={config.apiCacheTtlMinutes}
                    onChange={(e) => setConfig({ ...config, apiCacheTtlMinutes: parseInt(e.target.value) })}
                    className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    How long API responses are cached in memory. Set to 0 to disable caching. Default: 5 minutes
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'platforms' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Platform Configuration</h2>

              <div className="space-y-3">
                {[
                  { id: 'web', label: 'Web Chat', desc: 'Main chat interface at /' },
                  { id: 'widget', label: 'Embedded Widget', desc: 'Iframe-based embeddable widget at /widget' },
                  { id: 'teams', label: 'Microsoft Teams', desc: 'Teams webhook integration' },
                ].map((platform) => (
                  <label key={platform.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabledPlatforms.includes(platform.id)}
                      onChange={(e) => {
                        const platforms = e.target.checked
                          ? [...config.enabledPlatforms, platform.id]
                          : config.enabledPlatforms.filter((p) => p !== platform.id);
                        setConfig({ ...config, enabledPlatforms: platforms });
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-700">{platform.label}</div>
                      <div className="text-xs text-gray-400">{platform.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Platform Information</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Platform</span>
                  <span className="font-medium">Multi-Tenant Embedded Bot Platform</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">NLP Engine</span>
                  <span className="font-mono text-xs">@nlpjs/nlp (classical NLP, no LLM)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Fuzzy Matching</span>
                  <span className="font-mono text-xs">Fuse.js</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Framework</span>
                  <span className="font-mono text-xs">Next.js 14 + React 18</span>
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

          {activeSection !== 'about' && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              {saved && <span className="text-xs text-green-600">Settings saved successfully</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
