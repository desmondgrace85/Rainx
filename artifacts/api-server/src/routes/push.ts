/**
 * /api/push — Web Push notification endpoints
 *
 * GET  /api/push/keys       → returns VAPID public key for browser subscription
 * POST /api/push/subscribe  → stores/updates a push subscription for a user
 * POST /api/push/send       → (internal) send a push notification to a user
 *
 * ── Source of truth ──────────────────────────────────────────────────────────
 * The Raina AI Railway bot (`RAINA_AI_URL`) owns the VAPID keypair AND the
 * `push_subscriptions` table. Browsers subscribe through `/api/push/subscribe`
 * which is proxied to Railway, so the subscription rows live there — not here.
 *
 * Therefore `/api/push/send` MUST also be proxied to Railway; otherwise the
 * Express deployment would try to send via a local VAPID keypair that is never
 * configured and a local `push_subscriptions` table that is never populated,
 * causing every send to return 503 and NO push to ever reach a closed/offline
 * app. (The Vercel deployment already rewrites `/api/push/:path*` → Railway in
 * vercel.json; this makes the Express/Replit deployment behave identically.)
 *
 * The local web-push path below is kept ONLY as a self-contained fallback for
 * environments that explicitly configure local VAPID keys AND intentionally do
 * NOT point at Railway. In normal production `RAINA_AI_URL` is set, so the
 * proxy path is used.
 */
import { Router, Request, Response } from "express";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fsndqkacfizulovhfldz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@rainx.app";
const RAINA_AI_URL = process.env.RAINA_AI_URL || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const db = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

/** True when this server should defer push delivery to the Railway bot. */
const USE_RAILWAY_PUSH = !!RAINA_AI_URL;

/** Base URL of the Railway bot, with no trailing slash. */
const railwayBase = RAINA_AI_URL.replace(/\/$/, "");

// GET /api/push/keys → return VAPID public key
router.get("/push/keys", async (_req: Request, res: Response) => {
  // Railway is the single source of truth for the VAPID public key.
  if (USE_RAILWAY_PUSH) {
    try {
      const r = await fetch(`${railwayBase}/push/keys`, { signal: AbortSignal.timeout(8_000) });
      const data = await r.json() as any;
      return res.status(r.status).json(data);
    } catch (err: any) {
      console.error(`[push/keys] Railway fetch failed: ${err.message}`);
      return res.status(502).json({ error: "Push key fetch failed", detail: err.message });
    }
  }
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: "Push notifications not configured" });
  }
  return res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe → save subscription (proxied to Railway when configured)
router.post("/push/subscribe", async (req: Request, res: Response) => {
  if (USE_RAILWAY_PUSH) {
    try {
      const r = await fetch(`${railwayBase}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(10_000),
      });
      const text = await r.text();
      return res.status(r.status).send(text);
    } catch (err: any) {
      console.error(`[push/subscribe] Railway forward failed: ${err.message}`);
      return res.status(502).json({ error: "Push subscribe failed", detail: err.message });
    }
  }
  const { subscription, userId } = req.body;
  if (!subscription || !userId) {
    return res.status(400).json({ error: "subscription and userId required" });
  }
  if (db) {
    await db
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          subscription: JSON.stringify(subscription),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" }
      )
      .then(() => {}, () => {});
  }
  return res.json({ ok: true });
});

// POST /api/push/native/register → register an Android/iOS FCM token with Railway.
router.post("/push/native/register", async (req: Request, res: Response) => {
  if (USE_RAILWAY_PUSH) {
    try {
      const r = await fetch(`${railwayBase}/push/native/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(15_000),
      });
      const text = await r.text();
      try {
        const json = JSON.parse(text);
        if (r.ok && db) {
          const userId = String(req.body?.userId || "");
          if (userId) {
            await db.from("push_subscriptions").delete().eq("user_id", userId).then(() => {}, () => {});
          }
        }
        return res.status(r.status).json(json);
      } catch {
        return res.status(r.status).send(text);
      }
    } catch (err: any) {
      console.error(`[push/native/register] Railway forward failed: ${err.message}`);
      return res.status(502).json({ error: "Native push registration failed", detail: err.message });
    }
  }
  return res.status(503).json({ error: "RAINA_AI_URL not configured" });
});

// POST /api/push/send → send notification (called by the frontend notify() helpers)
//
// Proxied to Railway when RAINA_AI_URL is set, because that is where the
// browser push subscriptions actually live. This is what makes pushes deliver
// to a phone even when the RainX app is closed / offline.
router.post("/push/native/unregister", async (req: Request, res: Response) => {
  if (USE_RAILWAY_PUSH) {
    try {
      const r = await fetch(`${railwayBase}/push/native/unregister`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(15_000),
      });
      const text = await r.text();
      return res.status(r.status).send(text);
    } catch (err: any) {
      console.error(`[push/native/unregister] Railway forward failed: ${err.message}`);
      return res.status(502).json({ error: "Native push unregister failed", detail: err.message });
    }
  }
  return res.status(503).json({ error: "RAINA_AI_URL not configured" });
});

router.post("/push/send", async (req: Request, res: Response) => {
  const { userId, title, body, data } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: "userId and title required" });
  }

  // ── Primary path: forward to the Railway bot that owns the subscriptions ──
  if (USE_RAILWAY_PUSH) {
    try {
      const r = await fetch(`${railwayBase}/push/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title, body, data: data || {} }),
        signal: AbortSignal.timeout(15_000),
      });
      const text = await r.text();
      // Preserve Railway's response shape (e.g. { ok, sent, failed }) verbatim.
      try {
        const json = JSON.parse(text);
        return res.status(r.status).json(json);
      } catch {
        return res.status(r.status).send(text);
      }
    } catch (err: any) {
      console.error(`[push/send] Railway forward failed: ${err.message}`);
      return res.status(502).json({ error: "Push send failed", detail: err.message });
    }
  }

  // ── Fallback path: local web-push (only when local VAPID keys are set) ──
  if (!db) return res.status(503).json({ error: "DB not configured" });
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(503).json({ error: "VAPID keys not configured" });
  }

  const { data: rows } = await db
    .from("push_subscriptions")
    .select("subscription, endpoint")
    .eq("user_id", userId);

  if (!rows?.length) return res.json({ sent: 0 });

  const payload = JSON.stringify({ title, body, data: data || {} });
  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    rows.map(async (row: any) => {
      try {
        const sub = typeof row.subscription === "string"
          ? JSON.parse(row.subscription)
          : row.subscription;
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err: any) {
        // 410 Gone = subscription expired; clean up
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          stale.push(row.endpoint);
        }
      }
    })
  );

  if (stale.length && db) {
    await db.from("push_subscriptions").delete().in("endpoint", stale).then(() => {}, () => {});
  }

  return res.json({ sent, stale: stale.length });
});

export default router;
