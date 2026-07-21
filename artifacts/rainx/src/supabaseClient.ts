import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fsndqkacfizulovhfldz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iRh4f9MF6ZDg43cSrA7zNQ_uIpi1eg9";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
