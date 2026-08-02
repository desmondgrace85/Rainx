// Vercel serverless function — batch profile lookup using service key (bypasses RLS)
// Called by fetchProfilesMap() in CommunityTab.jsx to get real names/avatars for followers
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  const raw = String(req.query.ids || "");
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean).slice(0, 200);
  if (!ids.length) return res.status(200).json([]);

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://fsndqkacfizulovhfldz.supabase.co";
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: "Server misconfiguration: SUPABASE_SERVICE_KEY not set." });

  try {
    const qs = `id=in.(${ids.join(",")})&select=id,full_name,username,display_name,avatar_url,bio,is_admin,badge,cover_url,location`;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${qs}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
    });
    if (!r.ok) return res.status(500).json({ error: "DB error" });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
