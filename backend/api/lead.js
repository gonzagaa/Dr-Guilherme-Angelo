// Endpoint: POST /api/lead
// Envia o evento "CompleteRegistration" (registro concluído) para a CAPI,
// com os dados do lead hasheados server-side (email, telefone, nome).
import { applyCors, clientIp, readJson, sendToMeta, sha256, hashPhone, newEventId } from "../lib/capi.js";

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

  try {
    const r = await sendToMeta(userData, eventData);
    return res.status(r.ok ? 200 : 502).json(r.json);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
