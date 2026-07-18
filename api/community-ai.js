/**
 * Thin proxy — forwards @rainaai mention events to the Railway bot's
 * /community/ai-reply endpoint which handles OpenAI generation + Supabase write.
 */
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const botUrl = process.env.RAINA_AI_URL;
  if (!botUrl) return res.status(503).json({ error: "RAINA_AI_URL not configured" });

  try {
    const r = await fetch(`${botUrl.replace(/\/$/, "")}/community/ai-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Bot unreachable", detail: err.message });
  }
}
