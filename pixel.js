/* ============================================================
   Meta Pixel + Conversions API (backend CAPI) — dedupe via event_id.
   O snippet base do Pixel (fbq init) fica inline no <head> de cada LP.
   Este arquivo:
     - dispara o PageView (client-side + server-side) com o MESMO event_id
     - expõe window.LBTracking.trackLead(...) para o formulário chamar
       no momento em que o lead é aceito com sucesso.
   ============================================================ */
(function () {
  "use strict";

  var CAPI_BASE = "https://drguilhermeangelo-backend.vercel.app";

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getCookie(name) {
    var m = document.cookie.match("(?:^|;\\s*)" + name + "=([^;]+)");
    return m ? decodeURIComponent(m[1]) : null;
  }

  // _fbc: cookie do clique no Facebook. Se não existir mas veio ?fbclid= na URL,
  // monta o valor no formato que o Meta espera.
  function getFbc() {
    var fbc = getCookie("_fbc");
    if (fbc) return fbc;
    try {
      var qp = new URLSearchParams(location.search);
      var fbclid = qp.get("fbclid");
      if (fbclid) return "fb.1." + Date.now() + "." + fbclid;
    } catch (e) {}
    return null;
  }

  function sendCapi(path, payload) {
    try {
      return fetch(CAPI_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  function trackPageView() {
    var eventId = uuid();
    if (window.fbq) {
      fbq("track", "PageView", {}, { eventID: eventId });
    }
    sendCapi("/api/pageview", {
      event_id: eventId,
      event_source_url: location.href,
      fbp: getCookie("_fbp") || undefined,
      fbc: getFbc() || undefined,
    });
  }

  function trackLead(lead) {
    lead = lead || {};
    var eventId = uuid();
    if (window.fbq) {
      fbq("track", "CompleteRegistration", {}, { eventID: eventId });
    }
    sendCapi("/api/lead", {
      event_id: eventId,
      event_source_url: location.href,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      fbp: getCookie("_fbp") || undefined,
      fbc: getFbc() || undefined,
    });
  }

  window.LBTracking = { trackLead: trackLead, trackPageView: trackPageView };

  // PageView automático no load da página
  trackPageView();
})();
