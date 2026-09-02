// Endpoint: POST /api/lead
// Envia o evento "CompleteRegistration" (registro concluído) para a CAPI,
// com os dados do lead hasheados server-side (email, telefone, nome).
//
// LOGS: nunca registram e-mail, telefone ou nome em texto limpo — apenas
// flags de presença e, quando útil, o prefixo do hash já calculado.
import { applyCors, clientIp, readJson, sendToMeta, sha256, hashPhone, newEventId, logMetaResult } from "../lib/capi.js";

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = await readJson(req);

  const userData = {
    client_ip_address: clientIp(req),
    client_user_agent: req.headers["user-agent"],
  };
  if (body.email) userData.em = [sha256(body.email)];
  if (body.phone) userData.ph = [hashPhone(body.phone)];
  if (body.name) {
    const parts = String(body.name).trim().split(/\s+/).filter(Boolean);
    if (parts[0]) userData.fn = [sha256(parts[0])];
    if (parts.length > 1) userData.ln = [sha256(parts[parts.length - 1])];
  }
  if (body.fbp) userData.fbp = body.fbp;
  if (body.fbc) userData.fbc = body.fbc;

  const eventData = {
    event_name: "CompleteRegistration",
    event_time: Math.floor(Date.now() / 1000),
    event_id: body.event_id || newEventId(),
    event_source_url: body.event_source_url,
  };

  console.log("[CAPI] recebido /api/lead", {
    event_name: eventData.event_name,
    event_id: eventData.event_id,
    event_id_do_cliente: Boolean(body.event_id), // false = dedupe com o Pixel vai falhar
    event_source_url: eventData.event_source_url,
    origin: req.headers.origin,
    // Só presença/hash — nunca o valor original.
    tem_em: Boolean(userData.em),
    tem_ph: Boolean(userData.ph),
    tem_fn: Boolean(userData.fn),
    tem_ln: Boolean(userData.ln),
    tem_fbp: Boolean(userData.fbp),
    tem_fbc: Boolean(userData.fbc),
    em_hash_prefixo: userData.em ? userData.em[0].slice(0, 8) : undefined,
    ph_hash_prefixo: userData.ph ? userData.ph[0].slice(0, 8) : undefined,
  });

  try {
    const r = await sendToMeta(userData, eventData);
    logMetaResult(eventData.event_name, eventData.event_id, r);
    return res.status(r.ok ? 200 : 502).json(r.json);
  } catch (e) {
    console.error("[CAPI] /api/lead falhou antes de chegar ao Meta", {
      event_id: eventData.event_id,
      erro: String(e && e.message ? e.message : e),
      stack: e && e.stack,
    });
    return res.status(500).json({ error: String(e.message || e) });
  }
}
