/* ==========================================================================
   PFT — Personal Finance Tracker  |  Shared Utilities
   Version: 1.0.0
   Description: Global utility functions shared across all PFT pages.
                Use as plain JS (no bundler). Include before page scripts.
   ========================================================================== */

var PFT = PFT || {};

/* --------------------------------------------------------------------------
   1. THEME MANAGEMENT
   -------------------------------------------------------------------------- */
PFT.initTheme = function(themeToggleId) {
  themeToggleId = themeToggleId || 'theme-toggle';
  var root    = document.documentElement;
  var themeBtn = document.getElementById(themeToggleId);

  // Restore persisted theme
  try {
    var saved = localStorage.getItem('pft-theme');
    if (saved) {
      root.dataset.theme = saved;
      if (themeBtn) themeBtn.textContent = saved === 'light' ? '☀️' : '🌙';
    }
  } catch (e) {}

  if (!themeBtn) return;

  themeBtn.onclick = function() {
    var isLight = root.dataset.theme === 'light';
    root.dataset.theme = isLight ? 'dark' : 'light';
    themeBtn.textContent = isLight ? '🌙' : '☀️';
    try { localStorage.setItem('pft-theme', root.dataset.theme); } catch (e) {}
    if (typeof drawCharts === 'function') drawCharts();
  };
};

/* --------------------------------------------------------------------------
   2. NUMBER FORMATTING
   -------------------------------------------------------------------------- */
/** Format a number as Indian Rupees: ₹1,23,456.78 */
PFT.fmt = function(n) {
  return '₹' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/** Compact format: ₹1.2L / ₹85K */
PFT.fmtCompact = function(n) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(1) + 'K';
  return PFT.fmt(n);
};

/* --------------------------------------------------------------------------
   3. DATE FORMATTING
   -------------------------------------------------------------------------- */
/** Format Date as DD Mon YYYY: "16 Nov 2026" */
PFT.dstr = function(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Format Date as Mon YYYY: "Nov 2026" */
PFT.dmonth = function(d) {
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

/* --------------------------------------------------------------------------
   4. ANIMATED COUNTER
   -------------------------------------------------------------------------- */
/**
 * Animate a numeric counter in an element.
 * @param {HTMLElement} el  — the element to update
 * @param {number}      to  — target value
 * @param {number}      dur — duration in ms (default 900)
 * @param {Function}    fmt — formatter function (default PFT.fmt)
 */
PFT.animateCounter = function(el, to, dur, fmt) {
  dur = dur || 900;
  fmt = fmt || PFT.fmt;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = fmt(to);
    return;
  }
  var t0 = performance.now();
  (function tick(t) {
    var progress = Math.min((t - t0) / dur, 1);
    var ease     = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = fmt(to * ease);
    if (progress < 1) requestAnimationFrame(tick);
  })(t0);
};

/* --------------------------------------------------------------------------
   5. PROGRESS BAR ANIMATION
   -------------------------------------------------------------------------- */
/**
 * Animate all [data-w] progress bar fills to their target widths.
 * Uses a small delay so the animation is visible after page paint.
 */
PFT.animateProgressBars = function() {
  setTimeout(function() {
    document.querySelectorAll('[data-progress]').forEach(function(el) {
      el.style.width = Math.min(parseFloat(el.dataset.progress), 100) + '%';
    });
  }, 150);
};

/* --------------------------------------------------------------------------
   6. CHART.JS DEFAULTS  (call before creating any chart)
   -------------------------------------------------------------------------- */
/**
 * Apply shared Chart.js defaults that match the current PFT theme.
 * Call once per theme-change and once on page load.
 * @param {boolean} light  — true if light theme is active
 */
PFT.applyChartDefaults = function(light) {
  if (typeof Chart === 'undefined') return;

  var cs = getComputedStyle(document.documentElement);
  var get = function(v) { return cs.getPropertyValue(v).trim(); };

  Chart.defaults.color      = get('--text-secondary');
  Chart.defaults.font.family = get('--font-sans') || 'Inter, system-ui, sans-serif';
  Chart.defaults.font.size   = 12;
  Chart.defaults.animation   = {
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700
  };
  Chart.defaults.plugins.tooltip.backgroundColor = light
    ? 'rgba(255,255,255,0.95)'
    : 'rgba(2,20,18,0.95)';
  Chart.defaults.plugins.tooltip.titleColor  = get('--text-primary');
  Chart.defaults.plugins.tooltip.bodyColor   = get('--text-secondary');
  Chart.defaults.plugins.tooltip.borderColor = get('--glass-border');
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding     = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.legend.labels.boxWidth     = 10;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding      = 16;
};

/**
 * Returns a standard grid options object for axis scales.
 */
PFT.chartGridColor = function() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--glass-border').trim();
};

/**
 * Return a default scale config for Chart.js.
 */
PFT.scaleDefaults = function() {
  var gridColor = PFT.chartGridColor();
  return {
    x: { grid: { color: gridColor, drawBorder: false }, ticks: { maxRotation: 0 } },
    y: { grid: { color: gridColor, drawBorder: false }, ticks: { callback: function(v) { return PFT.fmtCompact(v); } } }
  };
};

/* --------------------------------------------------------------------------
   7. CSS VARIABLE HELPER
   -------------------------------------------------------------------------- */
/** Read a CSS custom property from :root */
PFT.css = function(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};

/* --------------------------------------------------------------------------
   8. DEBOUNCE
   -------------------------------------------------------------------------- */
PFT.debounce = function(fn, wait) {
  var timer;
  return function() {
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(null, args); }, wait || 200);
  };
};

/* --------------------------------------------------------------------------
   9. TOAST NOTIFICATION
   -------------------------------------------------------------------------- */
/**
 * Show a brief toast message.
 * @param {string} msg   — text to display
 * @param {'info'|'success'|'warn'|'error'} type
 */
PFT.toast = function(msg, type) {
  type = type || 'info';
  var el = document.createElement('div');
  el.className = 'pft-toast pft-toast-' + type;
  el.textContent = msg;
  el.style.cssText = [
    'position:fixed',
    'bottom:28px',
    'right:28px',
    'z-index:9999',
    'padding:12px 20px',
    'border-radius:12px',
    'font-size:14px',
    'font-weight:500',
    'backdrop-filter:blur(20px)',
    'border:1px solid var(--glass-border)',
    'box-shadow:var(--shadow-md)',
    'animation:fadeInUp .3s ease',
    'max-width:320px',
    'line-height:1.4',
    type === 'error'   ? 'background:rgba(248,113,113,0.2);color:#f87171;' :
    type === 'success' ? 'background:rgba(45,212,191,0.2);color:#2dd4bf;' :
    type === 'warn'    ? 'background:rgba(251,191,36,0.2);color:#fbbf24;'  :
                         'background:var(--bg-card);color:var(--text-primary);'
  ].join(';');
  document.body.appendChild(el);
  setTimeout(function() {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(function() { el.remove(); }, 320);
  }, 3000);
};

/* --------------------------------------------------------------------------
   10. SCROLL REVEAL (IntersectionObserver)
   -------------------------------------------------------------------------- */
PFT.initScrollReveal = function() {
  if (!window.IntersectionObserver) return;
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.glass-card, .kpi-card').forEach(function(el) {
    if (!el.style.opacity) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity .5s ease, transform .5s ease';
    }
    io.observe(el);
  });
};

/* --------------------------------------------------------------------------
   11. ACTIVE SESSION HELPER (for Settings page)
   -------------------------------------------------------------------------- */
PFT.getDeviceIcon = function(ua) {
  ua = (ua || navigator.userAgent).toLowerCase();
  if (/mobile|android|iphone/.test(ua)) return '📱';
  if (/ipad|tablet/.test(ua))           return '📟';
  return '💻';
};
