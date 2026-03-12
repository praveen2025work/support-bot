(function () {
  var config = window.ChatbotWidgetConfig || {};
  var baseUrl = config.baseUrl || window.location.origin;
  var group = config.group || '';
  var position = config.position || 'bottom-right';
  var theme = config.theme || 'blue';
  var greeting = config.greeting || '';
  var iconType = config.iconType || 'bot';

  // Theme colors
  var themes = {
    blue: { bg: 'linear-gradient(135deg, #2563eb, #4f46e5)', shadow: 'rgba(37, 99, 235, 0.4)' },
    indigo: { bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)', shadow: 'rgba(79, 70, 229, 0.4)' },
    green: { bg: 'linear-gradient(135deg, #059669, #0d9488)', shadow: 'rgba(5, 150, 105, 0.4)' },
  };
  var t = themes[theme] || themes.blue;

  // Position values
  var isLeft = position === 'bottom-left';
  var hPos = isLeft ? 'left:20px;right:auto;' : 'right:20px;left:auto;';
  var iframeHPos = isLeft ? 'left:20px;right:auto;' : 'right:20px;left:auto;';

  // SVG Icons
  var icons = {
    bot: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><path d="M9 19h6"/></svg>',
    headset: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"/></svg>',
    chat: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></svg>',
  };
  var closeIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var botIcon = icons[iconType] || icons.bot;

  // Inject keyframes
  var style = document.createElement('style');
  style.textContent =
    '@keyframes chatbot-pulse{0%{box-shadow:0 4px 12px ' + t.shadow + '}50%{box-shadow:0 4px 24px ' + t.shadow + ',0 0 0 8px rgba(37,99,235,0.1)}100%{box-shadow:0 4px 12px ' + t.shadow + '}}' +
    '@keyframes chatbot-fade-in{from{opacity:0;transform:translateY(16px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}' +
    '@keyframes chatbot-fade-out{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(16px) scale(0.95)}}' +
    '@keyframes chatbot-greeting-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(style);

  // Create iframe container
  var iframeWrap = document.createElement('div');
  iframeWrap.id = 'chatbot-widget-wrap';
  iframeWrap.style.cssText =
    'position:fixed;bottom:84px;' + iframeHPos + 'width:380px;height:560px;z-index:999999;display:none;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.08);' +
    'max-width:calc(100vw - 40px);max-height:calc(100vh - 120px);';

  var widgetUrl = baseUrl + '/widget';
  if (group) widgetUrl += '?group=' + encodeURIComponent(group);

  var iframe = document.createElement('iframe');
  iframe.src = widgetUrl;
  iframe.id = 'chatbot-widget-iframe';
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.setAttribute('title', 'Chatbot Widget');
  iframeWrap.appendChild(iframe);

  // Create toggle button
  var toggle = document.createElement('button');
  toggle.id = 'chatbot-widget-toggle';
  toggle.innerHTML = botIcon;
  toggle.setAttribute('aria-label', 'Open chat');
  toggle.style.cssText =
    'position:fixed;bottom:20px;' + hPos + 'width:60px;height:60px;border-radius:50%;border:none;' +
    'background:' + t.bg + ';color:white;cursor:pointer;z-index:999998;' +
    'box-shadow:0 4px 12px ' + t.shadow + ';' +
    'display:flex;align-items:center;justify-content:center;' +
    'transition:transform 0.2s ease,box-shadow 0.2s ease;' +
    'animation:chatbot-pulse 2s ease-in-out 3;';

  toggle.onmouseenter = function () {
    toggle.style.transform = 'scale(1.08)';
  };
  toggle.onmouseleave = function () {
    if (!isOpen) toggle.style.transform = 'scale(1)';
  };

  // Greeting tooltip
  var greetingEl = null;
  if (greeting) {
    greetingEl = document.createElement('div');
    greetingEl.id = 'chatbot-greeting';
    greetingEl.textContent = greeting;
    greetingEl.style.cssText =
      'position:fixed;bottom:84px;' + hPos + 'background:#fff;color:#1f2937;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'font-size:13px;padding:10px 16px;border-radius:12px;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:999997;' +
      'max-width:240px;animation:chatbot-greeting-in 0.3s ease;cursor:pointer;';
    greetingEl.onclick = function () {
      greetingEl.style.display = 'none';
    };
    // Auto-dismiss after 8 seconds
    setTimeout(function () {
      if (greetingEl) greetingEl.style.display = 'none';
    }, 8000);
  }

  var isOpen = false;
  toggle.onclick = function () {
    isOpen = !isOpen;
    if (isOpen) {
      iframeWrap.style.display = 'block';
      iframeWrap.style.animation = 'chatbot-fade-in 0.25s ease forwards';
      toggle.innerHTML = closeIcon;
      toggle.setAttribute('aria-label', 'Close chat');
      toggle.style.transform = 'scale(1)';
      toggle.style.animation = 'none';
      if (greetingEl) greetingEl.style.display = 'none';
    } else {
      iframeWrap.style.animation = 'chatbot-fade-out 0.2s ease forwards';
      setTimeout(function () {
        iframeWrap.style.display = 'none';
      }, 200);
      toggle.innerHTML = botIcon;
      toggle.setAttribute('aria-label', 'Open chat');
    }
  };

  // Listen for close messages from iframe
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'chatbot-close') {
      isOpen = false;
      iframeWrap.style.animation = 'chatbot-fade-out 0.2s ease forwards';
      setTimeout(function () {
        iframeWrap.style.display = 'none';
      }, 200);
      toggle.innerHTML = botIcon;
      toggle.setAttribute('aria-label', 'Open chat');
    }
  });

  document.body.appendChild(iframeWrap);
  document.body.appendChild(toggle);
  if (greetingEl) document.body.appendChild(greetingEl);
})();
