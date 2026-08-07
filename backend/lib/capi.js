// ============================================================
// Helper da Conversions API (CAPI) do Meta/Facebook
// Sem dependências externas: usa fetch nativo + node:crypto.
// ============================================================
import crypto from "node:crypto";

const GRAPH_VERSION = "v21.0";

// SHA-256 de um valor "normalizado" (trim + lowercase), como o Meta exige.
export function sha256(value) {
  if (value == null) return undefined;
  const norm = String(value).trim().toLowerCase();
  if (!norm) return undefined;
  return crypto.createHash("sha256").update(norm).digest("hex");
}

// Telefone: só dígitos (com DDI), depois hash.
export function hashPhone(value) {
  if (value == null) return undefined;
  const digits = String(value).replace(/\D+/g, "");
  if (!digits) return undefined;
  return crypto.createHash("sha256").update(digits).digest("hex");
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
    allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || "");
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
