/* /form/formulario.js
   White-label: você hospeda no site do cliente e só muda data-* no script.
*/
(function () {
  // =========================
  // Helpers
  // =========================
  function pickDataset() {
    // Melhor caso: o script atual
    const s = document.currentScript;
    if (s && s.dataset) return s.dataset;

    // Fallback: pega o último script com data-client-id
    const all = Array.from(document.querySelectorAll("script[data-client-id]"));
    const last = all[all.length - 1];
    return (last && last.dataset) || {};
  }

  function getUtm() {
    const p = new URLSearchParams(window.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const out = {};
    keys.forEach((k) => {
      const v = p.get(k);
      if (v) out[k] = v;
    });
    return out;
  }

  function normalizePhone(phone) {
    if (!phone) return "";
    return String(phone).replace(/\D+/g, "");
  }

  function isValidEmail(email) {
    if (!email) return false;
    const s = String(email).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function normalizeUrl(input) {
    if (!input) return "";
    const raw = String(input).trim();
    if (!raw) return "";

    // Se vier sem http/https, não aceita (pra evitar redirect bugado)
    if (!/^https?:\/\//i.test(raw)) return "";
    return raw;
  }

  function log(debug, ...args) {
    if (debug) console.log("[LB FORM]", ...args);
  }
  function warn(debug, ...args) {
    if (debug) console.warn("[LB FORM]", ...args);
  }
  function errlog(debug, ...args) {
    if (debug) console.error("[LB FORM]", ...args);
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function sendLead({ api, payload, debug }) {
    const res = await fetch(api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(res);
    log(debug, "HTTP", res.status, data);

    // Edge pode retornar 200 ok:false (tratado) ou 201 ok:true
    if (!res.ok) {
      const msg = data?.message || data?.error || "Erro ao enviar lead";
      const hint = data?.hint ? ` (${data.hint})` : "";
      throw new Error(msg + hint);
    }

    if (data && data.ok === false) {
      const msg = data?.message || "Erro ao enviar lead";
      const hint = data?.hint ? ` (${data.hint})` : "";
      throw new Error(msg + hint);
    }

    return data;
  }

  function createToast() {
    const el = document.createElement("div");
    el.className = "lb-toast";
    el.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:24px",
      "transform:translateX(-50%)",
      "z-index:999999",
      "max-width:min(560px,calc(100vw - 32px))",
      "padding:12px 14px",
      "border-radius:14px",
      "background:rgba(0,0,0,.85)",
      "color:#fff",
      "font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif",
      "font-size:14px",
      "line-height:1.35",
      "box-shadow:0 12px 30px rgba(0,0,0,.3)",
      "opacity:0",
      "pointer-events:none",
      "transition:opacity .2s ease, transform .2s ease",
    ].join(";");
    document.body.appendChild(el);

    let t = null;
    return {
      show(msg, type) {
        el.textContent = msg;
        if (type === "error") el.style.background = "rgba(176,0,3,.92)";
        if (type === "success") el.style.background = "rgba(0,0,0,.85)";
        el.style.opacity = "1";
        el.style.transform = "translateX(-50%) translateY(-6px)";
        clearTimeout(t);
        t = setTimeout(() => {
          el.style.opacity = "0";
          el.style.transform = "translateX(-50%)";
        }, 3200);
      },
    };
  }

  // =========================
  // Modal injection (se quiser usar o modal)
  // =========================
  function injectModalOnce() {
    if (document.querySelector(".form-modal")) return;

    const modalHTML = `
      <div class="form-modal white" aria-hidden="true">
        <div class="form-overlay" aria-hidden="true"></div>

        <div class="form-container" role="dialog" aria-modal="true" aria-label="Formulário">
          <div class="head">
            <h2>Preencha seus dados</h2>
            <span class="form-fechar" role="button" tabindex="0" aria-label="Fechar formulário">&times;</span>
          </div>

          <form id="formLead" autocomplete="on">
            <input type="text" name="nome" placeholder="Seu nome" required />
            <input type="email" name="email" placeholder="Seu e-mail" required />
            <input type="tel" name="telefone" placeholder="Seu WhatsApp" required />

            <div class="button">
              <button class="appLocalLead whatsapp-submit" type="submit">
                <span class="wa-btn-text">Continuar no WhatsApp</span>

                <span class="wa-btn-icon" aria-hidden="true">
                  <svg viewBox="0 0 32 32" class="wa-icon" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#fff" d="M19.11 17.27c-.27-.14-1.58-.78-1.83-.87-.24-.09-.42-.14-.6.14-.18.27-.69.87-.84 1.05-.16.18-.31.2-.58.07-.27-.14-1.12-.41-2.13-1.31-.79-.7-1.32-1.57-1.47-1.83-.16-.27-.02-.41.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.14-.6-1.45-.82-1.98-.22-.53-.44-.46-.6-.47h-.51c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.31.96 2.58 1.09 2.76.13.18 1.88 2.86 4.56 4.01.64.28 1.14.44 1.53.57.64.2 1.22.17 1.68.1.51-.08 1.58-.64 1.8-1.26.22-.62.22-1.15.16-1.26-.07-.11-.24-.18-.51-.31Z"/>
                    <path fill="#fff" d="M16.03 3.2c-6.99 0-12.66 5.66-12.66 12.64 0 2.23.58 4.4 1.68 6.31L3.2 28.8l6.82-1.79a12.7 12.7 0 0 0 6 1.53h.01c6.98 0 12.66-5.67 12.66-12.65 0-3.38-1.32-6.56-3.71-8.95A12.55 12.55 0 0 0 16.03 3.2Zm0 23.2h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.05 1.06 1.08-3.95-.25-.4a10.53 10.53 0 0 1-1.62-5.57c0-5.82 4.75-10.56 10.59-10.56 2.82 0 5.47 1.09 7.46 3.09a10.47 10.47 0 0 1 3.1 7.47c0 5.83-4.75 10.57-10.6 10.57Z"/>
                  </svg>
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  // =========================
  // Setup events
  // =========================
  function setup() {
    const ds = pickDataset();

    const clientId = ds.clientId || "";
    const embedKey = ds.embedKey || "";
    const api = ds.api || "";
    const debug = ds.debug === "true";

    // NOVO: redirect genérico
    const redirectUrl = normalizeUrl(ds.redirect || "");

    log(debug, "dataset:", {
      clientId,
      embedKey: embedKey ? "OK" : "",
      api,
      redirect: redirectUrl ? "OK" : "",
    });

    if (!clientId || !embedKey || !api) {
      warn(
        debug,
        "Faltando data-client-id / data-embed-key / data-api no <script> do formulário."
      );
    }

    if (ds.redirect && !redirectUrl) {
      warn(debug, "data-redirect foi informado mas é inválido (precisa começar com http/https).");
    }

    const toast = createToast();

    // Injeta modal se existir botão .abrir-formulario (pra não poluir LPs que não usem modal)
    const hasOpenBtn = document.querySelector(".abrir-formulario");
    if (hasOpenBtn) injectModalOnce();

    const modal = document.querySelector(".form-modal");
    const overlay = document.querySelector(".form-overlay");
    const closeBtn = document.querySelector(".form-fechar");
    const modalForm = document.querySelector("#formLead");

    function openModal() {
      if (!modal) return;
      modal.classList.add("visivel");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove("visivel");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    // Abre modal via botões
    document.querySelectorAll(".abrir-formulario").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openModal();
      });
    });

    // Fecha modal
    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
      closeBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") closeModal();
      });
    }
    if (overlay) overlay.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && modal.classList.contains("visivel")) closeModal();
    });

    function setSubmitting(formEl, value) {
      const btns = Array.from(formEl.querySelectorAll("button[type='submit']"));
      btns.forEach((b) => (b.disabled = value));
    }

    async function handleSubmit(formEl, mapFields) {
      setSubmitting(formEl, true);

      try {
        const raw = mapFields(formEl);
        const name = String(raw.name || "").trim();
        const email = String(raw.email || "").trim();
        const phone = normalizePhone(raw.phone || "");

        if (!name) {
          toast.show("Informe seu nome.", "error");
          return;
        }
        if (email && !isValidEmail(email)) {
          toast.show("Digite um e-mail válido.", "error");
          return;
        }
        if (!email && !phone) {
          toast.show("Informe e-mail ou WhatsApp.", "error");
          return;
        }

        if (!clientId || !embedKey || !api) {
          toast.show("Formulário não configurado (dados do script faltando).", "error");
          errlog(debug, "Missing config:", { clientId, embedKey, api });
          return;
        }

        const payload = {
          clientId,
          embedKey,
          name,
          email: email || undefined,
          phone: phone || undefined,
          pageUrl: window.location.href,
          referrer: document.referrer || undefined,
          utm: getUtm(),
        };

        log(debug, "payload:", payload);

        await sendLead({ api, payload, debug });

        toast.show("Enviado com sucesso! ✅", "success");
        formEl.reset();

        // Redireciona para URL genérica (se configurada)
        if (redirectUrl) {
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 450);
          return;
        }

        // Se for modal e não tiver redirect, fecha
        if (formEl === modalForm) closeModal();
      } catch (e) {
        errlog(debug, e);
        toast.show(e?.message || "Erro ao enviar. Tente novamente.", "error");
      } finally {
        setSubmitting(formEl, false);
      }
    }

    // Modal form (se existir)
    if (modalForm) {
      modalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSubmit(modalForm, (f) => ({
          name: f.querySelector('[name="nome"]')?.value,
          email: f.querySelector('[name="email"]')?.value,
          phone: f.querySelector('[name="telefone"]')?.value,
        }));
      });
    }

    // Forms inline (se existir)
    document.querySelectorAll("form.lb-lead-form").forEach((f) => {
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSubmit(f, (formEl) => ({
          name: formEl.querySelector('[name="name"]')?.value,
          email: formEl.querySelector('[name="email"]')?.value,
          phone: formEl.querySelector('[name="phone"]')?.value,
        }));
      });
    });

    // Se não existir modal nem form inline, avisa no debug
    if (debug) {
      const hasInline = document.querySelector("form.lb-lead-form");
      const hasModalForm = document.querySelector("#formLead");
      if (!hasInline && !hasModalForm) {
        warn(
          debug,
          "Nenhum form encontrado. Use botões .abrir-formulario (modal) ou um <form class='lb-lead-form'> (inline)."
        );
      }
    }

    log(debug, "setup ok");
  }

  function init() {
    setup();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
