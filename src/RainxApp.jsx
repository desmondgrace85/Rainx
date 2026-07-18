import React, { useState, useEffect, useRef, useCallback } from "react";
import { Area, ComposedChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  Bell, Home, Briefcase, MessageCircle, MoreHorizontal, Settings, X,
  TrendingUp, TrendingDown, Minus, Activity, Send, Calendar as CalendarIcon,
  Calculator, Mail, ShieldCheck, LogOut, Mic, Square, FileText, ScrollText, Users2,
  CreditCard as CreditCardIcon, Zap, ArrowRight,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import CommunityTab from "./CommunityTab";

// ---------- Design tokens ----------
const T = {
  ink: "#0F0E0B",
  card: "#1C1913",
  cardBorder: "#332C1F",
  gold: "#C6A15B",
  goldBright: "#E3C077",
  sage: "#7A9E86",
  rust: "#B0604A",
  paper: "#F2EDE0",
  muted: "#9C947F",
};
const FONT_HEAD = "'Montserrat', sans-serif";
const FONT_BODY = "'Montserrat', sans-serif";

// ---------- Resilient storage (uses Claude's artifact storage when present,
// otherwise falls back to real localStorage - which works fine once this is
// deployed as a normal website outside the Claude preview sandbox) ----------
const memoryStore = {};
function lsGet(key) {
  try { const v = localStorage.getItem(key); return v !== null ? v : undefined; } catch { return memoryStore[key]; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { memoryStore[key] = value; }
}
function lsDelete(key) {
  try { localStorage.removeItem(key); } catch { delete memoryStore[key]; }
}
async function storageGet(key, shared) {
  if (typeof window !== "undefined" && window.storage && typeof window.storage.get === "function") {
    try { return await window.storage.get(key, shared); } catch { /* fall through */ }
  }
  const v = lsGet(key);
  return v !== undefined ? { key, value: v, shared } : null;
}
async function storageSet(key, value, shared) {
  lsSet(key, value);
  if (typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") {
    try { return await window.storage.set(key, value, shared); } catch { /* fall through */ }
  }
  return { key, value, shared };
}
async function storageDelete(key, shared) {
  lsDelete(key);
  if (typeof window !== "undefined" && window.storage && typeof window.storage.delete === "function") {
    try { return await window.storage.delete(key, shared); } catch { /* fall through */ }
  }
  return null;
}

// ---------- Instruments ----------
const INSTRUMENTS = [
  { symbol: "XAUUSD", name: "Gold", base: 3365, vol: 6, digits: 2, cls: "metal", unit: "points" },
  { symbol: "BTCUSD", name: "Bitcoin", base: 63500, vol: 220, digits: 1, cls: "crypto", unit: "points" },
  { symbol: "ETHUSD", name: "Ethereum", base: 3420, vol: 18, digits: 2, cls: "crypto", unit: "points" },
];

function isMarketOpen(cls) {
  if (cls === "crypto") return true;
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day === 6) return false;
  if (day === 0 && hour < 21) return false;
  if (day === 5 && hour >= 21) return false;
  return true;
}
function nextOpenLabel(cls) {
  if (cls === "crypto") return null;
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 6 || (day === 0 && now.getUTCHours() < 21)) return "Opens Sunday 21:00 UTC";
  if (day === 5 && now.getUTCHours() >= 21) return "Opens Sunday 21:00 UTC";
  return null;
}

// ---------- Price engine (simulated pending a live data key) ----------
function seedSeries(inst) {
  let price = inst.base + (Math.random() - 0.5) * inst.vol * 8;
  const arr = [];
  const now = Date.now();
  for (let i = 200; i >= 0; i--) {
    const drift = Math.sin(i / 14) * inst.vol * 0.3;
    const noise = (Math.random() - 0.5) * inst.vol;
    price = Math.max(inst.base * 0.7, price + drift + noise);
    arr.push({ t: now - i * 60000, price: Number(price.toFixed(inst.digits)) });
  }
  return arr;
}
// ---------- Live price engine (Twelve Data via secure /api/price proxy) ----------
const TD_SYMBOL_MAP = {
  XAUUSD: "XAU/USD", BTCUSD: "BTC/USD", ETHUSD: "ETH/USD",
};
function seedSeriesFromPrice(inst, price) {
  // Reuses the same wiggly shape as seedSeries() for a readable chart line,
  // then shifts every point so the series ends exactly at the real fetched price.
  const base = seedSeries(inst);
  const shift = price - base[base.length - 1].price;
  return base.map((p) => ({ t: p.t, price: Number((p.price + shift).toFixed(inst.digits)) }));
}
function useMultiPriceSeries() {
  const [seriesMap, setSeriesMap] = useState(() => {
    const m = {};
    INSTRUMENTS.forEach((inst) => (m[inst.symbol] = seedSeries(inst)));
    return m;
  });
  useEffect(() => {
    let cancelled = false;

    const fetchOne = async (inst) => {
      if (!isMarketOpen(inst.cls)) return;
      try {
        const res = await fetch(`/api/price?symbol=${encodeURIComponent(TD_SYMBOL_MAP[inst.symbol])}`);
        const data = await res.json();
        const price = data && data.price ? Number(data.price) : null;
        if (price && !cancelled) {
          setSeriesMap((prev) => {
            const arr = prev[inst.symbol] || [];
            return { ...prev, [inst.symbol]: [...arr.slice(1), { t: Date.now(), price: Number(price.toFixed(inst.digits)) }] };
          });
        }
        return price;
      } catch { return null; }
    };

    // Seed every market with a REAL price right away (staggered to stay under
    // free-tier rate limits) instead of waiting up to ~18 minutes of rotation
    // for a market's first real tick to arrive.
    const seedAll = async () => {
      for (let idx = 0; idx < INSTRUMENTS.length; idx++) {
        if (cancelled) return;
        const inst = INSTRUMENTS[idx];
        if (!isMarketOpen(inst.cls)) continue;
        try {
          const res = await fetch(`/api/price?symbol=${encodeURIComponent(TD_SYMBOL_MAP[inst.symbol])}`);
          const data = await res.json();
          const price = data && data.price ? Number(data.price) : null;
          if (price && !cancelled) {
            setSeriesMap((prev) => ({ ...prev, [inst.symbol]: seedSeriesFromPrice(inst, price) }));
          }
        } catch { /* keep the placeholder shape for this one market if the seed fetch fails */ }
        await new Promise((r) => setTimeout(r, 1500)); // stay well under free-tier per-minute limits
      }
    };

    let i = 0;
    const rotate = () => { fetchOne(INSTRUMENTS[i % INSTRUMENTS.length]); i += 1; };

    seedAll();
    const id = setInterval(rotate, 400000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return seriesMap;
}
function sma(values, period) {
  if (values.length < period) return null;
  return values.slice(-period).reduce((a, b) => a + b, 0) / period;
}
function rsi(values, period = 14) {
  if (values.length < period + 1) return null;
  const slice = values.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const d = slice[i] - slice[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / period / (losses / period);
  return 100 - 100 / (1 + rs);
}

// ---------- Raina AI ----------
// Signal generation is now handled by the Raina-AI bot (Python FastAPI).
// checkCandle calls /api/signals/long-term/{symbol}?timeframe={tf} directly.
// askRaina now calls the Raina-AI bot directly — no Anthropic/Claude needed.
async function askRaina(history, context) {
  // Extract the symbol from the context string ("EURUSD current price…")
  const symbolMatch = context.match(/\(([A-Z0-9]+)\)/);
  const symbol = symbolMatch ? symbolMatch[1] : "EURUSD";
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, messages: history, context }),
  });
  if (!res.ok) return "Sorry, I couldn't reach the signal engine right now.";
  const data = await res.json();
  return data.reply || "Sorry, I couldn't process that.";
}

// ---------- Small UI ----------
function BiasChip({ bias }) {
  const map = {
    buy: { color: T.sage, label: "BUY", dot: "🟢" },
    sell: { color: T.rust, label: "SELL", dot: "🔴" },
    hold: { color: T.muted, label: "HOLD", dot: "⚪" },
  };
  const m = map[bias] || map.hold;
  return <div style={{ display: "flex", alignItems: "center", gap: 6, color: m.color, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15 }}><span>{m.dot}</span> {m.label}</div>;
}
function playNotifSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.35);
  } catch {}
}
function Toast({ toast, onDone }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    if (!toast) return;
    setDragX(0);
    playNotifSound();
    const id = setTimeout(() => onDoneRef.current(), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  const colorMap = { signal: T.gold, update: T.sage, warning: T.rust, news: T.gold };

  const onTouchStart = (e) => { dragging.current = true; startX.current = e.touches[0].clientX; };
  const onTouchMove = (e) => { if (dragging.current) setDragX(e.touches[0].clientX - startX.current); };
  const onTouchEnd = () => {
    dragging.current = false;
    if (Math.abs(dragX) > 80) onDoneRef.current(); else setDragX(0);
  };

  return (
    <div
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      onClick={() => onDoneRef.current()}
      style={{
        position: "fixed", top: 10, left: 10, right: 10, maxWidth: 460, margin: "0 auto", zIndex: 100,
        background: T.card, border: `1px solid ${colorMap[toast.type] || T.gold}`, borderRadius: 12,
        padding: "12px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", cursor: "pointer",
        transform: `translateX(${dragX}px)`, opacity: Math.max(0, 1 - Math.abs(dragX) / 200),
        transition: dragging.current ? "none" : "transform 0.2s, opacity 0.2s",
        animation: dragX === 0 ? "slideDown 0.25s ease-out" : "none",
      }}
    >
      <div style={{ fontFamily: FONT_HEAD, fontSize: 12.5, fontWeight: 700, color: colorMap[toast.type] || T.gold }}>{toast.title}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.paper, marginTop: 3, fontWeight: 500 }}>{toast.body}</div>
      <div style={{ fontSize: 9.5, color: T.muted, marginTop: 4 }}>Swipe or tap to dismiss</div>
    </div>
  );
}
const inputStyle = { flex: 1, background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.paper, padding: 10, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500 };

// ---------- Auth (real Supabase accounts) ----------
async function recordActivity(userId, action, meta) {
  try { await supabase.from("activity_logs").insert({ user_id: userId, action, meta: meta || null }); } catch {}
}

// ---------- Candle-based signal engine ----------
const TIMEFRAMES = [
  { key: "15m", td: "15min", label: "15 Minute" },
  { key: "1h", td: "1h", label: "1 Hour" },
];

async function saveTradeHistory(account, inst, tf, sig, result, points) {
  if (!account?.id) return;
  try {
    await supabase.from("trade_history").insert({
      user_id: account.id, symbol: inst.symbol, timeframe: tf.label, direction: sig.bias,
      entry: sig.entry, stop_loss: sig.stop_loss, take_profit: sig.take_profit_1,
      result, points, reason: sig.reason,
    });
  } catch { /* history save failing shouldn't block the live trade update */ }
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("signup"); // signup | signin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [content, setContent] = useState({
    hero_title: "RainX", hero_subtitle: "Powered by Raina AI", hero_tagline: "Your intelligent trading companion.",
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("site_content").select("key, value").in("key", ["hero_title", "hero_subtitle", "hero_tagline"]);
        if (data && data.length) {
          const map = {};
          data.forEach((row) => { if (row.value) map[row.key] = row.value; });
          setContent((c) => ({ ...c, ...map }));
        }
      } catch { /* keep defaults if the CMS table isn't reachable */ }
    })();
  }, []);

  const submit = async () => {
    setError(""); setNotice("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) { setError("Enter your email and password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (mode === "signup" && !agree) { setError("Please accept the risk disclosure to continue."); return; }
    setBusy(true);

    if (mode === "signup") {
      const { data, error: signErr } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (signErr) { setError(signErr.message); setBusy(false); return; }
      if (data.user && !data.session) {
        setNotice("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
        setBusy(false);
        return;
      }
      if (data.user) recordActivity(data.user.id, "signup");
      onAuthed(data.session);
    } else {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (signErr) { setError(signErr.message); setBusy(false); return; }
      const { data: profile } = await supabase.from("profiles").select("is_banned, is_suspended").eq("id", data.user.id).single();
      if (profile && (profile.is_banned || profile.is_suspended)) {
        await supabase.auth.signOut();
        setError(profile.is_banned ? "This account has been banned." : "This account is suspended. Contact support.");
        setBusy(false);
        return;
      }
      recordActivity(data.user.id, "login");
      onAuthed(data.session);
    }
    setBusy(false);
  };

  // Local premium palette - scoped to this screen only, doesn't touch the
  // shared T tokens used everywhere else in the app.
  const A = {
    bg: "#0B0B0B", card: "#171513", gold: "#D4AF63",
    goldGrad: "linear-gradient(135deg, #E6C57A, #C89A3C)",
    border: "rgba(255,255,255,0.08)", gray: "#B4B4B4",
  };
  const [oauthNotice, setOauthNotice] = useState("");

  return (
    <div style={{ minHeight: "100dvh", background: A.bg, color: "#fff", fontFamily: FONT_BODY, display: "flex", flexDirection: "column", padding: "28px 22px", maxWidth: 480, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; } body { margin:0; }`}</style>

      <svg width="100%" height="92" viewBox="0 0 320 92" style={{ display: "block", marginBottom: 4 }}>
        <defs>
          <linearGradient id="authRibbon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E6C57A" />
            <stop offset="100%" stopColor="#C89A3C" />
          </linearGradient>
        </defs>
        <path id="authRibbonPath" d="M6 74 C 55 6, 95 6, 140 46 S 250 84, 306 14" stroke="url(#authRibbon)" strokeWidth="22" fill="none" strokeLinecap="round" />
        <text fontSize="8.5" fontWeight="800" letterSpacing="2" fill="#0B0B0B">
          <textPath href="#authRibbonPath" startOffset="6%">PREMIUM SIGNALS FOR TRADERS</textPath>
        </text>
      </svg>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.25 }}>
          Get <span style={{ color: A.gold }}>high accuracy</span> trading signals and connect with our active community.
        </div>
        <div style={{ fontSize: 11, color: A.gray, fontWeight: 700, letterSpacing: 1.5, marginTop: 10, textTransform: "uppercase" }}>{content.hero_subtitle}</div>
        <div style={{ fontSize: 12.5, color: A.gray, marginTop: 6, fontWeight: 500 }}>{content.hero_tagline}</div>
      </div>

      <div style={{ background: A.card, border: `1px solid ${A.border}`, borderRadius: 28, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", marginBottom: 20, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 4 }}>
          {["signup", "signin"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setNotice(""); }} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, background: mode === m ? A.goldGrad : "transparent", color: mode === m ? "#0B0B0B" : A.gray, transition: "background 0.15s" }}>
              {m === "signup" ? "Sign up" : "Sign in"}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 11, color: A.gray, fontWeight: 600, letterSpacing: 0.3 }}>Email</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 16, background: A.bg, border: `1px solid ${A.border}`, borderRadius: 14, padding: "12px 14px" }}>
          <Mail size={16} color={A.gray} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: FONT_BODY, fontSize: 13.5 }} />
        </div>

        <label style={{ fontSize: 11, color: A.gray, fontWeight: 600, letterSpacing: 0.3 }}>Password</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 18, background: A.bg, border: `1px solid ${A.border}`, borderRadius: 14, padding: "12px 14px" }}>
          <ShieldCheck size={16} color={A.gray} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: FONT_BODY, fontSize: 13.5 }} />
        </div>

        {mode === "signup" && (
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11, color: A.gray, marginBottom: 16, lineHeight: 1.6 }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2, accentColor: A.gold }} />
            I understand RainX is an analysis tool, not financial advice, and I trade at my own risk.
          </label>
        )}
        {notice && <div style={{ color: "#7A9E86", fontSize: 12, marginBottom: 12 }}>{notice}</div>}
        {error && <div style={{ color: "#E27D6B", fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <button onClick={submit} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: A.goldGrad, color: "#0B0B0B", border: "none", borderRadius: 14, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1, boxShadow: "0 8px 20px rgba(212,175,99,0.25)" }}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"} {!busy && <ArrowRight size={15} />}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" }}>
          <div style={{ flex: 1, height: 1, background: A.border }} />
          <span style={{ fontSize: 10, color: A.gray }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: A.border }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {["Google", "Apple"].map((provider) => (
            <button key={provider} onClick={() => setOauthNotice(`${provider} sign-in is coming soon.`)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${A.border}`, borderRadius: 12, padding: "11px 0", color: "#fff", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              {provider}
            </button>
          ))}
        </div>
        {oauthNotice && <div style={{ fontSize: 10.5, color: A.gray, textAlign: "center", marginTop: 10 }}>{oauthNotice}</div>}
      </div>
    </div>
  );
}

// ---------- Subscription gate ----------
const PLAN_LABELS = { weekly: "Weekly", monthly: "Monthly", biannual: "Biannual" };
const PLAN_TIER_RANK = { none: 0, weekly: 1, monthly: 2, biannual: 3 };
const PLAN_FEATURES = {
  weekly: { price: 120, blurb: "Solid long-term signals (15M/1H). Trade history, notifications, and Community included. Scalping stays locked.", scalping: false },
  monthly: { price: 500, blurb: "Everything in Weekly, plus Scalping signals unlocked for fast, manual MT5 trades.", scalping: true },
  biannual: { price: 1000, blurb: "Everything in Monthly, plus an automatic blue verified badge and priority 24/7 support.", scalping: true },
};

// ---------- Entitlement (what the signed-in user is allowed to see) ----------
function useEntitlement(userId) {
  const [tier, setTier] = useState("loading"); // loading | none | weekly | monthly | biannual
  const [pendingPlan, setPendingPlan] = useState(null);

  const check = useCallback(async () => {
    if (!userId) { setTier("none"); return; }
    const { data: subs } = await supabase
      .from("subscriptions").select("*").eq("user_id", userId).eq("status", "active")
      .order("expires_at", { ascending: false }).limit(1);
    const row = subs && subs[0];
    const active = row && (row.expires_at && new Date(row.expires_at) > new Date());
    if (active) { setTier(row.plan); setPendingPlan(null); return; }

    const { data: pending } = await supabase
      .from("payments").select("plan").eq("user_id", userId).eq("status", "pending")
      .order("submitted_at", { ascending: false }).limit(1);
    setPendingPlan(pending && pending[0] ? pending[0].plan : null);
    setTier("none");
  }, [userId]);

  useEffect(() => { check(); }, [check]);
  return { tier, pendingPlan, refresh: check };
}
function hasAccess(tier, required) {
  return (PLAN_TIER_RANK[tier] || 0) >= (PLAN_TIER_RANK[required] || 0);
}

// ---------- Blur lock overlay (wraps just the gated content, not the page) ----------
function BlurGate({ unlocked, requiredLabel, onSubscribe, children, minHeight = 160 }) {
  if (unlocked) return children;
  return (
    <div style={{ position: "relative", minHeight, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ filter: "blur(7px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>{children}</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(15,14,11,0.35)", padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>🔒</div>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper, marginBottom: 4 }}>{requiredLabel} subscription required</div>
        <button onClick={onSubscribe} style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 8, padding: "8px 16px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer", marginTop: 6 }}>
          Subscribe to unlock
        </button>
      </div>
    </div>
  );
}

// ---------- Subscribe screen ----------
function SubscribeScreen({ account, entitlement, onBack }) {
  const [methods, setMethods] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from("payment_methods").select("*").eq("enabled", true).order("sort_order").then(({ data }) => setMethods(data || []));
  }, []);

  const submitPayment = async () => {
    setBusy(true);
    await supabase.from("payments").insert({ user_id: account.id, plan: selectedPlan, reference_note: note || null });
    recordActivity(account.id, "payment_submitted", { plan: selectedPlan });
    setBusy(false);
    setSubmitted(true);
    entitlement.refresh();
  };

  if (entitlement.pendingPlan || submitted) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, marginBottom: 14 }}>← Back</button>
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 22, textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>⏳</div>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, marginTop: 8, color: T.paper }}>Payment pending confirmation</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 6, lineHeight: 1.6 }}>
            Your {PLAN_LABELS[entitlement.pendingPlan || selectedPlan]} plan request has been submitted. Access unlocks automatically once an admin confirms your payment.
          </div>
        </div>
      </div>
    );
  }

  if (selectedPlan && selectedMethod) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setSelectedMethod(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, marginBottom: 14 }}>← Back</button>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 800, color: T.goldBright, marginBottom: 12 }}>{selectedMethod.name}</div>
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, color: T.paper, lineHeight: 1.6, marginBottom: 14, whiteSpace: "pre-wrap" }}>{selectedMethod.instructions}</div>
          {selectedMethod.image_url && (
            <img src={selectedMethod.image_url} alt="Payment details" style={{ width: "100%", borderRadius: 10, marginBottom: 14 }} />
          )}
          <label style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Payment reference (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. transaction ID" style={{ ...inputStyle, width: "100%", marginTop: 4, marginBottom: 14 }} />
          <button onClick={submitPayment} disabled={busy} style={{ width: "100%", background: T.gold, color: T.ink, border: "none", borderRadius: 10, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {busy ? "Submitting…" : "I've paid — submit for confirmation"}
          </button>
        </div>
      </div>
    );
  }

  if (selectedPlan) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setSelectedPlan(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, marginBottom: 14 }}>← Back</button>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 800, color: T.goldBright, marginBottom: 12 }}>Choose payment method</div>
        {methods === null ? <div style={{ color: T.muted, fontSize: 13 }}>Loading…</div> : methods.map((m) => (
          <button key={m.id} onClick={() => setSelectedMethod(m)} style={{ display: "block", width: "100%", textAlign: "left", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 14, marginBottom: 10, color: T.paper, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {m.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 800, color: T.goldBright, marginBottom: 4 }}>Choose your plan</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Unlock Raina's signals, history, and alerts.</div>
      {Object.entries(PLAN_FEATURES).map(([key, f]) => (
        <div key={key} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 800, color: T.goldBright }}>{PLAN_LABELS[key]}</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 800, color: T.paper }}>GHS {f.price}</div>
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 8, lineHeight: 1.6 }}>{f.blurb}</div>
          <button onClick={() => setSelectedPlan(key)} style={{ width: "100%", marginTop: 12, background: T.gold, color: T.ink, border: "none", borderRadius: 10, padding: "10px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
            Choose {PLAN_LABELS[key]}
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------- Main App ----------
function MainApp({ account, onLogout }) {
  return <MainAppContent account={account} onLogout={onLogout} />;
}

function MainAppContent({ account, onLogout }) {
  const seriesMap = useMultiPriceSeries();
  const seriesMapRef = useRef(seriesMap);
  seriesMapRef.current = seriesMap;
  const entitlement = useEntitlement(account.id);

  const [tab, setTab] = useState("home");
  const [activeSymbol, setActiveSymbol] = useState("XAUUSD");
  const inst = INSTRUMENTS.find((i) => i.symbol === activeSymbol);
  const marketOpen = isMarketOpen(inst.cls);

  const series = seriesMap[activeSymbol];
  const prices = series.map((p) => p.price);
  const last = prices[prices.length - 1];
  const prev = prices[prices.length - 2] || last;
  const changePct = ((last - prev) / prev) * 100;
  const sma20 = sma(prices, 20);
  const sma50 = sma(prices, 50);
  const rsiVal = rsi(prices, 14);

  const [signalsMap, setSignalsMap] = useState({}); // { [symbol]: { "15m": signal, "1h": signal } }
  const [loadingKey, setLoadingKey] = useState(null); // `${symbol}_${tfKey}` currently being analyzed
  const [selectedTf, setSelectedTf] = useState("15m");
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [autoScan, setAutoScan] = useState(true);
  const lastCandleTimeRef = useRef({}); // `${symbol}_${tfKey}` -> datetime string of the last candle we saw

  const unreadCount = notifications.filter((n) => !n.read).length;

  const pushNotification = useCallback(async (n) => {
    let id = Date.now() + Math.random();
    if (account?.id) {
      const { data } = await supabase.from("user_notifications").insert({ user_id: account.id, title: n.title, body: n.body }).select("id").single().then((r) => r, () => ({ data: null }));
      if (data?.id) id = data.id;
    }
    const entry = { id, read: false, time: new Date().toLocaleTimeString(), ...n };
    setNotifications((list) => [entry, ...list].slice(0, 50));
    setToastQueue((q) => [...q, entry]);
  }, [account]);

  useEffect(() => {
    if (!activeToast && toastQueue.length > 0) {
      setActiveToast(toastQueue[0]);
      setToastQueue((q) => q.slice(1));
    }
  }, [toastQueue, activeToast]);

  // Load this account's past notifications (survives logout, new device, etc.)
  useEffect(() => {
    if (!account?.id) return;
    (async () => {
      try {
        const { data } = await supabase.from("user_notifications").select("*").eq("user_id", account.id).order("created_at", { ascending: false }).limit(50);
        if (data) {
          setNotifications(data.map((row) => ({
            id: row.id, title: row.title, body: row.body, read: row.read, time: new Date(row.created_at).toLocaleTimeString(),
          })));
        }
      } catch { /* keep starting empty if this fails */ }
    })();
  }, [account?.id]);

  // Checks one (instrument, timeframe) combo's latest candle. If it's the
  // same candle as last time, does nothing - signals only refresh when a
  // genuinely new candle has closed, so they stay stable instead of flickering.
  // checkCandle now calls the Raina-AI bot directly instead of Claude.
  // The bot fetches its own market data (yfinance) and runs the full
  // technical analysis engine, then returns a structured Signal.
  const checkCandle = useCallback(async (inst, tf) => {
    if (!isMarketOpen(inst.cls)) return;
    const key = `${inst.symbol}_${tf.key}`;
    const now = Date.now();
    // Throttle: skip if we already got a signal for this combo in the last 4 min
    if (lastCandleTimeRef.current[key] && now - lastCandleTimeRef.current[key] < 4 * 60 * 1000) return;
    try {
      const wasFirstLoad = !lastCandleTimeRef.current[key];
      setLoadingKey(key);
      const res = await fetch(`/api/signals/long-term/${encodeURIComponent(inst.symbol)}?timeframe=${tf.key}`);
      setLoadingKey((k) => (k === key ? null : k));
      if (!res.ok) return;
      const signal = await res.json();

      lastCandleTimeRef.current[key] = now;

      // Map Raina-AI Signal shape → RainX UI shape
      const result = {
        bias: (signal.direction || "HOLD").toLowerCase(),
        confidence: signal.confidence || 0,
        entry: Array.isArray(signal.entry_zone) && signal.entry_zone.length >= 2
          ? (signal.entry_zone[0] + signal.entry_zone[1]) / 2
          : null,
        stop_loss: signal.stop_loss || null,
        take_profit_1: Array.isArray(signal.take_profit) ? (signal.take_profit[0] || null) : null,
        take_profit_2: Array.isArray(signal.take_profit) ? (signal.take_profit[1] || null) : null,
        risk_level: (signal.risk_level || "MEDIUM").toLowerCase(),
        timeframe: signal.timeframe || tf.key,
        reason: signal.explanation || "",
      };

      if (result.bias !== "hold" && result.confidence < 65) {
        result.bias = "hold";
        result.reason = "Confidence was below our 65% quality bar, so no trade is being suggested right now. " + result.reason;
      }

      setSignalsMap((prev) => ({
        ...prev,
        [inst.symbol]: {
          ...prev[inst.symbol],
          [tf.key]: { ...result, digits: inst.digits, name: inst.name, timeframeLabel: tf.label, generatedAt: Date.now(), status: "active", milestones: [] },
        },
      }));

      supabase.from("signals").upsert({
        symbol: inst.symbol, timeframe: tf.key, candle_time: new Date().toISOString(),
        bias: result.bias, confidence: result.confidence, entry: result.entry,
        stop_loss: result.stop_loss, take_profit_1: result.take_profit_1, take_profit_2: result.take_profit_2,
        risk_level: result.risk_level, reason: result.reason, status: "active", milestones: [],
        generated_at: new Date().toISOString(),
      }, { onConflict: "symbol,timeframe" }).then(() => {}, () => {});

      if (!wasFirstLoad && result.bias !== "hold" && result.confidence >= 65) {
        const verb = result.bias === "buy" ? "Buy" : "Sell";
        pushNotification({
          type: "signal", symbol: inst.symbol,
          title: `${result.bias === "buy" ? "🟢" : "🔴"} ${verb} ${inst.name} — ${tf.label} signal`,
          body: `${result.confidence}% confidence · ${result.reason}`,
        });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`${verb} ${inst.name} (${tf.label})`, {
            body: `${result.confidence}% confidence · Entry ${result.entry?.toFixed(inst.digits) ?? "N/A"}`,
          });
        }
      }
    } catch { /* keep the existing signal if the fetch fails */ }
  }, [pushNotification]);

  const allCombos = [];
  INSTRUMENTS.forEach((inst) => TIMEFRAMES.forEach((tf) => allCombos.push({ inst, tf })));

  useEffect(() => {
    (async () => {
      // Load whatever signals already exist in Supabase first, so a reload,
      // logout/login, or new device shows the SAME still-open signal instead
      // of triggering a fresh (and possibly different) Raina call.
      try {
        const { data } = await supabase.from("signals").select("*");
        if (data && data.length) {
          const map = {};
          data.forEach((row) => {
            const inst = INSTRUMENTS.find((i) => i.symbol === row.symbol);
            if (!inst) return;
            if (!map[row.symbol]) map[row.symbol] = {};
            map[row.symbol][row.timeframe] = {
              bias: row.bias, confidence: row.confidence, entry: row.entry, stop_loss: row.stop_loss,
              take_profit_1: row.take_profit_1, take_profit_2: row.take_profit_2, risk_level: row.risk_level,
              reason: row.reason, digits: inst.digits, name: inst.name,
              timeframeLabel: TIMEFRAMES.find((t) => t.key === row.timeframe)?.label || row.timeframe,
              generatedAt: new Date(row.generated_at).getTime(), status: row.status, milestones: row.milestones || [],
            };
            lastCandleTimeRef.current[`${row.symbol}_${row.timeframe}`] = row.candle_time;
          });
          setSignalsMap(map);
        }
      } catch { /* if this fails, checkCandle below will just generate fresh signals as before */ }

      // Now check each combo - this will correctly do nothing for any combo
      // whose candle hasn't actually changed since the persisted signal.
      allCombos.forEach(({ inst, tf }, idx) => setTimeout(() => checkCandle(inst, tf), idx * 1200));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!autoScan) return;
    let i = 0;
    // 3 min between checks; 3 instruments x 2 timeframes = 6 combos, so each
    // gets re-checked roughly every 18 min - enough to catch 15M/1H candle
    // closes reliably while staying well under the free-tier request budget.
    const id = setInterval(() => {
      const { inst, tf } = allCombos[i % allCombos.length];
      i += 1;
      checkCandle(inst, tf);
    }, 180000);
    return () => clearInterval(id);
  }, [autoScan, checkCandle]);

  // Live milestone + TP/SL monitor - runs against the live price ticker so
  // profit updates feel responsive even though signals only refresh on candle close.
  useEffect(() => {
    const id = setInterval(() => {
      const sideEffects = []; // collected here, run AFTER state update - keeps the updater pure

      setSignalsMap((prevMap) => {
        let changed = false;
        const next = {};
        Object.keys(prevMap).forEach((symbol) => { next[symbol] = { ...prevMap[symbol] }; });

        INSTRUMENTS.forEach((inst) => {
          const arr = seriesMapRef.current[inst.symbol];
          const price = arr && arr[arr.length - 1] ? arr[arr.length - 1].price : null;
          if (!price || !next[inst.symbol]) return;

          TIMEFRAMES.forEach((tf) => {
            const sig = next[inst.symbol][tf.key];
            if (!sig || sig.status !== "active" || sig.bias === "hold") return;

            const dir = sig.bias === "buy" ? 1 : -1;
            const profit = (price - sig.entry) * dir;
            const slDist = Math.abs(sig.entry - sig.stop_loss);
            const tpDist = Math.abs(sig.take_profit_1 - sig.entry);
            let updatedSig = sig;

            [10, 25, 50, 100].forEach((step) => {
              if (profit >= step && !updatedSig.milestones.includes(step)) {
                updatedSig = { ...updatedSig, milestones: [...updatedSig.milestones, step] };
                changed = true;
                sideEffects.push(() => pushNotification({ type: "update", symbol: inst.symbol, title: `+${step} ${inst.unit} — ${inst.name} (${tf.label})`, body: `Trade is now +${step} ${inst.unit} in profit.` }));
              }
            });

            if (profit <= -slDist) {
              updatedSig = { ...updatedSig, status: "sl_hit" };
              changed = true;
              sideEffects.push(() => pushNotification({ type: "warning", symbol: inst.symbol, title: `${inst.name} (${tf.label}) — Stop Loss hit`, body: "Stop Loss hit. Your capital was protected by our risk-management limits. We are analyzing the next high-probability market setup." }));
              sideEffects.push(() => saveTradeHistory(account, inst, tf, sig, "sl", -Math.round(slDist)));
            } else if (profit >= tpDist) {
              updatedSig = { ...updatedSig, status: "tp_hit" };
              changed = true;
              sideEffects.push(() => pushNotification({ type: "update", symbol: inst.symbol, title: `🎯 Take Profit Hit — ${inst.name} (${tf.label})`, body: `Take Profit reached! +${Math.round(tpDist)} ${inst.unit}.` }));
              sideEffects.push(() => saveTradeHistory(account, inst, tf, sig, "tp", Math.round(tpDist)));
            }

            if (updatedSig !== sig) {
              next[inst.symbol] = { ...next[inst.symbol], [tf.key]: updatedSig };
              const candleTime = lastCandleTimeRef.current[`${inst.symbol}_${tf.key}`];
              sideEffects.push(() =>
                supabase.from("signals").upsert({
                  symbol: inst.symbol, timeframe: tf.key, candle_time: candleTime,
                  bias: updatedSig.bias, confidence: updatedSig.confidence, entry: updatedSig.entry,
                  stop_loss: updatedSig.stop_loss, take_profit_1: updatedSig.take_profit_1, take_profit_2: updatedSig.take_profit_2,
                  risk_level: updatedSig.risk_level, reason: updatedSig.reason, status: updatedSig.status, milestones: updatedSig.milestones,
                }, { onConflict: "symbol,timeframe" }).then(() => {}, () => {})
              );
            }
          });
        });

        return changed ? next : prevMap;
      });

      sideEffects.forEach((fn) => fn());
    }, 15000);
    return () => clearInterval(id);
  }, [pushNotification, account]);

  const activeSignal = signalsMap[activeSymbol]?.[selectedTf] || null;

  return (
    <div style={{ minHeight: "100dvh", background: T.ink, color: T.paper, fontFamily: FONT_BODY, maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin:0; }
        @keyframes slideDown { from { transform: translateY(-30px); opacity:0; } to { transform: translateY(0); opacity:1; } }
      `}</style>

      <Toast toast={activeToast} onDone={() => setActiveToast(null)} />

      <div style={{ background: T.card, borderBottom: `1px solid ${T.cardBorder}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 20 }}>
        <div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 19, fontWeight: 800, color: T.goldBright, letterSpacing: -0.3 }}>RainX</div>
          <div style={{ fontSize: 9.5, color: T.muted, fontWeight: 600, marginTop: -2 }}>Powered by Raina AI</div>
        </div>
        <button onClick={() => {
          setShowNotifPanel(true);
          const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
          setNotifications((list) => list.map((n) => ({ ...n, read: true })));
          if (account?.id && unreadIds.length) {
            supabase.from("user_notifications").update({ read: true }).eq("user_id", account.id).in("id", unreadIds).then(() => {}, () => {});
          }
        }} style={{ position: "relative", background: "none", border: "none", color: T.paper, cursor: "pointer" }}>
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: -6, right: -8, background: T.rust, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ paddingBottom: 78 }}>
        {tab === "home" && <HomeTab inst={inst} marketOpen={marketOpen} last={last} changePct={changePct} series={series} sma20={sma20} sma50={sma50} rsiVal={rsiVal} activeSignal={activeSignal} loading={loadingKey === `${activeSymbol}_${selectedTf}`} onRefresh={() => checkCandle(inst, TIMEFRAMES.find((t) => t.key === selectedTf))} activeSymbol={activeSymbol} setActiveSymbol={setActiveSymbol} signalsMap={signalsMap} selectedTf={selectedTf} setSelectedTf={setSelectedTf} entitlement={entitlement} onSubscribe={() => setTab("subscribe")} />}
        {tab === "markets" && <MarketsTab seriesMap={seriesMap} signalsMap={signalsMap} activeSymbol={activeSymbol} onSelect={(s) => { setActiveSymbol(s); setTab("home"); }} />}
        {tab === "community" && <CommunityTab account={account} />}
        {tab === "history" && <HistoryTab account={account} entitlement={entitlement} onSubscribe={() => setTab("subscribe")} />}
        {tab === "scalping" && <ScalpingTab account={account} entitlement={entitlement} onSubscribe={() => setTab("subscribe")} />}
        {tab === "subscribe" && <SubscribeScreen account={account} entitlement={entitlement} onBack={() => setTab("more")} />}
        {tab === "more" && <MoreTab autoScan={autoScan} setAutoScan={setAutoScan} analysis={activeSignal} inst={inst} last={last} account={account} onLogout={onLogout} setTab={setTab} entitlement={entitlement} />}
      </div>

      {showNotifPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: T.card, width: "88%", maxWidth: 380, height: "100%", padding: 18, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 17, color: T.goldBright, fontWeight: 700 }}>Notifications</div>
              <button onClick={() => setShowNotifPanel(false)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={20} /></button>
            </div>
            <BlurGate unlocked={hasAccess(entitlement.tier, "weekly")} requiredLabel="Weekly" onSubscribe={() => { setShowNotifPanel(false); setTab("subscribe"); }} minHeight={140}>
              {notifications.length === 0 ? (
                <div style={{ fontSize: 12, color: T.muted }}>Nothing yet. You'll only be notified for strong setups and trade updates — not every tick.</div>
              ) : notifications.map((n) => (
                <div key={n.id} style={{ borderBottom: `1px solid ${T.cardBorder}`, padding: "10px 0" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: n.type === "warning" ? T.rust : n.type === "update" ? T.sage : T.gold }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: T.paper, marginTop: 2, fontWeight: 500 }}>{n.body}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{n.time}</div>
                </div>
              ))}
            </BlurGate>
          </div>
        </div>
      )}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: T.card, borderTop: `1px solid ${T.cardBorder}`, display: "flex", justifyContent: "space-around", padding: "10px 0 14px" }}>
        {[["home", Home, "Home"], ["markets", Briefcase, "Markets"], ["community", Users2, "Community"], ["more", MoreHorizontal, "More"]].map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === key ? T.gold : T.muted, cursor: "pointer" }}>
            <Icon size={20} />
            <span style={{ fontSize: 10, fontFamily: FONT_HEAD, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Home tab ----------
function HomeTab({ inst, marketOpen, last, changePct, series, sma20, sma50, rsiVal, activeSignal, loading, onRefresh, activeSymbol, setActiveSymbol, signalsMap, selectedTf, setSelectedTf, entitlement, onSubscribe }) {
  return (
    <>
      <div style={{ display: "flex", gap: 6, padding: "12px 16px 0", overflowX: "auto" }}>
        {INSTRUMENTS.map((i) => {
          const combo = signalsMap[i.symbol];
          const anyBias = combo && Object.values(combo).find((s) => s.bias !== "hold" && s.status === "active");
          const dot = anyBias ? (anyBias.bias === "buy" ? T.sage : T.rust) : "transparent";
          const activeTab = i.symbol === activeSymbol;
          return (
            <button key={i.symbol} onClick={() => setActiveSymbol(i.symbol)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: activeTab ? T.gold : T.card, color: activeTab ? T.ink : T.paper, border: `1px solid ${activeTab ? T.gold : T.cardBorder}`, borderRadius: 20, padding: "6px 12px", fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />{i.symbol}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: FONT_HEAD, fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{last.toFixed(inst.digits)}</span>
          <span style={{ color: changePct >= 0 ? T.sage : T.rust, fontSize: 14, fontWeight: 700 }}>{changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(3)}%</span>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontWeight: 500 }}>{inst.name} · {inst.symbol}</div>
      </div>

      <div style={{ height: 150, margin: "12px 0" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series.slice(-80)}>
            <defs><linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.gold} stopOpacity={0.35} /><stop offset="100%" stopColor={T.gold} stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="t" hide /><YAxis domain={["auto", "auto"]} hide />
            <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 12 }} labelFormatter={() => ""} formatter={(v) => [v, "price"]} />
            <Area type="monotone" dataKey="price" stroke={T.gold} strokeWidth={2} fill="url(#goldFill)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 16px" }}>
        {[["SMA20", sma20 ? sma20.toFixed(inst.digits) : "—"], ["SMA50", sma50 ? sma50.toFixed(inst.digits) : "—"], ["RSI14", rsiVal ? rsiVal.toFixed(1) : "—"]].map(([label, val]) => (
          <div key={label} style={{ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: 0.5, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 15, color: T.paper, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Timeframe selector */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        {TIMEFRAMES.map((tf) => {
          const sig = signalsMap[activeSymbol]?.[tf.key];
          const dot = sig && sig.bias !== "hold" && sig.status === "active" ? (sig.bias === "buy" ? T.sage : T.rust) : "transparent";
          return (
            <button key={tf.key} onClick={() => setSelectedTf(tf.key)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, border: `1px solid ${selectedTf === tf.key ? T.gold : T.cardBorder}`, background: selectedTf === tf.key ? T.gold : T.card, color: selectedTf === tf.key ? T.ink : T.paper, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />{tf.label}
            </button>
          );
        })}
      </div>

      <div style={{ margin: "16px", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 18 }}>
        {!marketOpen ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 28 }}>🌙</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: T.goldBright, marginTop: 6, fontWeight: 700 }}>Market is closed</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4, fontWeight: 500 }}>{nextOpenLabel(inst.cls) || "Waiting for the session to open."}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 8, fontWeight: 500 }}>No new signals will load until trading resumes.</div>
          </div>
        ) : loading && !activeSignal ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.muted, fontSize: 13, fontWeight: 500 }}><Activity size={14} /> Raina is reading the market…</div>
        ) : activeSignal ? (
          <BlurGate unlocked={hasAccess(entitlement.tier, "weekly")} requiredLabel="Weekly" onSubscribe={onSubscribe} minHeight={220}>
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 700, color: T.goldBright }}>{inst.symbol}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{activeSignal.timeframeLabel} signal · generated {new Date(activeSignal.generatedAt).toLocaleTimeString()}</div>
                </div>
                <BiasChip bias={activeSignal.bias} />
              </div>

              {activeSignal.status !== "active" && (
                <div style={{ background: activeSignal.status === "tp_hit" ? `${T.sage}22` : `${T.rust}22`, border: `1px solid ${activeSignal.status === "tp_hit" ? T.sage : T.rust}`, borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12, color: T.paper, fontWeight: 600 }}>
                  {activeSignal.status === "tp_hit" ? "🎯 Take Profit hit on this signal." : "Stop Loss hit. Your capital was protected by our risk-management limits. We are analyzing the next high-probability market setup."}
                </div>
              )}

              {activeSignal.bias === "hold" ? (
                <>
                  <Row label="Confidence" value={`${activeSignal.confidence}%`} />
                  <div style={{ background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 10, marginTop: 8, fontSize: 11.5, color: T.muted, lineHeight: 1.6 }}>
                    No trade recommended right now - signals are mixed. No entry, stop loss, or take profit is being tracked for this call.
                  </div>
                </>
              ) : (
                <>
                  <Row label="Confidence" value={`${activeSignal.confidence}%`} />
                  <Row label="Entry" value={activeSignal.entry.toFixed(inst.digits)} />
                  <Row label="Stop Loss" value={activeSignal.stop_loss.toFixed(inst.digits)} color={T.rust} />
                  <Row label="Take Profit 1" value={activeSignal.take_profit_1.toFixed(inst.digits)} color={T.sage} />
                  <Row label="Take Profit 2" value={activeSignal.take_profit_2.toFixed(inst.digits)} color={T.sage} />
                  <Row label="Risk" value={activeSignal.risk_level} />
                  <Row label="Status" value={activeSignal.status === "active" ? "Active" : activeSignal.status === "tp_hit" ? "Take Profit hit" : "Stop Loss hit"} color={activeSignal.status === "tp_hit" ? T.sage : activeSignal.status === "sl_hit" ? T.rust : T.paper} />
                </>
              )}

              {activeSignal.milestones && activeSignal.milestones.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {activeSignal.milestones.map((m) => (
                    <span key={m} style={{ fontSize: 10.5, fontWeight: 700, color: T.sage, background: `${T.sage}22`, borderRadius: 6, padding: "3px 7px" }}>+{m} {inst.unit}</span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize: 10, color: T.muted, letterSpacing: 0.5, marginBottom: 4, fontWeight: 700 }}>RAINA'S READ</div>
                <div style={{ fontSize: 12.5, color: T.paper, lineHeight: 1.6, fontWeight: 500 }}>{activeSignal.reason}</div>
              </div>
            </>
          </BlurGate>
        ) : <div style={{ color: T.muted, fontSize: 13, fontWeight: 500 }}>No signal yet for this timeframe.</div>}
        {marketOpen && (
          <button onClick={onRefresh} disabled={loading} style={{ marginTop: 14, width: "100%", background: T.gold, color: T.ink, border: "none", borderRadius: 8, padding: "10px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Checking…" : "Check for update"}
          </button>
        )}
      </div>
      <div style={{ margin: "0 16px 16px", fontSize: 10.5, color: T.muted, lineHeight: 1.6, textAlign: "center", fontWeight: 500 }}>
        Live market data · signals refresh on candle close, not continuously · AI-generated commentary, not financial advice · no outcome is guaranteed.
      </div>
    </>
  );
}
function Row({ label, value, color }) {
  return <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}><span style={{ color: T.muted, fontWeight: 500 }}>{label}</span><span style={{ color: color || T.paper, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</span></div>;
}

// ---------- Markets tab ----------
function MarketsTab({ seriesMap, signalsMap, activeSymbol, onSelect }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: T.goldBright, fontWeight: 800, marginBottom: 12 }}>All markets</div>
      {INSTRUMENTS.map((i) => {
        const arr = seriesMap[i.symbol];
        const price = arr[arr.length - 1].price;
        const open = isMarketOpen(i.cls);
        const combo = signalsMap[i.symbol] || {};
        return (
          <button key={i.symbol} onClick={() => onSelect(i.symbol)} style={{ width: "100%", textAlign: "left", background: T.card, border: `1px solid ${i.symbol === activeSymbol ? T.gold : T.cardBorder}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer", color: T.paper }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{i.name}</div><div style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>{i.symbol}</div></div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{price.toFixed(i.digits)}</div>
                <div style={{ fontSize: 10, color: open ? T.sage : T.rust, fontWeight: 600 }}>{open ? "Open" : "Closed"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              {TIMEFRAMES.map((tf) => {
                const sig = combo[tf.key];
                if (!sig || sig.bias === "hold" || sig.status !== "active") return null;
                return (
                  <div key={tf.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: T.muted }}>
                    <span>{tf.label}:</span><BiasChip bias={sig.bias} />
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Chat tab (Raina) ----------
function ChatTab({ inst, analysis, last, account }) {
  const storageKey = `rainx:chat:${account?.email || "guest"}:${inst.symbol}`;
  const [messages, setMessages] = useState(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognitionCtor = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

  useEffect(() => {
    (async () => {
      try {
        const res = await storageGet(storageKey, false);
        setMessages(res ? JSON.parse(res.value) : [{ role: "assistant", text: `Hi, I'm Raina. Ask me anything about ${inst.name} — e.g. "should I enter now?"` }]);
      } catch {
        setMessages([{ role: "assistant", text: `Hi, I'm Raina. Ask me anything about ${inst.name} — e.g. "should I enter now?"` }]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = async (list) => { try { await storageSet(storageKey, JSON.stringify(list), false); } catch {} };

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || busy || !messages) return;
    const next = [...messages, { role: "user", text }];
    setMessages(next); persist(next);
    setInput(""); setBusy(true);
    const context = analysis
      ? `${inst.name} (${inst.symbol}) current price ${last.toFixed(inst.digits)}. Latest read: ${analysis.bias} bias, ${analysis.confidence}% confidence, entry ${analysis.entry}, SL ${analysis.stop_loss}, TP1 ${analysis.take_profit_1}, TP2 ${analysis.take_profit_2}, risk ${analysis.risk_level}, timeframe ${analysis.timeframe}. Reason: ${analysis.reason}`
      : `${inst.name} (${inst.symbol}) current price ${last.toFixed(inst.digits)}. No fresh analysis available yet.`;
    const reply = await askRaina(next, context);
    const withReply = [...next, { role: "assistant", text: reply }];
    setMessages(withReply); persist(withReply);
    setBusy(false);
  };

  const toggleRecording = () => {
    if (!SpeechRecognitionCtor) return;
    if (recording) { recognitionRef.current && recognitionRef.current.stop(); setRecording(false); return; }
    const rec = new SpeechRecognitionCtor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => { const transcript = e.results[0][0].transcript; send(transcript); };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    setRecording(true);
    rec.start();
  };

  if (!messages) return <div style={{ padding: 16, color: T.muted, fontSize: 13 }}>Loading conversation…</div>;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: T.goldBright, fontWeight: 800, marginBottom: 10 }}>Raina — {inst.symbol}</div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? T.gold : T.card, color: m.role === "user" ? T.ink : T.paper, border: m.role === "user" ? "none" : `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "8px 12px", maxWidth: "85%", fontSize: 12.5, lineHeight: 1.5, fontWeight: 500 }}>{m.text}</div>
        ))}
        {busy && <div style={{ color: T.muted, fontSize: 12, fontWeight: 500 }}>Raina is thinking…</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={recording ? "Listening…" : "Should I enter now?"} style={{ ...inputStyle }} />
        <button onClick={toggleRecording} disabled={!SpeechRecognitionCtor} title={SpeechRecognitionCtor ? "Voice input" : "Voice input not supported in this browser"} style={{ background: recording ? T.rust : T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "0 12px", cursor: SpeechRecognitionCtor ? "pointer" : "not-allowed", opacity: SpeechRecognitionCtor ? 1 : 0.4 }}>
          {recording ? <Square size={16} color="#fff" /> : <Mic size={16} color={T.paper} />}
        </button>
        <button onClick={() => send()} disabled={busy} style={{ background: T.gold, border: "none", borderRadius: 8, padding: "0 14px", cursor: "pointer" }}><Send size={16} color={T.ink} /></button>
      </div>
      <div style={{ fontSize: 10, color: T.muted, marginTop: 8, textAlign: "center", fontWeight: 500 }}>
        {SpeechRecognitionCtor ? "Tap the mic to talk · " : ""}Your conversation history is saved to this account and instrument.
      </div>
    </div>
  );
}

// ---------- More tab ----------
const SAMPLE_CALENDAR = [
  { time: "13:30 UTC", currency: "USD", impact: "High", event: "Non-Farm Payrolls" },
  { time: "14:00 UTC", currency: "EUR", impact: "Medium", event: "ECB Rate Decision" },
  { time: "18:00 UTC", currency: "USD", impact: "High", event: "FOMC Statement" },
  { time: "01:30 UTC", currency: "JPY", impact: "Low", event: "Trade Balance" },
];
// ---------- Trade history ----------
function HistoryTab({ account, entitlement, onSubscribe }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!account?.id) { setRows([]); return; }
    (async () => {
      const { data } = await supabase.from("trade_history").select("*").eq("user_id", account.id).order("closed_at", { ascending: false }).limit(100);
      setRows(data || []);
    })();
  }, [account?.id]);

  if (rows === null) return <div style={{ padding: 16, color: T.muted, fontSize: 13 }}>Loading history…</div>;

  const wins = rows.filter((r) => r.result === "tp").length;
  const losses = rows.filter((r) => r.result === "sl").length;
  const netPoints = rows.reduce((sum, r) => sum + Number(r.points), 0);
  const unlocked = hasAccess(entitlement.tier, "weekly");

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: T.goldBright, fontWeight: 800, marginBottom: 12 }}>Trade History</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["Closed trades", rows.length], ["Wins", wins], ["Losses", losses], ["Net points", netPoints]].map(([l, v]) => (
          <div key={l} style={{ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 8, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: T.muted }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.paper }}>{v}</div>
          </div>
        ))}
      </div>

      <BlurGate unlocked={unlocked} requiredLabel="Weekly" onSubscribe={onSubscribe} minHeight={200}>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: T.muted }}>No closed trades yet. This fills in automatically once a signal hits Take Profit or Stop Loss.</div>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: r.direction === "buy" ? T.sage : T.rust }}>{r.symbol} · {r.direction.toUpperCase()} · {r.timeframe}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: r.result === "tp" ? T.sage : T.rust }}>{r.result === "tp" ? "🎯 TP" : "⛔ SL"} {r.points >= 0 ? "+" : ""}{r.points}</div>
            </div>
            <div style={{ fontSize: 10.5, color: T.muted, marginTop: 4 }}>Entry {r.entry} · SL {r.stop_loss} · TP {r.take_profit}</div>
            {r.reason && <div style={{ fontSize: 11, color: T.paper, marginTop: 4, lineHeight: 1.5 }}>{r.reason}</div>}
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{new Date(r.closed_at).toLocaleString()}</div>
          </div>
        ))
      )}
      </BlurGate>
    </div>
  );
}


// ---------- Scalping ----------
function ScalpingTab({ account, entitlement, onSubscribe }) {
  const [intro, setIntro] = useState("");
  const unlocked = hasAccess(entitlement.tier, "monthly");

  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "scalping_intro").single().then(({ data }) => setIntro(data?.value || ""));
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: T.goldBright, fontWeight: 800, marginBottom: 4 }}>Scalping</div>
      <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 16, lineHeight: 1.6 }}>{intro}</div>

      <BlurGate unlocked={unlocked} requiredLabel="Monthly" onSubscribe={onSubscribe} minHeight={260}>
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.goldBright, marginBottom: 10 }}>Fast-timeframe setups</div>
          <div style={{ fontSize: 12.5, color: T.paper, lineHeight: 1.7 }}>
            This is a read-only feed of quick, short-term setups meant for manual scalping in your own MT5 account. Follow the instructions on each setup - RainX doesn't place trades for you.
          </div>
          <div style={{ marginTop: 14, fontSize: 11.5, color: T.muted, lineHeight: 1.7 }}>
            1. Open your MT5 platform<br />
            2. Match the symbol shown here to your broker's listing<br />
            3. Enter manually using the entry/SL/TP shown<br />
            4. Manage the trade yourself - RainX only provides the read
          </div>
        </div>
      </BlurGate>
    </div>
  );
}

function MoreTab({ autoScan, setAutoScan, analysis, inst, last, account, onLogout, setTab, entitlement }) {
  const [accountSize, setAccountSize] = useState(1000);
  const [riskPct, setRiskPct] = useState(1);
  const [showLegal, setShowLegal] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const slDistance = analysis ? Math.abs(last - analysis.stop_loss) : null;
  const riskAmount = (accountSize * riskPct) / 100;
  const lotSuggestion = slDistance ? (riskAmount / slDistance).toFixed(4) : null;
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!account?.id) return;
    supabase.from("profiles").select("username, bio, avatar_url").eq("id", account.id).single().then(({ data }) => {
      if (data) { setUsername(data.username || ""); setBio(data.bio || ""); setAvatarUrl(data.avatar_url || null); }
    });
  }, [account?.id]);

  const compressImage = (file, maxDim = 300, quality = 0.7) => new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
      else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });

  const uploadAvatar = async (file) => {
    setUploadingAvatar(true);
    try {
      const blob = await compressImage(file);
      const path = `${account.id}/avatar.jpg`;
      await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const bustCache = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: bustCache }).eq("id", account.id);
      setAvatarUrl(bustCache);
    } catch { setProfileMsg("Photo upload failed."); }
    setUploadingAvatar(false);
  };

  const saveProfile = async () => {
    setSavingProfile(true); setProfileMsg("");
    const clean = username.trim() ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") : null;
    const { error } = await supabase.from("profiles").update({ username: clean, bio: bio.trim() }).eq("id", account.id);
    setSavingProfile(false);
    setProfileMsg(error ? (error.code === "23505" ? "That username is taken." : "Something went wrong.") : "Saved.");
  };


  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: T.goldBright, fontWeight: 800, marginBottom: 12 }}>More</div>

      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 6, marginBottom: 16 }}>
        {[
          ["subscribe", CreditCardIcon, "Subscription", entitlement.tier === "none" ? "Not subscribed" : `${PLAN_LABELS[entitlement.tier]} plan`],
          ["history", ScrollText, "Trade History", null],
          ["scalping", Zap, "Scalping", hasAccess(entitlement.tier, "monthly") ? "Unlocked" : "Locked"],
        ].map(([key, Icon, label, sub]) => (
          <button key={key} onClick={() => setTab(key)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: "12px 10px", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon size={16} color={T.gold} />
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper }}>{label}</span>
            </div>
            {sub && <span style={{ fontSize: 10.5, color: T.muted }}>{sub}</span>}
          </button>
        ))}
      </div>

      <Section title="Account" icon={ShieldCheck}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{account?.email}</div>
        <div style={{ fontSize: 10.5, color: T.muted, marginTop: 6 }}>Member since {new Date(account?.joinedAt || Date.now()).toLocaleDateString()}</div>
        <button onClick={onLogout} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "8px 12px", color: T.rust, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          <LogOut size={14} /> Log out
        </button>
      </Section>

      <Section title="Community Profile" icon={Users2}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, fontWeight: 800, fontFamily: FONT_HEAD }}>{(username || account.email)[0]?.toUpperCase()}</div>
          )}
          <label style={{ background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "7px 12px", color: T.paper, fontSize: 11.5, cursor: "pointer" }}>
            {uploadingAvatar ? "Uploading…" : "Change photo"}
            <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadAvatar(e.target.files[0])} style={{ display: "none" }} disabled={uploadingAvatar} />
          </label>
        </div>
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Username (shown on Community posts)</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Leave blank to show your email instead" style={{ ...inputStyle, width: "100%", marginTop: 4, marginBottom: 10 }} />
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Bio</label>
        <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Say something about yourself" style={{ ...inputStyle, width: "100%", marginTop: 4, marginBottom: 10 }} />
        {profileMsg && <div style={{ fontSize: 11, color: profileMsg === "Saved." ? T.sage : T.rust, marginBottom: 8 }}>{profileMsg}</div>}
        <button onClick={saveProfile} disabled={savingProfile} style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 8, padding: "8px 14px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          {savingProfile ? "Saving…" : "Save"}
        </button>
      </Section>

      <Section title="Settings" icon={Settings}>
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "6px 0", fontWeight: 500 }}>
          Background scan (checks for new 15M/1H candles automatically)
          <input type="checkbox" checked={autoScan} onChange={(e) => setAutoScan(e.target.checked)} />
        </label>
        {typeof Notification !== "undefined" && Notification.permission !== "granted" && (
          <button onClick={() => Notification.requestPermission()} style={{ marginTop: 6, fontSize: 11, color: T.gold, background: "none", border: `1px solid ${T.gold}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}>Enable push notifications</button>
        )}
      </Section>

      <Section title="Risk calculator" icon={Calculator}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <label style={{ flex: 1, fontSize: 11, color: T.muted, fontWeight: 600 }}>Account ($)<input type="number" value={accountSize} onChange={(e) => setAccountSize(Number(e.target.value) || 0)} style={{ ...inputStyle, width: "100%", marginTop: 4 }} /></label>
          <label style={{ flex: 1, fontSize: 11, color: T.muted, fontWeight: 600 }}>Risk / trade (%)<input type="number" value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value) || 0)} style={{ ...inputStyle, width: "100%", marginTop: 4 }} /></label>
        </div>
        {analysis && slDistance ? (
          <>
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, fontWeight: 500 }}>Based on {inst.symbol}'s current stop distance, risking ${riskAmount.toFixed(2)} suggests:</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: T.goldBright, fontWeight: 800 }}>{lotSuggestion} units</div>
          </>
        ) : <div style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>Open an active signal on Home to size a position.</div>}
      </Section>

      <Section title="Economic calendar" icon={CalendarIcon}>
        {SAMPLE_CALENDAR.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "5px 0", borderBottom: i < SAMPLE_CALENDAR.length - 1 ? `1px solid ${T.cardBorder}` : "none", fontWeight: 500 }}>
            <span style={{ color: T.muted, width: 70 }}>{e.time}</span>
            <span style={{ color: T.paper, flex: 1 }}>{e.currency} · {e.event}</span>
            <span style={{ color: e.impact === "High" ? T.rust : e.impact === "Medium" ? T.gold : T.muted, fontWeight: 700 }}>{e.impact}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>Sample events shown pending a live calendar connection.</div>
      </Section>

      <Section title="Legal" icon={FileText}>
        <button onClick={() => setShowLegal(true)} style={{ background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "8px 12px", color: T.paper, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          Terms & Risk Disclosure
        </button>
      </Section>

      <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.6, textAlign: "center", marginTop: 10, fontWeight: 500 }}>
        RainX is an analysis tool, not a broker. Nothing here is financial advice, and no outcome is guaranteed.
      </div>

      {showLegal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 70, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: T.card, width: "100%", maxWidth: 480, margin: "0 auto", borderRadius: "16px 16px 0 0", padding: 22, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 17, color: T.goldBright, fontWeight: 800 }}>Terms & Risk Disclosure</div>
              <button onClick={() => setShowLegal(false)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ fontSize: 12, color: T.paper, lineHeight: 1.7, fontWeight: 500 }}>
              <p><strong>Not financial advice.</strong> RainX and Raina AI provide market analysis and educational commentary only. Nothing in this app is a recommendation to buy, sell, or hold any financial instrument.</p>
              <p><strong>No guaranteed outcomes.</strong> Trading forex, metals, indices, and crypto carries a high level of risk and may not be suitable for all investors. Past performance and AI-generated confidence scores do not guarantee future results. You can lose some or all of your invested capital.</p>
              <p><strong>Your responsibility.</strong> You are solely responsible for your own trading decisions, position sizing, and risk management. RainX does not execute trades and is not a broker.</p>
              <p><strong>Data.</strong> Market data and analysis in this app may be simulated or delayed pending a live data connection. Always verify prices with your broker before acting.</p>
              <p><strong>Account data.</strong> Your email and a securely hashed password are stored to provide account access. We do not sell your data.</p>
              <p style={{ color: T.muted, fontSize: 10.5 }}>This is placeholder legal text and not a substitute for review by a qualified lawyer before public launch.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_HEAD, fontSize: 14, color: T.goldBright, fontWeight: 700, marginBottom: 8 }}><Icon size={15} /> {title}</div>
      {children}
    </div>
  );
}

// ---------- Install banner ----------
// Uses the real browser "beforeinstallprompt" event. This only fires once RainX
// is actually deployed as a standalone site with manifest.json linked in the HTML
// head - it won't trigger inside the Claude artifact preview itself.
function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
      const id = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(id);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const onTouchStart = (e) => { dragging.current = true; startX.current = e.touches[0].clientX; };
  const onTouchMove = (e) => { if (dragging.current) setDragX(e.touches[0].clientX - startX.current); };
  const onTouchEnd = () => { dragging.current = false; if (Math.abs(dragX) > 80) setVisible(false); else setDragX(0); };

  return (
    <div
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ position: "fixed", top: 10, left: 10, right: 10, maxWidth: 460, margin: "0 auto", zIndex: 110, background: T.card, border: `1px solid ${T.gold}`, borderRadius: 12, padding: "10px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 10, fontFamily: FONT_BODY, transform: `translateX(${dragX}px)`, opacity: Math.max(0, 1 - Math.abs(dragX) / 200), transition: dragging.current ? "none" : "transform 0.2s, opacity 0.2s" }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, color: T.goldBright }}>Install RainX</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Add to your home screen for quick access</div>
      </div>
      <button
        onClick={async () => { setVisible(false); deferredPrompt.prompt(); await deferredPrompt.userChoice; setDeferredPrompt(null); }}
        style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 8, padding: "7px 12px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}
      >
        Install
      </button>
    </div>
  );
}

// ---------- Root ----------
function sessionToAccount(session) {
  if (!session || !session.user) return null;
  return { id: session.user.id, email: session.user.email, joinedAt: session.user.created_at };
}

export default function RainX() {
  const [account, setAccount] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAccount(sessionToAccount(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccount(sessionToAccount(session));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (account) recordActivity(account.id, "logout");
    await supabase.auth.signOut();
    setAccount(null);
  };

  if (account === undefined) return <div style={{ minHeight: "100dvh", background: T.ink }} />;
  if (!account) return <><InstallBanner /><AuthScreen onAuthed={(session) => setAccount(sessionToAccount(session))} /></>;
  return <><InstallBanner /><MainApp account={account} onLogout={handleLogout} /></>;
}
