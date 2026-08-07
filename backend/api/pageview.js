// Endpoint: POST /api/pageview
// Envia o evento "PageView" para a CAPI (server-side).
import { applyCors, clientIp, readJson, sendToMeta, newEventId } from "../lib/capi.js";

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

  try {
    const r = await sendToMeta(userData, eventData);
    return res.status(r.ok ? 200 : 502).json(r.json);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
