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
  var current = 0;

  // ---- dots (gerados a partir da quantidade de cards) ----
  var dots = cards.map(function (card, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "carousel__dot";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", "Ir para o depoimento " + (i + 1));
    b.addEventListener("click", function () { goTo(i); });
    dotsWrap.appendChild(b);
    return b;
  });

  function setActive(i) {
    current = i;
    for (var j = 0; j < dots.length; j++) {
      dots[j].setAttribute("aria-current", j === i ? "true" : "false");
    }
    if (prev) prev.disabled = i <= 0;
    if (next) next.disabled = i >= cards.length - 1;
  }

  // rola até centralizar o card i no trilho
  function goTo(i) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    var card = cards[i];
    var left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    track.scrollTo({ left: left, behavior: behavior });
  }

  if (prev) prev.addEventListener("click", function () { goTo(current - 1); });
  if (next) next.addEventListener("click", function () { goTo(current + 1); });

  // setas do teclado quando o trilho está focado
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
  });

  // ---- sincroniza dots/estado com a posição do scroll ----
  if ("IntersectionObserver" in window) {
    var ratios = new Array(cards.length).fill(0);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var idx = cards.indexOf(en.target);
        if (idx > -1) ratios[idx] = en.intersectionRatio;
      });
      var maxIdx = 0, maxR = -1;
      for (var k = 0; k < ratios.length; k++) {
        if (ratios[k] > maxR) { maxR = ratios[k]; maxIdx = k; }
      }
      setActive(maxIdx);
    }, { root: track, threshold: [0, 0.25, 0.5, 0.75, 1] });
    cards.forEach(function (c) { io.observe(c); });
  } else {
    setActive(0);
  }

  // ---- arraste com mouse (touch usa o scroll nativo) ----
  var isDown = false, startX = 0, startScroll = 0, moved = false;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") return;
    isDown = true; moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    track.style.scrollSnapType = "none";
    track.style.cursor = "grabbing";
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
    track.style.cursor = "";
    track.style.scrollSnapType = "";
    goTo(current); // reengata o snap no card mais próximo
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("pointerleave", endDrag);
  // evita que o "soltar" após arrastar dispare cliques indesejados
  track.addEventListener("click", function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  setActive(0);
})();
