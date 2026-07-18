import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fsndqkacfizulovhfldz.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_iRh4f9MF6ZDg43cSrA7zNQ_uIpi1eg9";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, password, telegram_id } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  let userId = null;

  if (SERVICE_KEY) {
    // ── Admin path: pre-confirmed user, no email sent, no rate limit ──
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, telegram_id },
    });

    if (error) {
      const msg = error.message || "";
      if (msg.toLowerCase().includes("already") || error.status === 422) {
        return res.status(409).json({ ok: false, error: "An account with this email already exists." });
      }
      return res.status(400).json({ ok: false, error: msg });
    }

    userId = data.user?.id;
  } else {
    // ── Anon path: regular signup (subject to Supabase SMTP rate limit) ──
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await anon.auth.signUp({
      email,
      password,
      options: { data: { name, telegram_id } },
    });

    if (error) {
      const msg = error.message || "";
      if (msg.toLowerCase().includes("rate limit")) {
        return res.status(429).json({
          ok: false,
          error: "Too many signup requests. Please try again in a few minutes.",
        });
      }
      return res.status(400).json({ ok: false, error: msg });
    }

    userId = data.user?.id;
  }

  // Upsert profile row with telegram_id so the dashboard sees it
  if (userId) {
    const client = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY);
    await client
      .from("profiles")
      .upsert({ id: userId, name, telegram_id, subscription: "none", is_active: false })
      .select();
  }

  return res.status(201).json({ ok: true, user_id: userId, subscription: "none", is_active: false, name });
}
