/**
 * GET /api/public-profile/:id
 * Returns public-safe profile fields including cover_url and location,
 * using the service key to bypass RLS so any viewer can see cover photos.
 */
import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fsndqkacfizulovhfldz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

const db = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

router.get("/public-profile/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!db) return res.status(503).json({ error: "Not configured" });
  const { data, error } = await db
    .from("profiles")
    .select("id, cover_url, location, full_name, username, display_name, date_of_birth, dob_privacy")
    .eq("id", id)
    .single();
  if (error || !data) return res.status(404).json({ error: "Not found" });
  return res.json(data);
});

// GET /api/public-profiles?ids=id1,id2,... — batch lookup bypassing RLS so names/avatars show for any viewer
router.get("/public-profiles", async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ error: "Not configured" });
  const raw = String(req.query.ids || "");
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200);
  if (!ids.length) return res.json([]);
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, username, display_name, avatar_url, bio, is_admin, badge, cover_url, location")
    .in("id", ids);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

export default router;
