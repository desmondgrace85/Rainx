/**
 * /api/push — Web Push notification endpoints
 *
 * GET  /api/push/keys       → returns VAPID public key for browser subscription
 * POST /api/push/subscribe  → stores/updates a push subscription for a user
 * POST /api/push/send       → (internal) send a push notification to a user
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

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const db = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// GET /api/push/keys → return VAPID public key
router.get("/push/keys", (_req: Request, res: Response) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: "Push notifications not configured" });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe → save subscription to DB
router.post("/push/subscribe", async (req: Request, res: Response) => {
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
  res.json({ ok: true });
});

// POST /api/push/send → send notification (called by backend workers / admin)
router.post("/push/send", async (req: Request, res: Response) => {
  const { userId, title, body, data } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: "userId and title required" });
  }
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

  res.json({ sent, stale: stale.length });
});

export default router;
