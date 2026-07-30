// Vercel serverless function — single profile lookup using service key (bypasses RLS)
// Used by ProfileView in CommunityTab.jsx to show cover photo / location for any user
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://fsndqkacfizulovhfldz.supabase.co";
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: "Server misconfiguration: SUPABASE_SERVICE_KEY not set." });

  try {
    const qs = `id=eq.${id}&select=id,cover_url,location,full_name,username,display_name,date_of_birth,dob_privacy,bio,avatar_url,is_admin,badge`;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${qs}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.pgrst.object+json",
      },
    });
    if (!r.ok) return res.status(404).json({ error: "Not found" });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
