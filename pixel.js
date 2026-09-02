/* ============================================================
   Meta Pixel + Conversions API (backend CAPI) — dedupe via event_id.
   O snippet base do Pixel (fbq init) fica inline no <head> de cada LP.
   Este arquivo:
     - dispara o PageView (client-side + server-side) com o MESMO event_id
     - expõe window.LBTracking.trackLead(...) para o formulário chamar
       no momento em que o lead é aceito com sucesso.

   OBSERVABILIDADE
     - Erros (rede, CORS, HTTP != 2xx, resposta sem events_received) são
       SEMPRE logados no console com o prefixo "[CAPI]". Nunca engolimos.
     - Modo verboso: ?capi_debug=1 na URL, ou localStorage.capi_debug = "1".
       Com ele, cada evento loga o que foi disparado (event_name, event_id,
       payload) e a resposta crua do backend. Sem ele, sucesso é silencioso.
   ============================================================ */
(function () {
  "use strict";

  var CAPI_BASE = "https://drguilhermeangelo-backend.vercel.app";

  // Modo debug: liga com ?capi_debug=1 na URL, ou localStorage.capi_debug = "1".
  var DEBUG = /[?&]capi_debug=1/.test(location.search) || (function () {
    try { return localStorage.getItem("capi_debug") === "1"; } catch (e) { return false; }
  })();

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

  // Nunca loga PII em texto limpo: name/email/phone viram só um indicador de presença.
  function safeForLog(payload) {
    var out = {};
    for (var k in payload) {
      if (!Object.prototype.hasOwnProperty.call(payload, k)) continue;
      if (k === "name" || k === "email" || k === "phone") {
        out[k] = payload[k] ? "<preenchido>" : "<vazio>";
      } else {
        out[k] = payload[k];
      }
    }
    return out;
  }

  function sendCapi(path, eventName, payload) {
    if (DEBUG) {
      console.log(
        "%c[CAPI] → " + path + " · " + eventName + " · event_id=" + payload.event_id,
        "color:#3b5998;font-weight:bold",
        { enviado: safeForLog(payload) }
      );
    }

    var req;
    try {
      req = fetch(CAPI_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (e) {
      console.error("[CAPI] " + path + " · " + eventName + " — falha ao iniciar o fetch:", e);
      return;
    }

    return req.then(function (res) {
      return res.text().then(function (raw) {
        var body;
        try { body = raw ? JSON.parse(raw) : {}; } catch (e) { body = raw; }

        var ok = res.ok && body && body.events_received >= 1;

        if (!ok) {
          // SEMPRE loga, independente do modo debug.
          console.error(
            "[CAPI] " + path + " · " + eventName + " FALHOU — HTTP " + res.status,
            {
              event_id: payload.event_id,
              status: res.status,
              resposta: body,
              fbtrace_id: (body && body.error && body.error.fbtrace_id) || undefined,
            }
          );
        } else if (DEBUG) {
          console.log(
            "%c[CAPI] " + path + " · " + eventName + " OK ✅",
            "color:#1a7f37;font-weight:bold",
            { event_id: payload.event_id, status: res.status, respostaDoMeta: body }
          );
        }
      });
    }).catch(function (err) {
      // Rede caiu, CORS bloqueou, DNS falhou. SEMPRE loga.
      console.error(
        "[CAPI] " + path + " · " + eventName + " — erro de rede/CORS (a requisição não chegou ao backend):",
        err
      );
    });
  }

  function pixelTrack(eventName, eventId) {
    try {
      if (window.fbq) {
        fbq("track", eventName, {}, { eventID: eventId });
        if (DEBUG) {
          console.log(
            "%c[Pixel] " + eventName + " · eventID=" + eventId,
            "color:#3b5998;font-weight:bold"
          );
        }
      } else {
        console.error(
          "[CAPI] window.fbq indisponível — o Pixel base do <head> não carregou. " +
          "Evento " + eventName + " NÃO foi disparado no navegador (event_id=" + eventId + ")."
        );
      }
    } catch (e) {
      console.error("[CAPI] erro ao disparar " + eventName + " no Pixel do navegador:", e);
    }
  }

  function trackPageView() {
    var eventId = uuid();
    pixelTrack("PageView", eventId);
    sendCapi("/api/pageview", "PageView", {
      event_id: eventId,
      event_source_url: location.href,
      fbp: getCookie("_fbp") || undefined,
      fbc: getFbc() || undefined,
    });
  }

  function trackLead(lead) {
    lead = lead || {};
    var eventId = uuid();
    pixelTrack("CompleteRegistration", eventId);
    sendCapi("/api/lead", "CompleteRegistration", {
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

  if (DEBUG) {
    console.log("%c[CAPI] modo debug LIGADO · backend=" + CAPI_BASE, "color:#b8860b;font-weight:bold");
  }

  // PageView automático no load da página
  trackPageView();
})();
