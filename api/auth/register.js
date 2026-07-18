import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://fsndqkacfizulovhfldz.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_iRh4f9MF6ZDg43cSrA7zNQ_uIpi1eg9"
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, password, telegram_id } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, telegram_id } } });
  if (error) return res.status(400).json({ ok: false, error: error.message });

  // Store telegram_id in profiles table if it exists
  if (data.user && telegram_id) {
    await supabase.from("profiles").upsert({ id: data.user.id, name, telegram_id, subscription: "none", is_active: false }).select();
  }

  return res.status(201).json({ ok: true, user_id: data.user?.id, subscription: "none", is_active: false, name });
}
