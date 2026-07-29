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
    .select("id, cover_url, location, full_name, username, date_of_birth, dob_privacy")
    .eq("id", id)
    .single();
  if (error || !data) return res.status(404).json({ error: "Not found" });
  res.json(data);
});

export default router;
