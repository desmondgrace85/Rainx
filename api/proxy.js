/**
 * Vercel serverless proxy — forwards /api/* requests to the Raina AI Railway bot.
 * Set RAINA_AI_URL in Vercel Environment Variables to your Railway bot URL,
 * e.g. https://raina-ai-production.up.railway.app
 */
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const botUrl = process.env.RAINA_AI_URL;
  if (!botUrl) {
    return res.status(503).json({ error: "RAINA_AI_URL not configured" });
  }

  // Reconstruct the path — strip leading /api/proxy, keep everything after
  const target = `${botUrl.replace(/\/$/, "")}${req.url}`;

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        "content-type": req.headers["content-type"] || "application/json",
        "accept": req.headers["accept"] || "application/json",
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
    });

    const data = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (!["transfer-encoding", "connection"].includes(k)) res.setHeader(k, v);
    });
    res.end(data);
  } catch (err) {
    res.status(502).json({ error: "Bot unreachable", detail: err.message });
  }
}
