/**
 * Shared helper — send a web push notification to a user.
 * Used by the push route AND the payment-confirmation realtime listener.
 */
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fsndqkacfizulovhfldz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@rainx.app";

let _db: ReturnType<typeof createClient> | null = null;
export function getDb() {
  if (!_db && SUPABASE_SERVICE_KEY) {
    _db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return _db;
}

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<{ sent: number; stale: number }> {
  const db = getDb();

  // Notification settings are account-scoped in Supabase. Enforce them here
  // before either the native or legacy push transport is used.
  if (db) {
    try {
      const { data: row } = await db
        .from("account_settings")
        .select("settings,security_prefs")
        .eq("user_id", userId)
        .maybeSingle();

      const settings = (row?.settings || {}) as Record<string, any>;
      const security = (row?.security_prefs || {}) as Record<string, any>;
      const notificationPrefs = (settings.notificationPrefs || {}) as Record<string, any>;
      const master = notificationPrefs.master !== false;
      const category = String(data?.category || "default").toLowerCase();

      const allowed =
        master &&
        (category === "signal" ? settings.signalAlerts !== false && notificationPrefs.trading !== false :
         category === "risk" ? settings.riskAlerts !== false && notificationPrefs.trading !== false :
         category === "news" ? notificationPrefs.news !== false :
         category === "community" ? settings.communityNotifications !== false && notificationPrefs.community !== false :
         category === "money" ? notificationPrefs.money !== false :
         category === "creator" ? settings.creatorUpdates !== false :
         category === "launch" ? settings.launchAlerts !== false :
         category === "marketing" ? settings.marketingNotifications === true :
         category === "security" ? security.securityEmails !== false && notificationPrefs.system !== false :
         notificationPrefs.system !== false);

      if (!allowed) return { sent: 0, stale: 0 };
    } catch (error) {
      // Do not fail a notification because a preference lookup is temporarily
      // unavailable; the transport remains the fallback path.
      console.warn("[pushNotify] preference lookup failed:", error);
    }
  }

  const rainaAiUrl = (process.env.RAINA_AI_URL || "").replace(/\/$/, "");

  // Use the same Raina AI transport selector as /api/push/send so native
  // RainX devices never receive a second legacy Web Push notification.
  if (rainaAiUrl) {
    try {
      const response = await fetch(`${rainaAiUrl}/push/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title, body, data }),
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        return {
          sent: Number(result?.sent || result?.nativeSent || result?.webSent || 0),
          stale: Number(result?.stale || 0),
        };
      }
    } catch (error) {
      console.error("[pushNotify] Raina AI push failed:", error);
    }
  }

  // Self-contained legacy fallback for environments that intentionally run
  // without the Raina AI push service.
  if (!db) return { sent: 0, stale: 0 };
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return { sent: 0, stale: 0 };

  const { data: rows } = await db
    .from("push_subscriptions")
    .select("subscription, endpoint")
    .eq("user_id", userId);

  if (!rows?.length) return { sent: 0, stale: 0 };

  const payload = JSON.stringify({ title, body, data });
  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    rows.map(async (row: any) => {
      try {
        const sub =
          typeof row.subscription === "string"
            ? JSON.parse(row.subscription)
            : row.subscription;
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          stale.push(row.endpoint);
        }
      }
    })
  );

  if (stale.length) {
    await db
      .from("push_subscriptions")
      .delete()
      .in("endpoint", stale)
      .then(() => {}, () => {});
  }

  return { sent, stale: stale.length };
}

