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
