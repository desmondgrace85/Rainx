import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://fsndqkacfizulovhfldz.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_iRh4f9MF6ZDg43cSrA7zNQ_uIpi1eg9"
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password, telegram_id } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ ok: false, error: error.message });

  // Fetch profile for subscription info
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();

  // Update telegram_id if provided
  if (telegram_id && profile) {
    await supabase.from("profiles").update({ telegram_id }).eq("id", data.user.id);
  }

  const subscription = profile?.subscription || "none";
  const is_active = profile?.is_active ?? false;
  const name = profile?.name || data.user.user_metadata?.name || "";

  return res.status(200).json({ ok: true, token: data.session?.access_token, subscription, is_active, name });
}
