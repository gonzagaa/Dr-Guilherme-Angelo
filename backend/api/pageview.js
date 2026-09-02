// Endpoint: POST /api/pageview
// Envia o evento "PageView" para a CAPI (server-side).
//
// LOGS: este endpoint não recebe PII — só cookies do pixel, IP e UA.
import { applyCors, clientIp, readJson, sendToMeta, newEventId, logMetaResult } from "../lib/capi.js";

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = await readJson(req);

  const userData = {
    client_ip_address: clientIp(req),
    client_user_agent: req.headers["user-agent"],
  };
  // cookies do pixel (se existirem no navegador) melhoram muito a correspondência
  if (body.fbp) userData.fbp = body.fbp;
  if (body.fbc) userData.fbc = body.fbc;

  const eventData = {
    event_name: "PageView",
    event_time: Math.floor(Date.now() / 1000),
    event_id: body.event_id || newEventId(),
    event_source_url: body.event_source_url,
  };

  console.log("[CAPI] recebido /api/pageview", {
    event_name: eventData.event_name,
    event_id: eventData.event_id,
    event_id_do_cliente: Boolean(body.event_id), // false = dedupe com o Pixel vai falhar
    event_source_url: eventData.event_source_url,
    origin: req.headers.origin,
    tem_fbp: Boolean(userData.fbp),
    tem_fbc: Boolean(userData.fbc),
  });

  try {
    const r = await sendToMeta(userData, eventData);
    logMetaResult(eventData.event_name, eventData.event_id, r);
    return res.status(r.ok ? 200 : 502).json(r.json);
  } catch (e) {
    console.error("[CAPI] /api/pageview falhou antes de chegar ao Meta", {
      event_id: eventData.event_id,
      erro: String(e && e.message ? e.message : e),
      stack: e && e.stack,
    });
    return res.status(500).json({ error: String(e.message || e) });
  }
}
