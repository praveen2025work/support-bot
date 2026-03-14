(function () {
  // ── Sanitization ────────────────────────────────────────────────────
  function sanitize(str, maxLen) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').slice(0, maxLen || 200);
  }

  function allowedValue(val, allowed, fallback) {
    return allowed.indexOf(val) !== -1 ? val : fallback;
  }

  // ── Config ──────────────────────────────────────────────────────────
  var config = window.ChatbotDashboardConfig || {};
  var baseUrl = sanitize(config.baseUrl || window.location.origin, 500);
  var user = sanitize(config.user || '', 100);
  var group = sanitize(config.group || 'default', 100);
  var mode = allowedValue(sanitize(config.mode, 20), ['modal', 'inline'], 'modal');
  var targetSelector = sanitize(config.targetSelector || '', 200);

  // ── Build iframe URL ────────────────────────────────────────────────
  var iframeUrl = baseUrl + '/dashboard?group=' + encodeURIComponent(group);
  if (user) iframeUrl += '&user=' + encodeURIComponent(user);

  // ── Create iframe ───────────────────────────────────────────────────
  function createIframe(width, height) {
    var iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.cssText = 'width:' + width + ';height:' + height + ';border:none;border-radius:12px;';
    iframe.title = 'MITR AI Dashboard';
    iframe.allow = 'clipboard-write';
    return iframe;
  }

  // ── INLINE MODE ─────────────────────────────────────────────────────
  if (mode === 'inline') {
    var target = targetSelector ? document.querySelector(targetSelector) : null;
    if (!target) {
      console.warn('[ChatbotDashboard] Target selector not found:', targetSelector);
      return;
    }
    var iframe = createIframe('100%', '100%');
    iframe.style.borderRadius = '0';
    target.appendChild(iframe);
    return;
  }

  // ── MODAL MODE ──────────────────────────────────────────────────────

  // Overlay
  var overlay = document.createElement('div');
  overlay.id = 'chatbot-dashboard-overlay';
  overlay.style.cssText =
    'display:none;position:fixed;inset:0;z-index:99998;' +
    'background:rgba(0,0,0,0.5);backdrop-filter:blur(2px);' +
    'transition:opacity 0.2s ease;opacity:0;';

  // Modal container
  var modal = document.createElement('div');
  modal.id = 'chatbot-dashboard-modal';
  modal.style.cssText =
    'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.95);' +
    'z-index:99999;width:90vw;max-width:1100px;height:85vh;' +
    'background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);' +
    'overflow:hidden;display:none;transition:transform 0.2s ease,opacity 0.2s ease;opacity:0;';

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.style.cssText =
    'position:absolute;top:12px;right:12px;z-index:10;' +
    'width:32px;height:32px;border-radius:50%;border:none;' +
    'background:rgba(0,0,0,0.1);color:#333;font-size:18px;' +
    'cursor:pointer;display:flex;align-items:center;justify-content:center;';
  closeBtn.textContent = '\u00d7';
  closeBtn.title = 'Close dashboard';

  var iframe = createIframe('100%', '100%');
  iframe.style.borderRadius = '16px';

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  // Show/hide
  function showDashboard() {
    overlay.style.display = 'block';
    modal.style.display = 'block';
    requestAnimationFrame(function () {
      overlay.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%,-50%) scale(1)';
    });
  }

  function hideDashboard() {
    overlay.style.opacity = '0';
    modal.style.opacity = '0';
    modal.style.transform = 'translate(-50%,-50%) scale(0.95)';
    setTimeout(function () {
      overlay.style.display = 'none';
      modal.style.display = 'none';
    }, 200);
  }

  closeBtn.addEventListener('click', hideDashboard);
  overlay.addEventListener('click', hideDashboard);

  // Expose API
  window.ChatbotDashboard = {
    open: showDashboard,
    close: hideDashboard,
  };

  // Auto-create trigger button if no custom trigger
  if (!config.customTrigger) {
    var trigger = document.createElement('button');
    trigger.id = 'chatbot-dashboard-trigger';
    trigger.style.cssText =
      'position:fixed;bottom:20px;right:80px;z-index:99997;' +
      'padding:10px 20px;border:none;border-radius:12px;' +
      'background:linear-gradient(135deg,#2563eb,#4f46e5);' +
      'color:#fff;font-size:14px;font-weight:600;cursor:pointer;' +
      'box-shadow:0 4px 12px rgba(37,99,235,0.3);' +
      'transition:transform 0.15s ease,box-shadow 0.15s ease;';
    trigger.textContent = 'Dashboard';
    trigger.addEventListener('click', showDashboard);
    trigger.addEventListener('mouseenter', function () {
      trigger.style.transform = 'translateY(-2px)';
      trigger.style.boxShadow = '0 6px 16px rgba(37,99,235,0.4)';
    });
    trigger.addEventListener('mouseleave', function () {
      trigger.style.transform = 'translateY(0)';
      trigger.style.boxShadow = '0 4px 12px rgba(37,99,235,0.3)';
    });
    document.body.appendChild(trigger);
  }
})();
