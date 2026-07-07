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
