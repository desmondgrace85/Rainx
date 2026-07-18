import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://fsndqkacfizulovhfldz.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_iRh4f9MF6ZDg43cSrA7zNQ_uIpi1eg9"
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { telegram_id, subscription, is_active } = req.body;
  if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });

  await supabase.from("profiles").update({ subscription, is_active }).eq("telegram_id", telegram_id);

  return res.status(200).json({ ok: true });
}
