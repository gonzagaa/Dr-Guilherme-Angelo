// ============================================================
// Helper da Conversions API (CAPI) do Meta/Facebook
// Sem dependências externas: usa fetch nativo + node:crypto.
// ============================================================
import crypto from "node:crypto";

const GRAPH_VERSION = "v21.0";

// Remove acentos/diacríticos: "Ângelo" → "angelo".
// O Meta normaliza assim antes de hashear; se não fizermos igual, o hash
// nunca bate e a correspondência (match quality) cai.
function stripDiacritics(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// SHA-256 de um valor "normalizado" (trim + lowercase + sem acentos),
// como o Meta exige. Usado em em / fn / ln.
//
// Exemplos:
//   sha256("  Guilherme ")     → hash de "guilherme"
//   sha256("Ângelo")           → hash de "angelo"
//   sha256("MARIA@Exemplo.COM")→ hash de "maria@exemplo.com"
export function sha256(value) {
  if (value == null) return undefined;
  const norm = stripDiacritics(String(value).trim().toLowerCase());
  if (!norm) return undefined;
  return crypto.createHash("sha256").update(norm).digest("hex");
}

// Telefone → E.164 sem "+", como o Meta espera (DDI + DDD + número).
// Se vier no padrão brasileiro sem DDI (10 dígitos fixo, 11 celular),
// prefixa 55. Se já vier com 55 e 12-13 dígitos, mantém.
//
// Casos cobertos:
//   "62998139185"        → 11 dígitos, sem DDI  → "5562998139185"
//   "5562998139185"      → 13 dígitos, com 55   → "5562998139185" (inalterado)
//   "(62) 99813-9185"    → dígitos "62998139185" → "5562998139185"
//   "+55 62 99813-9185"  → dígitos "5562998139185" → "5562998139185" (inalterado)
//   "6232811234"         → 10 dígitos, fixo BR   → "556232811234"
//   "12025550123"        → 11 dígitos → "5512025550123" (ver ressalva abaixo)
//
// Ressalva conhecida: um número estrangeiro de 10-11 dígitos digitado sem DDI
// é indistinguível de um brasileiro sem DDI. Como o formulário é BR-only,
// assumimos 55. Números internacionais devem ser digitados com o DDI.
export function normalizePhone(value) {
  if (value == null) return undefined;
  const digits = String(value).replace(/\D+/g, "");
  if (!digits) return undefined;

  // Já tem DDI 55 e comprimento válido (55 + 10 ou 11) → não mexe.
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Padrão BR sem DDI: 10 (fixo) ou 11 (celular com 9) → prefixa 55.
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }

  // Qualquer outro comprimento: já traz algum DDI (ou é inválido).
  // Mandamos como está — o Meta descarta silenciosamente o que não casa.
  return digits;
}

// Telefone: normaliza para E.164 sem "+", depois hash.
export function hashPhone(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return undefined;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function newEventId() {
  return crypto.randomUUID();
}

// IP real do visitante (Vercel passa em x-forwarded-for).
export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.socket && req.socket.remoteAddress;
}

// CORS — libera só as origens configuradas em ALLOWED_ORIGINS (lista separada por vírgula).
// Se não configurar, cai em "*" (funciona, mas menos seguro).
export function applyCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || "*")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  let allowOrigin = "*";
  if (!allowed.includes("*")) {
    if (allowed.includes(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = allowed[0] || "";
      // Origem não permitida: o navegador vai bloquear a resposta e a chamada
      // "some" sem deixar rastro no cliente. Deixa rastro AQUI.
      console.error(
        "[CAPI] CORS: origem não permitida — o navegador vai bloquear esta resposta.",
        { origin_recebida: origin, ALLOWED_ORIGINS: allowed }
      );
    }
  } else if (origin) {
    allowOrigin = origin; // reflete a origem
  }
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Lê o corpo JSON de forma robusta (com ou sem parse automático do Vercel).
export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

// Envia um evento para a CAPI do Meta.
export async function sendToMeta(userData, eventData) {
  const pixelId = process.env.FB_PIXEL_ID;
  const token = process.env.FB_CAPI_TOKEN;
  if (!pixelId || !token) {
    console.error(
      "[CAPI] CONFIG AUSENTE — variáveis de ambiente não configuradas na Vercel.",
      {
        FB_PIXEL_ID: pixelId ? "definida" : "AUSENTE",
        FB_CAPI_TOKEN: token ? "definida" : "AUSENTE",
        evento: eventData && eventData.event_name,
      }
    );
    throw new Error("FB_PIXEL_ID e/ou FB_CAPI_TOKEN não configurados nas variáveis de ambiente");
  }

  const body = {
    data: [{
      action_source: "website",
      ...eventData,
      user_data: userData,
    }],
  };
  if (process.env.FB_TEST_EVENT_CODE) {
    body.test_event_code = process.env.FB_TEST_EVENT_CODE;
    console.log(
      "[CAPI] ATENÇÃO: FB_TEST_EVENT_CODE está setado — este evento vai para " +
      "'Testar eventos' e NÃO aparece na visão de produção do Events Manager.",
      { event_name: eventData && eventData.event_name }
    );
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json };
}

// Log padronizado da resposta do Meta. Nunca recebe PII: só hashes/flags.
export function logMetaResult(eventName, eventId, result) {
  const { ok, status, json } = result;
  const received = json && json.events_received;

  if (!ok || !(received >= 1)) {
    const err = (json && json.error) || {};
    console.error(`[CAPI] ${eventName} RECUSADO pelo Meta — HTTP ${status}`, {
      event_id: eventId,
      fbtrace_id: err.fbtrace_id,
      error_message: err.message,
      error_type: err.type,
      error_code: err.code,
      error_subcode: err.error_subcode,
      error_user_msg: err.error_user_msg,
      resposta_completa: json,
    });
    return;
  }

  console.log(`[CAPI] ${eventName} aceito pelo Meta`, {
    event_id: eventId,
    events_received: received,
    fbtrace_id: json && json.fbtrace_id,
    messages: json && json.messages,
  });
}
