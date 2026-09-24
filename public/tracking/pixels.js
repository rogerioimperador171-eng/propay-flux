/*
 * SAFYRO TRACKER — Meta Pixel (navegador) + CAPI (servidor).
 * Carregado em todas as páginas do funil e no checkout.
 *
 * Ajustes em relação ao script original do Safyro:
 *  - aguarda o <body> existir (o arquivo é carregado no <head>);
 *  - expõe window.safyroTrack(evento, dados) para o checkout disparar o
 *    Purchase com valor/moeda e eventID = id da transação (deduplicação com o
 *    Purchase enviado pelo servidor quando a AmploPay confirma a venda);
 *  - expõe window.safyroContext() com userId/fbc/fbp/UTMs, enviado ao backend
 *    junto com o pedido.
 */
(function () {
  const CONFIG = {
    AFFILIATE_KEY: "ak_cqvhfjax1pnewgi3",
    PIXEL_IDS: ["4731800873811477"],
    API_URL: "https://pmidkvqstpjvjkmbehvf.supabase.co/functions/v1/tracker-events-send"
  };

  if (!CONFIG.AFFILIATE_KEY || CONFIG.AFFILIATE_KEY.includes("SEU_")) {
    console.warn("[SAFYRO] Configure sua AFFILIATE_KEY");
    return;
  }
  if (window.__safyroLoaded) return;
  window.__safyroLoaded = true;

  function start() {
  /* ---------- Helpers ---------- */
  function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [key, ...rest] = cookie.trim().split('=');
      if (key === name) return rest.join('=');
    }
    return null;
  }

  function getLongExpires() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 10);
    return "expires=" + date.toUTCString() + "; path=/; SameSite=Lax";
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getUserData() {
    try { return JSON.parse(getCookie('__userData') || '{}'); }
    catch { return {}; }
  }

  /* ---------- User ID persistente ---------- */
  let userDataCookie = getUserData();
  let userId = userDataCookie.userId;
  if (!userId) {
    userId = generateUUID();
    userDataCookie.userId = userId;
    document.cookie = "__userData=" + JSON.stringify(userDataCookie) + "; " + getLongExpires();
  }
  window.__safyroUserId = userId;

  /* ---------- Setar utm_source = userId na URL ---------- */
  (function() {
    try {
      const url = new URL(window.location.href);
      const cur = url.searchParams.get("utm_source");
      if (!cur || cur !== userId) {
        url.searchParams.set("utm_source", userId);
        window.history.replaceState(window.history.state, '', url.toString());
      }
    } catch(e) {}
  })();

  /* ---------- Propagar UTMs para links ---------- */
  const KEEP_PARAMS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid","src"];
  function getParamsToPass() {
    const p = new URLSearchParams(window.location.search);
    const out = {};
    KEEP_PARAMS.forEach(k => { const v = p.get(k); if (v) out[k] = v; });
    out["utm_source"] = userId;
    return out;
  }
  const PARAMS_TO_PASS = getParamsToPass();

  function applyParamsToLinks() {
    document.querySelectorAll("a[href]").forEach(a => {
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      try {
        const url = new URL(a.href, window.location.origin);
        let changed = false;
        Object.entries(PARAMS_TO_PASS).forEach(([k, v]) => {
          if (v && !url.searchParams.has(k)) { url.searchParams.set(k, v); changed = true; }
        });
        if (changed) a.href = url.toString();
      } catch(e) {}
    });
  }
  applyParamsToLinks();
  new MutationObserver(applyParamsToLinks).observe(document.body, { childList:true, subtree:true });

  /* ---------- Meta Pixel (Browser) - Suporte a múltiplos pixels ---------- */
  window.__safyroPixels = window.__safyroPixels || [];
  const MY_PIXELS = CONFIG.PIXEL_IDS.filter(function(p) { return p && !window.__safyroPixels.includes(p); });
  MY_PIXELS.forEach(function(p) { window.__safyroPixels.push(p); });

  (function initMetaPixels() {
    if (!MY_PIXELS.length) return;

    if (!window.fbq) {
      !(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
    }

    MY_PIXELS.forEach(function(pixelId) {
      try {
        window.fbq('set', 'autoConfig', false, pixelId);
        window.fbq('init', pixelId);
        console.log('[SAFYRO] Pixel inicializado:', pixelId);
      } catch(e) {
        console.warn('[SAFYRO] Falha ao iniciar pixel', pixelId, e);
      }
    });
  })();

  function sendBrowserEvent(eventType, eventId, customData) {
    try {
      if (!MY_PIXELS.length || !window.fbq) return;
      const STANDARD_EVENTS = ["PageView","ViewContent","AddToWishlist","AddToCart","InitiateCheckout","Contact","Lead","Purchase"];

      console.log('[SAFYRO] Browser event:', eventType, 'eventID:', eventId);

      MY_PIXELS.forEach(function(pixelId) {
        if (STANDARD_EVENTS.includes(eventType)) {
          window.fbq('trackSingle', pixelId, eventType, customData || {}, { eventID: eventId });
        } else {
          window.fbq('trackSingleCustom', pixelId, eventType, customData || {}, { eventID: eventId });
        }
      });
    } catch(e) { console.error('[SAFYRO] Browser event error:', e); }
  }

  /* ---------- Envio de eventos ---------- */
  const eventSent = {};
  const ONCE_EVENTS = ["ViewContent","AddToWishlist","AddToCart","InitiateCheckout","Contact","Scroll_25","Scroll_50","Scroll_75","Scroll_90","Timer_1min"];

  function getContext() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      userId: userId,
      url: window.location.href,
      page: window.location.pathname,
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_content: urlParams.get('utm_content'),
      utm_term: urlParams.get('utm_term'),
      fbclid: urlParams.get('fbclid'),
      src: urlParams.get('src'),
      fbc: getCookie('_fbc') || '',
      fbp: getCookie('_fbp') || ''
    };
  }

  async function sendEvent(eventType, data) {
    data = data || {};
    if (ONCE_EVENTS.includes(eventType) && eventSent[eventType]) return;
    if (ONCE_EVENTS.includes(eventType)) eventSent[eventType] = true;

    // InitiateCheckout conta uma vez por ida ao checkout: o clique no link da
    // página de vendas e a abertura do /checkout não geram dois eventos.
    if (eventType === 'InitiateCheckout') {
      try {
        const last = Number(sessionStorage.getItem('safyro:ic') || 0);
        if (Date.now() - last < 5 * 60 * 1000) return;
        sessionStorage.setItem('safyro:ic', String(Date.now()));
      } catch(e) {}
    }

    const eventId = data.eventId || generateUUID();
    const customData = {};
    if (typeof data.value === 'number') customData.value = data.value;
    if (data.currency) customData.currency = data.currency;

    // 1) Navegador (Pixel) com eventID - para TODOS os pixels deste script
    sendBrowserEvent(eventType, eventId, customData);

    // 2) Servidor (CAPI)
    try {
      const payload = Object.assign({
        affiliateKey: CONFIG.AFFILIATE_KEY,
        eventType: eventType,
        eventId: eventId,
        pixelIds: CONFIG.PIXEL_IDS
      }, getContext(), customData);

      await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch(e) { console.error("[SAFYRO] API error", e); }
  }

  window.safyroTrack = sendEvent;
  window.safyroContext = getContext;

  /* ---------- Observador de elementos ---------- */
  function observeEventByIdOrClass(name, callback) {
    const check = () => {
      const elements = [...document.querySelectorAll("#" + name), ...document.querySelectorAll("." + name)];
      elements.forEach(el => {
        if (!el.dataset.__safyroObserved) {
          callback(el);
          el.dataset.__safyroObserved = "true";
        }
      });
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
  }

  function setupIntersectionEvent(eventName) {
    observeEventByIdOrClass(eventName, (el) => {
      const io = new IntersectionObserver((entries, ioInstance) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            sendEvent(eventName);
            ioInstance.unobserve(entry.target);
          }
        });
      }, { threshold: 0.35 });
      io.observe(el);
    });
  }

  /* ---------- Eventos automáticos ---------- */
  sendEvent("PageView");
  setupIntersectionEvent("ViewContent");
  setupIntersectionEvent("AddToWishlist");

  observeEventByIdOrClass("AddToCart", (el) => {
    el.addEventListener('click', () => sendEvent("AddToCart"), { passive:true });
  });

  /* ---------- InitiateCheckout (Triggers: card, link, texto, URL) ---------- */
  (function initCheckoutByUrl() {
    try {
      const path = (window.location.pathname || '').toLowerCase();
      const query = (window.location.search || '').toLowerCase();
      const tokens = ['checkout','carrinho','cart','finalizar','pagamento','payment'];
      if (tokens.some(t => path.includes(t)) || query.includes('checkout')) {
        sendEvent('InitiateCheckout', { trigger: 'url' });
      }
    } catch(e) {}
  })();

  function hasCheckoutIntent(el) {
    try {
      if (!el) return false;

      // 1. Atributos explícitos do Safyro (máxima prioridade)
      const attr1 = el.getAttribute && el.getAttribute('data-safyro-checkout');
      const attr2 = el.getAttribute && el.getAttribute('data-safyro');
      if (attr1 === 'true' || attr2 === 'checkout') return true;

      // 2. ID ou Classe CSS específica (safyro-checkout)
      const elId = (el.id || '').toLowerCase();
      const elClass = (el.className || '').toString().toLowerCase();
      if (elId === 'safyro-checkout' || elClass.includes('safyro-checkout')) return true;

      // 3. Verificar se é um elemento clicável (botão ou link)
      const tagName = (el.tagName || '').toLowerCase();
      const isButton = tagName === 'button' || el.getAttribute('role') === 'button';
      const isLink = tagName === 'a' && el.getAttribute('href');

      if (!isButton && !isLink) return false;

      // 4. Links com href para checkout
      if (isLink) {
        const href = (el.getAttribute('href') || '').toLowerCase();
        const hrefTokens = ['checkout','carrinho','cart','finalizar','pagamento','payment'];
        if (hrefTokens.some(t => href.includes(t))) return true;
      }

      // 5. Botões com texto EXATO de checkout (muito restritivo)
      if (isButton) {
        const text = (el.textContent || '').toLowerCase().trim();
        if (text.length > 0 && text.length < 30) {
          const exactTexts = ['finalizar compra','ir para checkout','checkout','pagar agora'];
          if (exactTexts.some(t => text === t)) return true;
        }
      }

      return false;
    } catch(e) {
      return false;
    }
  }

  document.addEventListener('click', function(e) {
    const target = e.target;

    // 1) Detecta marcação explícita sem limite de profundidade
    try {
      if (target && target.closest) {
        const explicit = target.closest('[data-safyro-checkout="true"],[data-safyro="checkout"],#safyro-checkout,.safyro-checkout,#pay,.pay');
        if (explicit) {
          console.log('[SAFYRO] InitiateCheckout (explicito) detectado:', explicit);
          sendEvent('InitiateCheckout', { trigger: 'explicit' });
          return;
        }
      }
    } catch (e) {}

    // 2) Fallback: checagem por até 4 níveis (para URL/texto)
    let el = target;
    for (let i = 0; i < 4 && el; i++) {
      if (hasCheckoutIntent(el)) {
        console.log('[SAFYRO] InitiateCheckout detectado:', el);
        sendEvent('InitiateCheckout', { trigger: 'intent' });
        return;
      }
      el = el.parentElement;
    }
  }, { passive: true });

  observeEventByIdOrClass("Contact", (el) => {
    el.addEventListener('click', () => sendEvent("Contact"), { passive:true });
  });

  /* ---------- Scroll tracking ---------- */
  (function () {
    let scrollEvents = [25, 50, 75, 90];
    function track() {
      let scrollPos = window.scrollY + window.innerHeight;
      let pageHeight = document.documentElement.scrollHeight;
      let pct = (scrollPos / pageHeight) * 100;
      scrollEvents.forEach(p => {
        if (pct >= p) {
          sendEvent("Scroll_" + p);
        }
      });
    }
    window.addEventListener('scroll', track, { passive:true });
  })();

  setTimeout(() => sendEvent("Timer_1min"), 60000);

  /* ---------- Forms (Lead) ---------- */
  function setFormListeners() {
    document.querySelectorAll('form').forEach(form => {
      if (form.dataset.__safyroLeadSet) return;
      form.addEventListener('submit', () => sendEvent('Lead'));
      form.dataset.__safyroLeadSet = "true";
    });
  }
  setFormListeners();
  new MutationObserver(setFormListeners).observe(document.body, { childList:true, subtree:true });

  console.log("[SAFYRO] Tracker ON", { affiliateKey: CONFIG.AFFILIATE_KEY, pixels: CONFIG.PIXEL_IDS, userId, apiUrl: CONFIG.API_URL });
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
