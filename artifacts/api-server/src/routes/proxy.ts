/**
 * /api/proxy — forwards requests to the Raina AI Railway bot.
 * RAINA_AI_URL env var must point to the Railway deployment, e.g.
 * https://raina-ai-production.up.railway.app
 *
 * Also handles:
 *   /api/price?symbol=BTCUSD — live price (last close from Yahoo Finance 1m)
 *   /api/push/keys            — VAPID public key
 *   /api/push/subscribe       — push subscription registration
 *   /api/community-ai         — Raina AI community replies
 */
import { Router, Request, Response } from "express";

const router = Router();

// ── Live price ────────────────────────────────────────────────────────────────
// Simple proxy: latest close from Yahoo Finance 1m chart
router.get("/price", async (req: Request, res: Response) => {
  const { symbol } = req.query as Record<string, string>;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const upperSym = symbol.toUpperCase();

  // ── Real spot metals (free, keyless) ─────────────────────────────────────
  // Yahoo's GC=F / SI=F are COMEX FUTURES contracts, not spot — futures trade
  // at a premium/discount to spot (contango/backwardation), which is why the
  // homescreen price was showing noticeably higher than a broker's spot XAUUSD
  // quote. xaus.com is a free, no-key spot XAU/XAG feed — use it for metals.
  if (upperSym === "XAUUSD" || upperSym === "XAGUSD" || upperSym === "SILVER") {
    try {
      const r = await fetch("https://xaus.com/api/v1/spot?compact=1", {
        signal: AbortSignal.timeout(8_000),
      });
      if (!r.ok) throw new Error(`xaus.com ${r.status}`);
      const json = await r.json() as any;
      const price = upperSym === "XAUUSD" ? json?.spot_usd_oz : json?.silver_usd_oz;
      if (price == null) throw new Error("no spot price in xaus.com response");
      return res.json({ price, symbol, source: "xaus.com-spot" });
    } catch (err: any) {
      console.warn(`[price] xaus.com spot fetch failed for ${upperSym}, falling back to Yahoo futures: ${err.message}`);
      // fall through to the Yahoo path below as a safety net so the price
      // never just disappears if xaus.com has a hiccup
    }
  }

  // ── Live price (everything else, or metals fallback) ─────────────────────
  // Simple proxy: latest close from Yahoo Finance 1m chart
  let yfSym = upperSym;
  if (yfSym === "BTCUSD") yfSym = "BTC-USD";
  else if (yfSym === "ETHUSD") yfSym = "ETH-USD";
  else if (yfSym === "SOLUSD") yfSym = "SOL-USD";
  else if (yfSym === "BNBUSD") yfSym = "BNB-USD";
  else if (yfSym === "XAUUSD") yfSym = "GC=F";
  else if (yfSym.length === 6 && /^[A-Z]{6}$/.test(yfSym)) yfSym = `${yfSym}=X`;

  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1m&range=1d&includePrePost=false`,
      {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!r.ok) throw new Error(`Yahoo ${r.status}`);
    const json = await r.json() as any;
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const closes = result?.indicators?.quote?.[0]?.close || [];
    // Use the same latest candle close consumed by /api/candles. Yahoo's
    // regularMarketPrice may be delayed or come from a different venue.
    const price = [...closes].reverse().find(v => v != null && isFinite(v))
      ?? meta?.regularMarketPrice ?? meta?.previousClose ?? null;
    if (price == null) throw new Error("no price in response");
    return res.json({ price, symbol });
  } catch (err: any) {
    return res.status(502).json({ error: "price fetch failed", detail: err.message });
  }
});

// ── Push notification keys ────────────────────────────────────────────────────
    // FIX: proxy to Railway's GET /push/keys — Railway is the single source of truth for VAPID keys.
    // Previously this read process.env.VAPID_PUBLIC_KEY locally, which was never set, causing 503.
    router.get("/push/keys", async (_req: Request, res: Response) => {
    const botUrl = process.env.RAINA_AI_URL;
    if (!botUrl) {
      console.error("[push/keys] RAINA_AI_URL not set — cannot fetch VAPID public key from Railway");
      return res.status(503).json({ error: "Push service not configured — set RAINA_AI_URL" });
    }
    try {
      const target = `${botUrl.replace(/\/$/, "")}/push/keys`;
      console.log(`[push/keys] fetching from Railway: ${target}`);
      const r = await fetch(target, { signal: AbortSignal.timeout(8_000) });
      const data = await r.json() as any;
      console.log(`[push/keys] Railway status=${r.status} publicKey.present=${!!data?.publicKey} len=${data?.publicKey?.length ?? 0}`);
      return res.status(r.status).json(data);
    } catch (err: any) {
      console.error(`[push/keys] fetch error: ${err.message}`);
      return res.status(502).json({ error: "Push key fetch failed", detail: err.message });
    }
    });

    // ── Push subscription registration ───────────────────────────────────────────
    router.post("/push/subscribe", async (req: Request, res: Response) => {
    const botUrl = process.env.RAINA_AI_URL;
    const { userId, subscription } = req.body ?? {};
    const endpoint = String(subscription?.endpoint ?? "").slice(0, 60);
    console.log(`[push/subscribe] userId=${userId ?? "(MISSING)"} endpoint=${endpoint}`);

    if (!botUrl) {
      console.error("[push/subscribe] RAINA_AI_URL not set — cannot forward subscription to Railway");
      return res.status(503).json({ error: "RAINA_AI_URL not configured" });
    }
    if (!userId) {
      console.warn("[push/subscribe] WARNING: userId is undefined — subscription will not be linked to any user");
    }
    if (!subscription?.endpoint) {
      console.error("[push/subscribe] subscription.endpoint missing — rejecting invalid payload");
      return res.status(400).json({ error: "subscription.endpoint is required" });
    }

    try {
      const target = `${botUrl.replace(/\/$/, "")}/push/subscribe`;
      console.log(`[push/subscribe] forwarding to Railway: ${target}`);
      const r = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(10_000),
      });
      const data = await r.text();
      console.log(`[push/subscribe] Railway responded ${r.status}: ${data.slice(0, 200)}`);
      return res.status(r.status).send(data);
    } catch (err: any) {
      console.error(`[push/subscribe] fetch error: ${err.message}`);
      return res.status(502).json({ error: "Push subscribe failed", detail: err.message });
    }
    });

    // ── Community AI replies ──────────────────────────────────────────────────────
router.post("/community-ai", async (req: Request, res: Response) => {
  const botUrl = process.env.RAINA_AI_URL;
  if (!botUrl) return res.status(503).json({ error: "RAINA_AI_URL not configured" });

  try {
    const r = await fetch(`${botUrl.replace(/\/$/, "")}/community/ai-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: "Community AI unreachable", detail: err.message });
  }
});

// ── General Raina AI proxy — forward everything else to the Railway bot ───────
// Matches /api/proxy/* and /api/chat, /api/signals/*, etc.
async function forwardToBot(req: Request, res: Response): Promise<void> {
  const botUrl = process.env.RAINA_AI_URL;
  if (!botUrl) {
    res.status(503).json({ error: "RAINA_AI_URL not configured — deploy Raina AI first" });
    return;
  }

  // Strip the /api prefix before forwarding
  const target = `${botUrl.replace(/\/$/, "")}${req.originalUrl.replace(/^\/api/, "")}`;

  try {
    const upstreamRes = await fetch(target, {
      method:  req.method,
      headers: {
        "content-type": req.headers["content-type"] || "application/json",
        accept:          req.headers["accept"]        || "application/json",
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
      signal: AbortSignal.timeout(30_000),
    });

    const text = await upstreamRes.text();
    res.status(upstreamRes.status);
    upstreamRes.headers.forEach((v, k) => {
      if (!["transfer-encoding", "connection"].includes(k)) res.setHeader(k, v);
    });
    res.end(text);
  } catch (err: any) {
    res.status(502).json({ error: "Raina AI unreachable", detail: err.message });
  }
}

// Use router.use() so Express handles sub-paths without needing a wildcard pattern
// (path-to-regexp v8 used by Express 5 rejects /* and (.*) in .all())
router.use("/mt5",     forwardToBot); // Raina AI MT5 account, settings, trades, scalping toggle — added for RainX web integration
router.use("/scan",    forwardToBot); // Raina AI multi-symbol scalp scanner
router.use("/proxy",   forwardToBot);
router.all("/chat",    forwardToBot);
router.use("/signals", forwardToBot);

export default router;
