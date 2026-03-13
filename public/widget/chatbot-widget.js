(function () {
  // ── Sanitization helpers ──────────────────────────────────────────────
  /**
   * Strip HTML tags and limit string length for config values.
   */
  function sanitize(str, maxLen) {
    if (typeof str !== 'string') return '';
    // Strip any HTML tags
    var cleaned = str.replace(/<[^>]*>/g, '');
    // Limit length (default 200)
    return cleaned.slice(0, maxLen || 200);
  }

  /**
   * Validate that a value is one of the allowed options.
   */
  function allowedValue(val, allowed, fallback) {
    return allowed.indexOf(val) !== -1 ? val : fallback;
  }

  /**
   * Extract the origin from a URL string.
   */
  function extractOrigin(url) {
    try {
      var parsed = new URL(url);
      return parsed.origin;
    } catch (e) {
      return null;
    }
  }

  // ── Parse and sanitize config ─────────────────────────────────────────
  var config = window.ChatbotWidgetConfig || {};
  var baseUrl = sanitize(config.baseUrl || window.location.origin, 500);
  var group = sanitize(config.group || '', 100);
  var position = allowedValue(sanitize(config.position, 20), ['bottom-right', 'bottom-left'], 'bottom-right');
  var theme = allowedValue(sanitize(config.theme, 20), ['blue', 'indigo', 'green'], 'blue');
  var greeting = sanitize(config.greeting || '', 300);
  var iconType = allowedValue(sanitize(config.iconType, 20), ['bot', 'headset', 'chat'], 'bot');

  // ── Origin validation for postMessage ────────────────────────────────
  var allowedOrigins = Array.isArray(config.allowedOrigins) ? config.allowedOrigins : [];
  // Always derive the iframe src origin as a fallback
  var iframeSrcOrigin = extractOrigin(baseUrl);

  function isOriginAllowed(origin) {
    // If an explicit allowedOrigins list is configured, use it
    if (allowedOrigins.length > 0) {
      for (var i = 0; i < allowedOrigins.length; i++) {
        if (origin === allowedOrigins[i]) return true;
      }
      return false;
    }
    // Otherwise fall back to matching the iframe src origin
    return iframeSrcOrigin ? origin === iframeSrcOrigin : false;
  }

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

  // ── SVG Icon creation via DOM (no innerHTML) ──────────────────────────
  var svgNS = 'http://www.w3.org/2000/svg';

  function createSvgElement(tag, attrs, children) {
    var el = document.createElementNS(svgNS, tag);
    if (attrs) {
      for (var key in attrs) {
        if (attrs.hasOwnProperty(key)) {
          el.setAttribute(key, attrs[key]);
        }
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        el.appendChild(children[i]);
      }
    }
    return el;
  }

  function createIconSvg(type) {
    var base = { width: '28', height: '28', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    var children = [];

    if (type === 'headset') {
      children.push(createSvgElement('path', { d: 'M3 18v-6a9 9 0 0 1 18 0v6' }));
      children.push(createSvgElement('path', { d: 'M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z' }));
      children.push(createSvgElement('path', { d: 'M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z' }));
    } else if (type === 'chat') {
      children.push(createSvgElement('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }));
      children.push(createSvgElement('path', { d: 'M8 10h.01' }));
      children.push(createSvgElement('path', { d: 'M12 10h.01' }));
      children.push(createSvgElement('path', { d: 'M16 10h.01' }));
    } else {
      // bot (default)
      children.push(createSvgElement('rect', { x: '3', y: '11', width: '18', height: '10', rx: '2' }));
      children.push(createSvgElement('circle', { cx: '12', cy: '5', r: '2' }));
      children.push(createSvgElement('line', { x1: '12', y1: '7', x2: '12', y2: '11' }));
      children.push(createSvgElement('circle', { cx: '8', cy: '16', r: '1', fill: 'currentColor' }));
      children.push(createSvgElement('circle', { cx: '16', cy: '16', r: '1', fill: 'currentColor' }));
      children.push(createSvgElement('path', { d: 'M9 19h6' }));
    }

    return createSvgElement('svg', base, children);
  }

  function createCloseIconSvg() {
    var base = { width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    var children = [
      createSvgElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
      createSvgElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
    ];
    return createSvgElement('svg', base, children);
  }

  /**
   * Replace toggle button icon using DOM methods (no innerHTML).
   */
  function setToggleIcon(buttonEl, svgNode) {
    while (buttonEl.firstChild) {
      buttonEl.removeChild(buttonEl.firstChild);
    }
    buttonEl.appendChild(svgNode);
  }

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

  // Create toggle button (using DOM-based SVG, no innerHTML)
  var toggle = document.createElement('button');
  toggle.id = 'chatbot-widget-toggle';
  setToggleIcon(toggle, createIconSvg(iconType));
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
    if (widgetState === 'closed') toggle.style.transform = 'scale(1)';
  };

  // Greeting tooltip (using textContent, already safe)
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

  // ── Widget states: 'closed' | 'open' | 'minimized' ──────────────────
  var widgetState = 'closed'; // 'closed' | 'open' | 'minimized'
  var savedHeight = '560px';

  // Create minimized bar
  var minimizedBar = document.createElement('div');
  minimizedBar.id = 'chatbot-minimized-bar';
  minimizedBar.style.cssText =
    'position:fixed;bottom:20px;' + iframeHPos + 'width:220px;height:44px;z-index:999999;display:none;border-radius:22px;overflow:hidden;' +
    'box-shadow:0 4px 16px rgba(0,0,0,0.15);cursor:pointer;' +
    'background:' + t.bg + ';color:white;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'font-size:13px;font-weight:600;' +
    'display:none;align-items:center;justify-content:center;gap:8px;padding:0 16px;' +
    'transition:transform 0.2s ease;';

  // Bot icon + label in minimized bar (DOM-based)
  var miniIcon = createIconSvg(iconType);
  miniIcon.setAttribute('width', '18');
  miniIcon.setAttribute('height', '18');
  minimizedBar.appendChild(miniIcon);
  var miniLabel = document.createElement('span');
  miniLabel.textContent = 'Chatbot';
  minimizedBar.appendChild(miniLabel);
  // Expand arrow
  var expandSvg = createSvgElement('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    createSvgElement('polyline', { points: '18 15 12 9 6 15' }),
  ]);
  expandSvg.style.marginLeft = 'auto';
  minimizedBar.appendChild(expandSvg);

  minimizedBar.onmouseenter = function () { minimizedBar.style.transform = 'scale(1.03)'; };
  minimizedBar.onmouseleave = function () { minimizedBar.style.transform = 'scale(1)'; };

  function transitionTo(newState) {
    widgetState = newState;

    if (newState === 'open') {
      // Show full iframe, hide toggle + minimized bar
      iframeWrap.style.display = 'block';
      iframeWrap.style.height = savedHeight;
      iframeWrap.style.maxHeight = 'calc(100vh - 120px)';
      iframeWrap.style.borderRadius = '16px';
      iframeWrap.style.animation = 'chatbot-fade-in 0.25s ease forwards';
      toggle.style.display = 'none';
      minimizedBar.style.display = 'none';
      if (greetingEl) greetingEl.style.display = 'none';
    } else if (newState === 'minimized') {
      // Hide full iframe + toggle, show minimized bar
      iframeWrap.style.animation = 'chatbot-fade-out 0.2s ease forwards';
      setTimeout(function () { iframeWrap.style.display = 'none'; }, 200);
      toggle.style.display = 'none';
      minimizedBar.style.display = 'flex';
    } else {
      // closed — hide everything, show toggle
      iframeWrap.style.animation = 'chatbot-fade-out 0.2s ease forwards';
      setTimeout(function () { iframeWrap.style.display = 'none'; }, 200);
      minimizedBar.style.display = 'none';
      toggle.style.display = 'flex';
      setToggleIcon(toggle, createIconSvg(iconType));
      toggle.setAttribute('aria-label', 'Open chat');
      toggle.style.animation = 'none';
    }
  }

  toggle.onclick = function () {
    if (widgetState === 'closed') {
      toggle.style.animation = 'none';
      transitionTo('open');
    } else {
      transitionTo('closed');
    }
  };

  minimizedBar.onclick = function () {
    transitionTo('open');
  };

  // Listen for messages from iframe — with origin validation
  window.addEventListener('message', function (event) {
    if (!isOriginAllowed(event.origin)) return;

    if (event.data && event.data.type === 'chatbot-close') {
      transitionTo('closed');
    } else if (event.data && event.data.type === 'chatbot-minimize') {
      transitionTo('minimized');
    }
  });

  document.body.appendChild(iframeWrap);
  document.body.appendChild(toggle);
  document.body.appendChild(minimizedBar);
  if (greetingEl) document.body.appendChild(greetingEl);
})();
