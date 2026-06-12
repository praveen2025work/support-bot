'use client';

import { useState } from 'react';

type TabId = 'iframe' | 'widget';

/**
 * Escape HTML entities to prevent injection in generated embed code.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape a value for use inside a JavaScript single-quoted string literal
 * within generated embed code.
 */
function escapeJsString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e')
    .replace(/&/g, '\\x26');
}

export function EmbedCodeGenerator({ groupId }: { groupId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>('widget');
  const [width, setWidth] = useState('400');
  const [height, setHeight] = useState('600');
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('blue');
  const [position, setPosition] = useState('bottom-right');
  const [greeting, setGreeting] = useState('');
  const [iconType, setIconType] = useState('bot');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Sanitize width/height to digits only
  const safeWidth = width.replace(/\D/g, '') || '400';
  const safeHeight = height.replace(/\D/g, '') || '600';

  const iframeSnippet = `<iframe
  src="${escapeHtml(baseUrl)}/widget?group=${escapeHtml(encodeURIComponent(groupId))}"
  width="${safeWidth}"
  height="${safeHeight}"
  style="border: none; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.15);"
  allow="clipboard-write"
  title="Chatbot Widget"
></iframe>`;

  const widgetConfig = [
    `  baseUrl: '${escapeJsString(baseUrl)}',`,
    `  group: '${escapeJsString(groupId)}',`,
    theme !== 'blue' ? `  theme: '${escapeJsString(theme)}',` : '',
    position !== 'bottom-right' ? `  position: '${escapeJsString(position)}',` : '',
    greeting ? `  greeting: '${escapeJsString(greeting)}',` : '',
    iconType !== 'bot' ? `  iconType: '${escapeJsString(iconType)}',` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const widgetSnippet = `<!-- Chatbot Widget -->
<script>
  window.ChatbotWidgetConfig = {
${widgetConfig}
  };
</script>
<script src="${escapeHtml(baseUrl)}/widget/chatbot-widget.js"></script>`;

  const snippet = activeTab === 'iframe' ? iframeSnippet : widgetSnippet;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('widget')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'widget'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Widget Script
        </button>
        <button
          onClick={() => setActiveTab('iframe')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'iframe'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Inline Iframe
        </button>
      </div>

      {/* Config options */}
      {activeTab === 'widget' ? (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-xs text-gray-600">
            Theme
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="ml-2 text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="blue">Blue</option>
              <option value="indigo">Indigo</option>
              <option value="green">Green</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Position
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="ml-2 text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Icon
            <select
              value={iconType}
              onChange={(e) => setIconType(e.target.value)}
              className="ml-2 text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="bot">Bot</option>
              <option value="headset">Headset</option>
              <option value="chat">Chat</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Greeting
            <input
              type="text"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Hi! Need help?"
              className="ml-2 w-32 text-xs border border-gray-300 rounded px-2 py-1"
            />
          </label>
        </div>
      ) : (
        <div className="flex gap-4 mb-3">
          <label className="text-xs text-gray-600">
            Width (px)
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="ml-2 w-20 text-xs border border-gray-300 rounded px-2 py-1"
            />
          </label>
          <label className="text-xs text-gray-600">
            Height (px)
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="ml-2 w-20 text-xs border border-gray-300 rounded px-2 py-1"
            />
          </label>
        </div>
      )}

      {/* Code preview */}
      <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
        {snippet}
      </pre>
      <button
        onClick={handleCopy}
        className="mt-2 px-4 py-1.5 text-xs font-medium bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy to Clipboard'}
      </button>
    </div>
  );
}
