/* ============================================================
   Dr. Guilherme Ângelo · LP Endometriose
   ------------------------------------------------------------
   LINK_CTA: destino único de TODOS os botões da página.
   Para trocar o canal de agendamento, altere APENAS esta linha.
   ============================================================ */

const LINK_CTA = "https://wa.me/5562998139185?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20consulta%20sobre%20endometriose%20com%20o%20Dr.%20Guilherme%20%C3%82ngelo.";

(function () {
  "use strict";

  // Aplica o destino em todos os CTAs marcados com [data-cta]
  document.querySelectorAll("[data-cta]").forEach(function (el) {
    el.setAttribute("href", LINK_CTA);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });

  // Animações de entrada discretas, respeitando prefers-reduced-motion
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealables = document.querySelectorAll(".reveal");

  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  const observer = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  revealables.forEach(function (el) { observer.observe(el); });
})();

/* ============================================================
   Carrossel de depoimentos (feito à mão, sem biblioteca)
   ============================================================ */
(function () {
  "use strict";

  var carousel = document.querySelector(".carousel");
  if (!carousel) return;

  var track = carousel.querySelector(".carousel__track");
  var cards = Array.prototype.slice.call(carousel.querySelectorAll(".carousel__card"));
  var prev = carousel.querySelector(".carousel__arrow--prev");
  var next = carousel.querySelector(".carousel__arrow--next");
  var dotsWrap = carousel.querySelector(".carousel__dots");
  if (!track || !cards.length) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var behavior = reduce ? "auto" : "smooth";

  // ---- passo calculado a partir do DOM (largura do card + gap real) ----
  function gap() {
    var cs = getComputedStyle(track);
    return parseFloat(cs.columnGap || cs.gap) || 0;
  }
  function step() {
    return cards[0].getBoundingClientRect().width + gap();
  }

  // ---- navegação por scrollBy (robusta, sem índice manual) ----
  function scrollByStep(dir) {
    track.scrollBy({ left: dir * step(), behavior: behavior });
  }
  if (prev) prev.addEventListener("click", function () { scrollByStep(-1); });
  if (next) next.addEventListener("click", function () { scrollByStep(1); });

  // setas do teclado quando o trilho está focado
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); scrollByStep(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); scrollByStep(-1); }
  });

  // ---- habilita/desabilita as setas pela posição do scroll ----
  function updateArrows() {
    var max = track.scrollWidth - track.clientWidth - 1;
    if (prev) prev.disabled = track.scrollLeft <= 0;
    if (next) next.disabled = track.scrollLeft >= max;
  }
  track.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  updateArrows();

  // ---- dots ----
  var dots = cards.map(function (card, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "carousel__dot";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", "Ir para o depoimento " + (i + 1));
    b.addEventListener("click", function () {
      card.scrollIntoView({ behavior: behavior, inline: "center", block: "nearest" });
    });
    dotsWrap.appendChild(b);
    return b;
  });
  function setActive(i) {
    for (var j = 0; j < dots.length; j++) {
      dots[j].setAttribute("aria-current", j === i ? "true" : "false");
    }
  }
  setActive(0);

  // ---- sincroniza dots com o scroll (IntersectionObserver, threshold ~0.6) ----
  if ("IntersectionObserver" in window) {
    var ratios = new Array(cards.length).fill(0);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var idx = cards.indexOf(en.target);
        if (idx > -1) ratios[idx] = en.intersectionRatio;
      });
      var best = 0, bestR = -1;
      for (var k = 0; k < ratios.length; k++) {
        if (ratios[k] > bestR + 0.001) { bestR = ratios[k]; best = k; }
      }
      if (bestR >= 0.6) setActive(best);
    }, { root: track, threshold: [0, 0.6, 1] });
    cards.forEach(function (c) { io.observe(c); });
  }

  // ---- arraste com mouse (touch usa o scroll nativo) ----
  var isDown = false, startX = 0, startScroll = 0, moved = false;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") return;
    isDown = true; moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    track.classList.add("is-dragging");
  });
  track.addEventListener("pointermove", function (e) {
    if (!isDown) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    track.scrollLeft = startScroll - dx;
  });
  function endDrag() {
    if (!isDown) return;
    isDown = false;
    track.classList.remove("is-dragging"); // reengata o snap nativo
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("pointerleave", endDrag);
  // evita que o "soltar" após arrastar dispare cliques indesejados
  track.addEventListener("click", function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();

/* ============================================================
   Facade do Google Maps — carrega o iframe só após o clique
   (evita ~500KB de terceiros no primeiro paint)
   ============================================================ */
(function () {
  "use strict";
  var facades = document.querySelectorAll(".map__facade");
  facades.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var src = btn.getAttribute("data-map-src");
      if (!src) return;
      var iframe = document.createElement("iframe");
      iframe.title = "Mapa da Clínica Presence — R. T-44, 300, Setor Bueno, Goiânia";
      iframe.src = src;
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.allowFullscreen = true;
      var parent = btn.parentNode;
      parent.replaceChild(iframe, btn);
    }, { once: true });
  });
})();

/* ============================================================
   Meta Pixel (navegador) + Conversions API (servidor) — desduplicados
   Dispara PageView no load e CompleteRegistration (via __capiLead) TANTO
   no Pixel quanto na CAPI, com o MESMO event_id, pro Meta desduplicar
   (é isso que faz a "Cobertura de eventos" subir).
   ⚠️ O Pixel PRECISA sair do GTM — senão o GTM dispara um PageView próprio,
      sem o mesmo event_id, e a cobertura não sobe.
   O backend/CAPI fica no Vercel; o token vive lá, nunca aqui.
   ============================================================ */
(function () {
  "use strict";

  var CAPI_BASE = "https://drguilhermeangelo-backend.vercel.app";
  var PIXEL_ID = "1076135168411053";

  // Modo debug: liga com ?capi_debug=1 na URL, ou localStorage.capi_debug = "1".
  // Com ele, cada evento loga no console o que foi enviado + a resposta do Meta.
  var DEBUG = /[?&]capi_debug=1/.test(location.search) || (function () {
    try { return localStorage.getItem("capi_debug") === "1"; } catch (e) { return false; }
  })();

  // ---- Pixel do Meta (navegador), carregado AQUI e SEM PageView automático ----
  // O PageView é disparado mais abaixo, com o mesmo event_id que vai pra CAPI.
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0";
    n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", PIXEL_ID);

  function getCookie(name) {
    var m = document.cookie.match("(^|; )" + name + "=([^;]+)");
    return m ? decodeURIComponent(m[2]) : null;
  }
  function setCookie(name, value) {
    var d = new Date();
    d.setTime(d.getTime() + 90 * 864e5); // 90 dias
    document.cookie = name + "=" + value + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }
  function rand() {
    return "" + Math.floor(Math.random() * 1e10) + Math.floor(Math.random() * 1e10);
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // _fbp: gera no formato do Meta se ainda não existir
  var fbp = getCookie("_fbp");
  if (!fbp) { fbp = "fb.1." + Date.now() + "." + rand(); setCookie("_fbp", fbp); }

  // _fbc: deriva do fbclid da URL (clique de anúncio), se houver
  var fbc = getCookie("_fbc");
  try {
    var fbclid = new URLSearchParams(location.search).get("fbclid");
    if (!fbc && fbclid) { fbc = "fb.1." + Date.now() + "." + fbclid; setCookie("_fbc", fbc); }
  } catch (e) {}

  // dispara o MESMO evento no Pixel do navegador, com o MESMO event_id → desduplicação
  function pixelTrack(name, evId, custom) {
    try {
      if (window.fbq) fbq("track", name, custom || {}, { eventID: evId });
      if (DEBUG) console.log("%c[Pixel] " + name + " · eventID=" + evId, "color:#3b5998;font-weight:bold");
    } catch (e) {}
  }

  function baseBody(evId, extra) {
    var body = { event_source_url: location.href, event_id: evId };
    if (fbp) body.fbp = fbp;
    if (fbc) body.fbc = fbc;
    if (extra) { for (var k in extra) { if (extra[k] != null) body[k] = extra[k]; } }
    return body;
  }
  function send(path, body) {
    try {
      var p = fetch(CAPI_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
      if (DEBUG) {
        p.then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            var ok = r.ok && j && j.events_received >= 1;
            console.log("%c[CAPI] " + path + " → " + (ok ? "OK ✅" : "FALHOU ❌"),
              "color:" + (ok ? "#1a7f37" : "#b00020") + ";font-weight:bold",
              { enviado: body, status: r.status, respostaDoMeta: j });
          });
        }).catch(function (err) {
          console.warn("[CAPI] " + path + " erro de rede/CORS:", err);
        });
      } else {
        p.catch(function () {});
      }
    } catch (e) { if (DEBUG) console.warn("[CAPI] erro:", e); }
  }

  // PageView — navegador (Pixel) + servidor (CAPI) com o MESMO event_id
  var pvId = uuid();
  pixelTrack("PageView", pvId);
  send("/api/pageview", baseBody(pvId));

  // Registro concluído — chamado pelo formulário no sucesso do envio
  window.__capiLead = function (data) {
    data = data || {};
    var leadId = uuid();
    pixelTrack("CompleteRegistration", leadId);
    send("/api/lead", baseBody(leadId, { name: data.name, email: data.email, phone: data.phone }));
  };
})();
