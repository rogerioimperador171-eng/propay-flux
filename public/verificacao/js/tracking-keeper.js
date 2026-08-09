(function () {
  "use strict";

  var STORAGE_KEY = "_tk_params";

  var TRACKED = [
    
    "gclid", "gbraid", "wbraid", "msclkid", "fbclid",
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
    "utm_source_platform", "utm_creative_format", "utm_marketing_tactic",
    "utm_adgroup", "utm_campaign_id", "utm_adset", "utm_ad", "utm_channel",
    "campaign_id", "adset_id", "ad_id",
    "sck", "xcod", "subid", "aff_sub", "aff_sub2", "src"
  ];

  var trackedSet = {};
  for (var i = 0; i < TRACKED.length; i++) trackedSet[TRACKED[i]] = true;

  // --- Storage helpers ---
  function load() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var p = new URLSearchParams(raw);
      var obj = {};
      p.forEach(function (v, k) { obj[k] = v; });
      return obj;
    } catch (e) { return {}; }
  }

  function save(obj) {
    try {
      var p = new URLSearchParams();
      for (var k in obj) {
        if (obj.hasOwnProperty(k) && obj[k]) p.set(k, obj[k]);
      }
      var str = p.toString();
      sessionStorage.setItem(STORAGE_KEY, str);
    } catch (e) {}
  }

  // --- Capture from current URL and merge with saved ---
  function capture() {
    var saved = load();
    var url = new URLSearchParams(window.location.search);
    url.forEach(function (v, k) {
      var low = k.toLowerCase();
      if (trackedSet[low] || low.indexOf("utm_") === 0) {
        saved[k] = v;
      }
    });
    save(saved);
    return saved;
  }

  // --- Append saved params to a URL ---
  function buildUrl(href) {
    try {
      var params = load();
      var url = new URL(href, window.location.origin);

      // Skip external domains (Redtrack clicks, etc.)
      if (url.hostname !== window.location.hostname) return href;

      for (var k in params) {
        if (params.hasOwnProperty(k) && !url.searchParams.has(k)) {
          url.searchParams.set(k, params[k]);
        }
      }
      return url.pathname + url.search + url.hash;
    } catch (e) {
      return href;
    }
  }

  // --- Intercept link clicks ---
  document.addEventListener("click", function (e) {
    var el = e.target;
    while (el && el.tagName !== "A") el = el.parentElement;
    if (!el || !el.href) return;

    try {
      var url = new URL(el.href);
      // Only intercept same-domain links
      if (url.hostname !== window.location.hostname) return;

      var params = load();
      var changed = false;
      for (var k in params) {
        if (params.hasOwnProperty(k) && !url.searchParams.has(k)) {
          url.searchParams.set(k, params[k]);
          changed = true;
        }
      }
      if (changed) {
        el.href = url.pathname + url.search + url.hash;
      }
    } catch (ex) {}
  }, true);

  // --- Intercept window.location.href assignments ---
  var origDescriptor = Object.getOwnPropertyDescriptor(window, "location");
  if (!origDescriptor || !origDescriptor.set) {
    // Fallback: patch location.assign and location.replace
    var origAssign = window.location.assign;
    var origReplace = window.location.replace;

    if (origAssign) {
      window.location.assign = function (url) {
        return origAssign.call(window.location, buildUrl(url));
      };
    }
    if (origReplace) {
      window.location.replace = function (url) {
        return origReplace.call(window.location, buildUrl(url));
      };
    }
  }

  // Also patch assign/replace regardless
  try {
    var _assign = window.location.assign.bind(window.location);
    var _replace = window.location.replace.bind(window.location);

    window.location.assign = function (url) { return _assign(buildUrl(url)); };
    window.location.replace = function (url) { return _replace(buildUrl(url)); };
  } catch (e) {}

  // Patch for window.location.href = "..." (via monitoring)
  // Since we can't override location.href setter in all browsers,
  // we also hook into the beforeunload to log, but the main coverage
  // comes from link click interception + assign/replace patching.

  // --- Init ---
  var params = capture();

  // --- Public API ---
  window.trackingKeeper = {
    getParams: function () { return load(); },
    getQueryString: function () {
      var p = load();
      var qs = new URLSearchParams();
      for (var k in p) { if (p.hasOwnProperty(k)) qs.set(k, p[k]); }
      return qs.toString();
    },
    buildUrl: buildUrl,
    refresh: capture
  };
})();
