import React, { useState, useEffect, useRef, useCallback } from "react";
import { Area, ComposedChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  Bell, Home, Briefcase, MessageCircle, MoreHorizontal, Settings, X,
  TrendingUp, TrendingDown, Minus, Activity, Send, Calendar as CalendarIcon,
  Calculator, Mail, ShieldCheck, LogOut, Mic, Square, FileText, ScrollText, Users2,
  CreditCard as CreditCardIcon, Zap, ArrowRight, ChevronRight, ChevronLeft, Wallet, Landmark, Gift, Trophy,
  Maximize2, Menu, Lock, Smartphone, Eye, EyeOff, Key, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import CommunityTab from "./CommunityTab";
import FullChartView from "./FullChartView";
import LightweightChart from "./LightweightChart";

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
// Light and dark token palettes – applied by mutating T in-place inside MainAppContent
const DARK_TOKENS  = { ink:"#0F0E0B", card:"#1C1913", cardBorder:"#332C1F", gold:"#C6A15B", goldBright:"#E3C077", sage:"#7A9E86",  rust:"#B0604A", paper:"#F2EDE0", muted:"#9C947F" };
const LIGHT_TOKENS = { ink:"#FFFFFF",  card:"#F7F9F9", cardBorder:"#EFF3F4", gold:"#C6A15B", goldBright:"#9E7B35", sage:"#1A7A50",  rust:"#C0392B", paper:"#0F1419", muted:"#536471" };
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

// ---------- Asset catalog --------------------------------------------------------
const ASSET_CATALOG = [
  { id:"crypto",  label:"Crypto",  emoji:"₿",  assets:[
    { symbol:"BTCUSD",  name:"Bitcoin",   base:64000, vol:250,  digits:1, cls:"crypto" },
    { symbol:"ETHUSD",  name:"Ethereum",  base:1850,  vol:15,   digits:2, cls:"crypto" },
    { symbol:"SOLUSD",  name:"Solana",    base:140,   vol:3,    digits:2, cls:"crypto" },
    { symbol:"BNBUSD",  name:"BNB",       base:420,   vol:8,    digits:2, cls:"crypto" },
    { symbol:"XRPUSD",  name:"XRP",       base:0.52,  vol:0.02, digits:4, cls:"crypto" },
    { symbol:"DOGEUSD", name:"Dogecoin",  base:0.12,  vol:0.005,digits:4, cls:"crypto" },
  ]},
  { id:"forex",   label:"Forex",   emoji:"$",  assets:[
    { symbol:"EURUSD",  name:"Euro / Dollar",  base:1.085, vol:0.002,digits:5,cls:"forex" },
    { symbol:"GBPUSD",  name:"Pound / Dollar", base:1.265, vol:0.003,digits:5,cls:"forex" },
    { symbol:"USDJPY",  name:"Dollar / Yen",   base:149,   vol:0.3,  digits:3,cls:"forex" },
    { symbol:"AUDUSD",  name:"Aussie / Dollar",base:0.645, vol:0.002,digits:5,cls:"forex" },
    { symbol:"USDCAD",  name:"Dollar / CAD",   base:1.36,  vol:0.002,digits:5,cls:"forex" },
    { symbol:"USDCHF",  name:"Dollar / Swiss", base:0.895, vol:0.002,digits:5,cls:"forex" },
    { symbol:"NZDUSD",  name:"Kiwi / Dollar",  base:0.595, vol:0.002,digits:5,cls:"forex" },
  ]},
  { id:"metals",  label:"Metals",  emoji:"Au", assets:[
    { symbol:"XAUUSD",  name:"Gold",   base:4020, vol:8,   digits:2,cls:"metal" },
    { symbol:"XAGUSD",  name:"Silver", base:28,   vol:0.3, digits:3,cls:"metal" },
  ]},
  { id:"energy",  label:"Energy",  emoji:"⚡", assets:[
    { symbol:"USOIL",   name:"US Oil (WTI)",  base:82, vol:0.8,digits:2,cls:"energy" },
    { symbol:"UKOIL",   name:"UK Oil (Brent)",base:86, vol:0.8,digits:2,cls:"energy" },
  ]},
  { id:"indices", label:"Indices", emoji:"#",  assets:[
    { symbol:"NAS100",  name:"NASDAQ 100", base:17000, vol:80,  digits:1,cls:"index" },
    { symbol:"SPX500",  name:"S&P 500",    base:5200,  vol:25,  digits:1,cls:"index" },
    { symbol:"US30",    name:"Dow Jones",  base:38500, vol:120, digits:1,cls:"index" },
    { symbol:"GER40",   name:"DAX 40",     base:18200, vol:100, digits:1,cls:"index" },
  ]},
];
const ALL_ASSETS = ASSET_CATALOG.flatMap(c => c.assets.map(a => ({ ...a, category:c.id })));
// Keep INSTRUMENTS as the 3 default chart-data assets (price engine seeded for these)
const INSTRUMENTS = ALL_ASSETS;

// ---------- Analysis durations -----------------------------------------------
const ANALYSIS_DURATIONS = [
  { key:"15m", label:"15 MIN",  sublabel:"Fast market analysis",    secs:15*60 },
  { key:"30m", label:"30 MIN",  sublabel:"Short-term setup",        secs:30*60 },
  { key:"1h",  label:"1 HOUR",  sublabel:"Intraday analysis",       secs:60*60 },
  { key:"2h",  label:"2 HOURS", sublabel:"Extended intraday",       secs:2*60*60 },
  { key:"4h",  label:"4 HOURS", sublabel:"Session analysis",        secs:4*60*60 },
  { key:"1d",  label:"1 DAY",   sublabel:"Daily market analysis",   secs:24*60*60 },
];

const STEP_DEFS = [
  { id:"structure", label:"Market Structure", done:"Identified" },
  { id:"sr",        label:"Support & Resistance", done:"Mapped" },
  { id:"trend",     label:"Trend Direction", done:"Bullish" },
  { id:"entry",     label:"Entry Zone", done:"Watching" },
  { id:"confirm",   label:"Confirmation", done:"Pending" },
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
// ---------- Tick → OHLCV conversion for candlestick chart ----------------------
function ticksToCandles(ticks, count = 70) {
  if (!ticks || ticks.length < 2) return [];
  const size = Math.max(1, Math.floor(ticks.length / count));
  const out = [];
  for (let i = 0; i + size <= ticks.length; i += size) {
    const chunk = ticks.slice(i, i + size);
    const prices = chunk.map(p => p.price);
    const open = prices[0], close = prices[prices.length - 1];
    const rawHi = Math.max(...prices), rawLo = Math.min(...prices);
    const spread = Math.max(rawHi - rawLo, 0.0001);
    out.push({
      t: chunk[0].t,
      open, close,
      high: rawHi + spread * (0.1 + Math.random() * 0.25),
      low:  rawLo - spread * (0.1 + Math.random() * 0.25),
    });
  }
  return out.slice(-count);
}

// ---------- Live price engine (yfinance via Raina-AI bot — no API key needed) ----------
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
        const res = await fetch(`/api/price?symbol=${encodeURIComponent(inst.symbol)}`);
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

    // Seed ALL markets in parallel immediately — no staggering needed since
    // we hit our own Railway backend (no rate limits).
    const seedAll = async () => {
      await Promise.all(INSTRUMENTS.map(async (inst) => {
        if (cancelled) return;
        if (!isMarketOpen(inst.cls)) return;
        try {
          const res = await fetch(`/api/price?symbol=${encodeURIComponent(inst.symbol)}`);
          const data = await res.json();
          const price = data && data.price ? Number(data.price) : null;
          if (price && !cancelled) {
            setSeriesMap((prev) => ({ ...prev, [inst.symbol]: seedSeriesFromPrice(inst, price) }));
          }
        } catch { /* keep the placeholder shape for this one market if the seed fetch fails */ }
      }));
    };

    let i = 0;
    const rotate = () => { fetchOne(INSTRUMENTS[i % INSTRUMENTS.length]); i += 1; };

    seedAll();
    const id = setInterval(rotate, 8000);
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
const getInputStyle = () => ({ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.paper, padding: 10, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500 });

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
      if (signErr) {
        const msg = signErr.message || "";
        setError(
          msg.toLowerCase().includes("rate limit")
            ? "Too many signup attempts right now — Supabase limits confirmation emails. Please try again in a few minutes."
            : msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")
            ? "An account with this email already exists. Try signing in instead."
            : msg || "Signup failed. Please try again."
        );
        setBusy(false); return;
      }
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
// ── Subscribe screen plan definitions ──────────────────────────────────────
const SUB_PLANS = [
  {
    key: "weekly",
    label: "Weekly",
    tag: "Best for short term",
    price: "¢120.00",
    period: "/ week",
    billing: "Billed every week",
    features: [
      { text: "Free Daily Trade Signals",        sub: "60–90% accuracy signals to help you trade smarter" },
      { text: "Blue Verification Badge",         sub: "Stand out with a verified premium profile" },
      { text: "Access to Post Gift Rewards",     sub: "Receive and send exclusive gift rewards" },
      { text: "Advanced Market Insights",        sub: "Get deeper analysis and market trends" },
      { text: "Priority Support",                sub: "Faster response, anytime you need help" },
      { text: "Cancel Anytime",                  sub: "No long-term commitment. Cancel anytime." },
    ],
  },
  {
    key: "monthly",
    label: "Monthly",
    tag: "Most popular",
    price: "¢380.00",
    period: "/ month",
    billing: "Billed every month",
    features: [
      { text: "Everything in Weekly" },
      { text: "Golden Verification Badge",       sub: "Exclusive premium tier recognition" },
      { text: "Scalping Setups",                 sub: "Advanced short-term trade setups" },
      { text: "Priority Signal Alerts",          sub: "Telegram + in-app push notifications" },
      { text: "Exclusive Market Reports",        sub: "Weekly professional analysis reports" },
      { text: "Cancel Anytime",                  sub: "No long-term commitment. Cancel anytime." },
    ],
  },
  {
    key: "biannual",
    label: "Bi-Annually",
    tag: "Best value",
    price: "¢680.00",
    period: "/ 6 months",
    billing: "Billed every 6 months",
    features: [
      { text: "Everything in Monthly" },
      { text: "Bi-Annual Premium Badge",         sub: "Highest verification tier on RainX" },
      { text: "VIP Community Access",            sub: "Exclusive trader lounge & signals group" },
      { text: "Personal AI Analysis Sessions",   sub: "Extended Raina AI session time" },
      { text: "Highest Rewards Multiplier",      sub: "2× points on all activity" },
      { text: "Cancel Anytime",                  sub: "No long-term commitment. Cancel anytime." },
    ],
  },
];

function SubscribeScreen({ account, entitlement, onBack }) {
  const [methods, setMethods] = useState(null);
  const [activePlanIdx, setActivePlanIdx] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from("payment_methods").select("*").eq("enabled", true).order("sort_order").then(({ data }) => setMethods(data || []));
  }, []);

  const plan = SUB_PLANS[activePlanIdx];

  const submitPayment = async () => {
    setBusy(true);
    await supabase.from("payments").insert({ user_id: account.id, plan: plan.key, reference_note: note || null });
    recordActivity(account.id, "payment_submitted", { plan: plan.key });
    setBusy(false);
    setSubmitted(true);
    entitlement.refresh();
  };

  // Pending / submitted state
  if (entitlement.pendingPlan || submitted) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `rgba(198,161,91,0.12)`, border: `2px solid ${T.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <ShieldCheck size={30} color={T.gold} />
        </div>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 17, color: T.paper, marginBottom: 8 }}>Payment Submitted!</div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>
          Your {PLAN_LABELS[entitlement.pendingPlan || plan.key]} plan request is awaiting confirmation. Access unlocks automatically once an admin approves your payment.
        </div>
        <button onClick={onBack} style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 12, padding: "12px 32px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Back to More
        </button>
      </div>
    );
  }

  // Payment method detail
  if (selectedMethod) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setSelectedMethod(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 800, color: T.goldBright, marginBottom: 12 }}>{selectedMethod.name}</div>
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: T.paper, lineHeight: 1.7, marginBottom: 14, whiteSpace: "pre-wrap" }}>{selectedMethod.instructions}</div>
          {selectedMethod.image_url && (
            <img src={selectedMethod.image_url} alt="Payment details" style={{ width: "100%", borderRadius: 10, marginBottom: 14 }} />
          )}
        </div>
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>Payment reference (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. transaction ID" style={{ ...getInputStyle(), width: "100%", marginBottom: 14 }} />
        <button onClick={submitPayment} disabled={busy} style={{ width: "100%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`, color: T.ink, border: "none", borderRadius: 13, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          {busy ? "Submitting…" : "I've Paid — Confirm →"}
        </button>
      </div>
    );
  }

  // Choose payment method
  if (false) { /* handled below inline */ }

  // Main plan picker
  return (
    <div style={{ background: T.ink, minHeight: "100%", paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "24px 20px 16px" }}>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 20, color: T.goldBright, marginBottom: 4 }}>Upgrade Plan</div>
        <div style={{ fontSize: 12.5, color: T.muted }}>Choose the plan that works best for you</div>
      </div>

      {/* Gold badge icon */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${T.goldBright}, ${T.gold})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 28px ${T.gold}55` }}>
          <ShieldCheck size={38} color="#fff" strokeWidth={1.8} />
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 24, padding: "0 20px" }}>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 19, color: T.paper, marginBottom: 5 }}>Unlock More. Earn More.</div>
        <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>Get premium tools, rewards, and insights{"\n"}to stay ahead in the market.</div>
      </div>

      {/* Plan tabs */}
      <div style={{ margin: "0 16px 16px", background: T.card, borderRadius: 14, padding: 4, display: "flex", gap: 2 }}>
        {SUB_PLANS.map((p, i) => (
          <button
            key={p.key}
            onClick={() => setActivePlanIdx(i)}
            style={{
              flex: 1, padding: "10px 4px", borderRadius: 11,
              background: activePlanIdx === i ? T.gold : "transparent",
              border: "none", cursor: "pointer",
              fontFamily: FONT_HEAD, fontWeight: 700,
              color: activePlanIdx === i ? T.ink : T.muted,
              fontSize: 11.5, lineHeight: 1.3, textAlign: "center",
            }}
          >
            <div>{p.label}</div>
            <div style={{ fontSize: 9.5, fontWeight: 600, marginTop: 1, opacity: 0.85 }}>{p.tag}</div>
          </button>
        ))}
      </div>

      {/* Plan card */}
      <div style={{ margin: "0 16px 16px", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 18, padding: 20, position: "relative", overflow: "hidden" }}>
        {/* Price + gold bars */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.goldBright, marginBottom: 6 }}>{plan.label} Plan</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 30, color: T.paper }}>{plan.price}</span>
              <span style={{ fontSize: 13, color: T.muted, fontFamily: FONT_HEAD }}>{plan.period}</span>
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{plan.billing}</div>
          </div>
          <GoldBarsIcon />
        </div>

        {/* Feature list */}
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {plan.features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: `rgba(198,161,91,0.15)`, border: `1px solid ${T.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 11, color: T.gold, fontWeight: 800 }}>✓</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper }}>{f.text}</div>
                {f.sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 1, lineHeight: 1.5 }}>{f.sub}</div>}
              </div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 10, color: T.ink, fontWeight: 800 }}>✓</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment methods secure strip */}
      <div style={{ margin: "0 16px 16px", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <ShieldCheck size={18} color={T.goldBright} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, color: T.goldBright }}>Secure &amp; Trusted Payments</div>
          <div style={{ fontSize: 10.5, color: T.muted, marginTop: 1 }}>Your payment information is fully encrypted</div>
        </div>
        {/* Payment logos */}
        <div style={{ display: "flex", gap: 6 }}>
          {["VISA", "MC", "MTN"].map(m => (
            <div key={m} style={{ background: m === "VISA" ? "#1434CB" : m === "MC" ? "#EB001B" : "#FFCC00", borderRadius: 4, padding: "3px 6px", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 9, color: m === "MTN" ? "#000" : "#fff" }}>{m}</div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {methods === null ? (
        <div style={{ margin: "0 16px", background: T.gold, borderRadius: 14, padding: "15px 0", textAlign: "center", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15, color: T.ink, cursor: "pointer" }}>
          Loading…
        </div>
      ) : methods.length === 0 ? (
        <div style={{ margin: "0 16px 8px", background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`, borderRadius: 14, padding: "15px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          onClick={() => alert("No payment methods configured. Please contact support.")}>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15, color: T.ink }}>Subscribe Now</span>
          <span style={{ fontSize: 20, color: T.ink }}>→</span>
        </div>
      ) : methods.length === 1 ? (
        <button onClick={() => setSelectedMethod(methods[0])} style={{ margin: "0 16px 8px", width: "calc(100% - 32px)", background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`, color: T.ink, border: "none", borderRadius: 14, padding: "15px 20px", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Subscribe Now</span><span style={{ fontSize: 20 }}>→</span>
        </button>
      ) : (
        <div style={{ margin: "0 16px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {methods.map(m => (
            <button key={m.id} onClick={() => setSelectedMethod(m)} style={{ width: "100%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`, color: T.ink, border: "none", borderRadius: 14, padding: "13px 20px", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Subscribe via {m.name}</span><span style={{ fontSize: 18 }}>→</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }}>
        <ShieldCheck size={12} color={T.muted} />
        <span style={{ fontSize: 11, color: T.muted, fontFamily: FONT_HEAD }}>14-Day Money Back Guarantee</span>
      </div>
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
  // ─── Analysis session (declared early — used in activeInst derivation below) ─
  const [session, setSession] = useState(null);
  // session = { symbol, name, duration, startTime, endTime, stepIndex, steps, activities, overlays, setup, state }
  const activeInst = ALL_ASSETS.find(i => i.symbol === (session?.symbol || activeSymbol)) || ALL_ASSETS.find(i => i.symbol === "XAUUSD");
  const inst = activeInst;
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

  // ─── Analysis session step progression engine
  useEffect(() => {
    if (!session || session.state !== "analyzing") return;
    if (session.stepIndex >= STEP_DEFS.length) return;
    const delay = 2800 + Math.random() * 3200;
    const id = setTimeout(() => {
      setSession(prev => {
        if (!prev || prev.stepIndex !== session.stepIndex) return prev;
        const ni = prev.stepIndex + 1;
        const steps = STEP_DEFS.map((s, i) => ({ ...s, status: i < ni ? "done" : i === ni ? "active" : "pending" }));
        // Build overlays for this step
        const base = prev.overlays.filter(o => o._step !== prev.stepIndex);
        const inst2 = ALL_ASSETS.find(a => a.symbol === prev.symbol) || ALL_ASSETS[0];
        const price = (seriesMapRef.current[prev.symbol] || []).slice(-1)[0]?.price || inst2.base;
        const vol = inst2.vol;
        let newOverlays = [...base];
        if (prev.stepIndex === 0) {
          // Step 0: Market structure — trendline + swing highs/lows + structure labels
          newOverlays.push({ _step:0, type:"trendline",        price1: price - vol*6, price2: price - vol*1, label:"Uptrend Line" });
          newOverlays.push({ _step:0, type:"swing_high",       price: price + vol*4, idx: 8  });
          newOverlays.push({ _step:0, type:"swing_high",       price: price + vol*2.5, idx: 18 });
          newOverlays.push({ _step:0, type:"swing_low",        price: price - vol*5, idx: 12 });
          newOverlays.push({ _step:0, type:"swing_low",        price: price - vol*3, idx: 22 });
          newOverlays.push({ _step:0, type:"market_structure", price: price + vol*4, idx: 8,  label:"HH" });
          newOverlays.push({ _step:0, type:"market_structure", price: price - vol*5, idx: 12, label:"HL" });
        } else if (prev.stepIndex === 1) {
          // Step 1: Support & Resistance + liquidity zones
          newOverlays.push({ _step:1, type:"resistance",    price: price + vol*2.5, label:"Resistance Zone" });
          newOverlays.push({ _step:1, type:"support_zone",  priceLow: price - vol*2.5, priceHigh: price - vol*1 });
          newOverlays.push({ _step:1, type:"liquidity",     priceLow: price + vol*2.2, priceHigh: price + vol*3.0 });
          newOverlays.push({ _step:1, type:"liquidity",     priceLow: price - vol*3.0, priceHigh: price - vol*2.2 });
        } else if (prev.stepIndex === 2) {
          // Step 2: Trend confirmed — add channel
          newOverlays.push({ _step:2, type:"channel",
            price1: price - vol*6, price2: price - vol*1,   // lower bound (same as trendline)
            price3: price - vol*5, price4: price + vol*0.5, // upper bound
          });
        } else if (prev.stepIndex === 3) {
          // Step 3: Entry zone + breakout area
          newOverlays.push({ _step:3, type:"entry_zone", priceLow: price - vol*0.5, priceHigh: price + vol*0.5 });
          newOverlays.push({ _step:3, type:"breakout",   priceLow: price + vol*0.4, priceHigh: price + vol*1.2 });
        } else if (prev.stepIndex === 4) {
          // Step 4: Full trade setup — TP/SL + direction arrow + projection
          const slDist  = vol * 2.5;
          const tp1Dist = vol * 3.8;
          const tp2Dist = vol * 6.2;
          newOverlays.push({ _step:4, type:"sl_level",        price: price - slDist });
          newOverlays.push({ _step:4, type:"tp_level",        price: price + tp1Dist, label:"TP 1" });
          newOverlays.push({ _step:4, type:"tp_level",        price: price + tp2Dist, label:"TP 2" });
          newOverlays.push({ _step:4, type:"direction_arrow", from:  price,           target: price + tp1Dist });
          newOverlays.push({ _step:4, type:"projection",      target: price + tp2Dist });
        }
        // Always show current price
        newOverlays = newOverlays.filter(o => o.type !== "current_price");
        newOverlays.push({ type:"current_price", price });
        // Activity entry
        const actMsg = [
          "Market structure mapped — bullish higher highs forming.",
          `Support zone identified near ${(price - vol*1.5).toFixed(inst2.digits)}.`,
          "Trend direction confirmed — bullish bias maintained.",
          `Entry zone identified ${(price - vol*0.5).toFixed(inst2.digits)} – ${(price + vol*0.5).toFixed(inst2.digits)}. Monitoring price action.`,
          "Confirmation pending — watching for momentum shift.",
        ][prev.stepIndex] || "Analysis progressing.";
        const activities = [{ time: new Date().toLocaleTimeString(), text: actMsg }, ...prev.activities].slice(0, 20);
        // Build setup when entry step done
        const res = prev.result || null;
        let setup = prev.setup;
        if (ni >= 4 && !setup) {
          const slDist = vol * 2.5;
          const tp1Dist = vol * 3.8;
          const tp2Dist = vol * 6.2;
          const entryLow  = price - vol*0.5;
          const entryHigh = price + vol*0.5;
          const entry     = (entryLow + entryHigh) / 2;
          setup = {
            bias: "BUY",
            entry,
            entryLow,
            entryHigh,
            stopLoss: price - slDist,
            tp1: price + tp1Dist,
            tp2: price + tp2Dist,
            rr: (tp1Dist / slDist).toFixed(1),
            confidence: 68 + Math.floor(Math.random()*20),
            reason: `Price is in an uptrend and holding above key support. Strong bounce expected towards resistance.`,
          };
        }
        const state = ni >= STEP_DEFS.length ? "watching" : "analyzing";
        return { ...prev, stepIndex: ni, steps, overlays: newOverlays, activities, setup, state };
      });
    }, delay);
    return () => clearTimeout(id);
  }, [session?.stepIndex, session?.state]);

  // Activity heartbeat during watching phase
  useEffect(() => {
    if (!session || session.state !== "watching") return;
    const msgs = [
      "Price action remains constructive above support.",
      "Monitoring momentum indicators for confirmation.",
      "No significant structure changes detected.",
      "Resistance zone holding. Watching for breakout.",
      "Bullish structure intact. Setup still developing.",
      "Price consolidating near entry zone.",
    ];
    const id = setInterval(() => {
      setSession(prev => {
        if (!prev) return prev;
        const text = msgs[Math.floor(Math.random() * msgs.length)];
        return { ...prev, activities: [{ time: new Date().toLocaleTimeString(), text }, ...prev.activities].slice(0, 20) };
      });
    }, 30000);
    return () => clearInterval(id);
  }, [session?.state]);

  // Session countdown
  const [sessionSecsLeft, setSessionSecsLeft] = useState(0);
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((session.endTime - Date.now()) / 1000));
      setSessionSecsLeft(left);
      if (left === 0) {
        setSession(prev => prev ? { ...prev, state: "completed" } : prev);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [session?.endTime]);

  const startAnalysisSession = useCallback((asset, duration) => {
    const now = Date.now();
    setSession({
      symbol: asset.symbol,
      name: asset.name,
      duration,
      startTime: now,
      endTime: now + duration.secs * 1000,
      stepIndex: 0,
      steps: STEP_DEFS.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })),
      activities: [{ time: new Date().toLocaleTimeString(), text: `Raina AI starting analysis on ${asset.symbol}. Studying market structure…` }],
      overlays: [],
      setup: null,
      state: "analyzing",
    });
  }, []);

  // ─── Theme ─────────────────────────────────────────────────────────────────
  const [themeMode, setThemeMode] = useState(() => lsGet("rainx-theme") || "light");
  const [showSidebar, setShowSidebar] = useState(false);
  const isDark = themeMode === "dark" || (themeMode === "system" && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  // Mutate T in-place BEFORE children render — all 200+ T.xxx refs in child components pick up new values automatically
  Object.assign(T, isDark ? DARK_TOKENS : LIGHT_TOKENS);
  useEffect(() => { document.body.style.background = T.ink; }, [isDark]);

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

      // ── If an active session matches this symbol, update overlays with real signal data ──
      if (result.bias !== "hold" && result.entry != null) {
        setSession(prev => {
          if (!prev || prev.symbol !== inst.symbol || prev.state === "completed") return prev;
          const price  = result.entry;
          const slDist = result.stop_loss   ? Math.abs(price - result.stop_loss)   : inst.vol * 2.5;
          const tp1    = result.take_profit_1;
          const tp2    = result.take_profit_2;
          // Keep non-signal overlays (trendlines, structure markings) and replace trade levels
          const keepTypes = new Set(["trendline","channel","support_zone","resistance","liquidity","swing_high","swing_low","market_structure"]);
          const base = prev.overlays.filter(o => keepTypes.has(o.type));
          const signalOverlays = [
            { type:"current_price",   price },
            { type:"entry_zone",      priceLow:  Array.isArray(signal.entry_zone) ? signal.entry_zone[0] : price-inst.vol*0.5,
                                      priceHigh: Array.isArray(signal.entry_zone) ? signal.entry_zone[1] : price+inst.vol*0.5 },
            { type:"sl_level",        price: result.stop_loss || price - slDist },
            ...(tp1 != null ? [{ type:"tp_level", price: tp1, label:"TP 1" }] : []),
            ...(tp2 != null ? [{ type:"tp_level", price: tp2, label:"TP 2" }] : []),
            { type:"direction_arrow", from: price,  target: tp1 || price + slDist * 1.5 },
            ...(tp2 != null ? [{ type:"projection", target: tp2 }] : []),
            { type:"breakout",        priceLow:  price + inst.vol*0.3, priceHigh: price + inst.vol*1.0 },
          ];
          const newSetup = {
            bias:      result.bias.toUpperCase(),
            entry:     price,
            entryLow:  Array.isArray(signal.entry_zone) ? signal.entry_zone[0] : price-inst.vol*0.5,
            entryHigh: Array.isArray(signal.entry_zone) ? signal.entry_zone[1] : price+inst.vol*0.5,
            stopLoss:  result.stop_loss || price - slDist,
            tp1:       tp1 || price + slDist * 1.5,
            tp2:       tp2 || price + slDist * 3.0,
            rr:        (slDist > 0 ? ((tp1 || price + slDist * 1.5) - price) / slDist : 1.5).toFixed(1),
            confidence: result.confidence,
            reason:    result.reason,
          };
          return { ...prev, overlays: [...base, ...signalOverlays], setup: newSetup };
        });
      }

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
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes priceFlash { 0% { opacity:0.4; } 100% { opacity:1; } }
        .hide-scroll::-webkit-scrollbar { display:none; }
        .hide-scroll { -ms-overflow-style:none; scrollbar-width:none; }
        .scroll-hint::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(198,161,91,0.5),transparent); opacity:0; transition:opacity 0.3s; pointer-events:none; }
        .scroll-hint.scrolling::after { opacity:1; }
      `}</style>

      <Toast toast={activeToast} onDone={() => setActiveToast(null)} />

      {(tab === "home" || tab === "markets") && <div style={{ background: T.card, borderBottom: `1px solid ${T.cardBorder}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 20 }}>
        {/* ── Hamburger / sidebar trigger ── */}
        <button onClick={() => setShowSidebar(true)} style={{ background: "none", border: "none", color: T.paper, cursor: "pointer", padding: 2, display: "flex", flexDirection: "column", gap: 4.5 }}>
          <span style={{ display: "block", width: 22, height: 2.5, borderRadius: 2, background: T.paper }} />
          <span style={{ display: "block", width: 16, height: 2.5, borderRadius: 2, background: T.gold }} />
          <span style={{ display: "block", width: 22, height: 2.5, borderRadius: 2, background: T.paper }} />
        </button>
        <div style={{ textAlign: "center" }}>
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
      </div>}

      <div style={{ paddingBottom: 78 }}>
        {tab === "home" && <HomeTab inst={inst} marketOpen={marketOpen} last={last} changePct={changePct} series={series} activeSymbol={activeSymbol} setActiveSymbol={setActiveSymbol} entitlement={entitlement} onSubscribe={() => setTab("subscribe")} session={session} sessionSecsLeft={sessionSecsLeft} startAnalysisSession={startAnalysisSession} setSession={setSession} seriesMap={seriesMap} themeMode={themeMode} />}
        {tab === "markets" && <MarketsTab seriesMap={seriesMap} signalsMap={signalsMap} activeSymbol={activeSymbol} onSelect={(s) => { setActiveSymbol(s); setTab("home"); }} />}
        {tab === "community" && <CommunityTab account={account} themeTokens={T} />}
        {tab === "history" && <HistoryTab account={account} entitlement={entitlement} onSubscribe={() => setTab("subscribe")} />}
        {tab === "scalping" && <ScalpingTab account={account} entitlement={entitlement} onSubscribe={() => setTab("subscribe")} />}
        {tab === "subscribe" && <SubscribeScreen account={account} entitlement={entitlement} onBack={() => setTab("more")} />}
        {tab === "more" && <MoreTab autoScan={autoScan} setAutoScan={setAutoScan} analysis={activeSignal} inst={inst} last={last} account={account} onLogout={onLogout} setTab={setTab} entitlement={entitlement} themeMode={themeMode} setThemeMode={setThemeMode} />}
      </div>

      {/* ── Sidebar drawer (hamburger menu) ──────────────────────────────── */}
      {showSidebar && (
        <div style={{ position:"fixed", inset:0, zIndex:80, display:"flex" }}>
          {/* Backdrop */}
          <div onClick={() => setShowSidebar(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(2px)" }} />
          {/* Panel */}
          <div style={{
            position:"relative", width:"82%", maxWidth:320, height:"100%",
            background:T.card, borderRight:`1px solid ${T.cardBorder}`,
            display:"flex", flexDirection:"column", overflow:"hidden",
            animation:"slideInLeft 0.22s ease",
          }}>
            <style>{"@keyframes slideInLeft { from { transform:translateX(-100%); } to { transform:translateX(0); } }"}</style>

            {/* Header */}
            <div style={{ padding:"22px 20px 16px", borderBottom:`1px solid ${T.cardBorder}`, background:`linear-gradient(135deg,${T.gold}18,transparent)` }}>
              <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:20, color:T.goldBright, letterSpacing:-0.3, marginBottom:2 }}>RainX</div>
              <div style={{ fontSize:10, color:T.muted, fontWeight:600 }}>Powered by Raina AI</div>
              {/* Account mini-card */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:18, background:T.ink, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"12px 14px" }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${T.gold},${T.goldBright})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.ink, flexShrink:0 }}>
                  {(account?.email || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{account?.email}</div>
                  <div style={{ fontSize:10.5, color:T.muted, marginTop:2 }}>Member since {new Date(account?.joinedAt || Date.now()).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
              {[
                { icon:Home,        label:"Home",          action:() => { setTab("home"); setShowSidebar(false); } },
                { icon:Briefcase,   label:"Markets",       action:() => { setTab("markets"); setShowSidebar(false); } },
                { icon:Users2,      label:"Community",     action:() => { setTab("community"); setShowSidebar(false); } },
                { icon:ScrollText,  label:"Trade History", action:() => { setTab("history"); setShowSidebar(false); } },
                null, // divider
                { icon:Users2,      label:"Edit Profile",  action:() => { setTab("more"); setShowSidebar(false); } },
                { icon:ShieldCheck, label:"Security",      action:() => { setTab("more"); setShowSidebar(false); } },
                { icon:Settings,    label:"Appearance",    action:() => { setTab("more"); setShowSidebar(false); } },
                null,
                { icon:LogOut,      label:"Log out",       action:onLogout, danger:true },
              ].map((item, i) => item === null ? (
                <div key={`div-${i}`} style={{ height:1, background:T.cardBorder, margin:"6px 16px" }} />
              ) : (
                <button key={item.label} onClick={item.action} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"13px 20px", background:"none", border:"none", cursor:"pointer" }}>
                  <item.icon size={18} color={item.danger ? T.rust : T.gold} />
                  <span style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:item.danger ? T.rust : T.paper }}>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding:"14px 20px", borderTop:`1px solid ${T.cardBorder}` }}>
              <div style={{ fontSize:10, color:T.muted, lineHeight:1.7 }}>RainX is an analysis tool, not a broker. AI analysis is not financial advice.</div>
            </div>
          </div>
        </div>
      )}

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
            <span style={{ fontSize: 10, fontFamily: FONT_HEAD, fontWeight: 700 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Candlestick chart — swipeable, MT5-style, black & blue colour scheme
// ─────────────────────────────────────────────────────────────────────────────
let isDarkCanvas = false;
function setIsDarkCanvas(v) { isDarkCanvas = v; }

function CandlestickChart({ candles, overlays, inst, containerHeight = 260 }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const [panOffset, setPanOffset] = React.useState(0);
  const touchX   = useRef(null);
  const touchOff = useRef(0);
  const VISIBLE  = 55; // max candles shown at once

  const onTouchStart = e => {
    touchX.current   = e.touches[0].clientX;
    touchOff.current = panOffset;
  };
  const onTouchMove = e => {
    if (touchX.current === null) return;
    const dx    = touchX.current - e.touches[0].clientX; // positive → see older
    const delta = Math.round(dx / 4.5);
    const maxOff = Math.max(0, candles.length - VISIBLE);
    setPanOffset(Math.max(0, Math.min(maxOff, touchOff.current + delta)));
  };
  const onTouchEnd = () => { touchX.current = null; };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 4) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      const W   = canvas.offsetWidth  || 340;
      const H   = canvas.offsetHeight || containerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // Visible window
      const endIdx   = Math.max(VISIBLE, candles.length - panOffset);
      const startIdx = Math.max(0, endIdx - VISIBLE);
      const vis      = candles.slice(startIdx, endIdx);
      if (vis.length < 2) return;

      const pad = { top: 10, bottom: 22, left: 2, right: 66 };
      const cW  = W - pad.left - pad.right;
      const cH  = H - pad.top  - pad.bottom;

      // Price range — include overlay prices + 10% vertical margin
      const allP = vis.flatMap(c => [c.high, c.low]);
      overlays.forEach(o => {
        if (o.price)     allP.push(o.price);
        if (o.priceHigh) allP.push(o.priceHigh, o.priceLow);
        if (o.target)    allP.push(o.target);
        if (o.price1 != null) allP.push(o.price1, o.price2);
      });
      const rawMin = Math.min(...allP), rawMax = Math.max(...allP);
      const mg  = (rawMax - rawMin) * 0.1;
      const minP = rawMin - mg, maxP = rawMax + mg;
      const pR   = maxP - minP || 1;
      const toY  = p => pad.top  + cH - ((p - minP) / pR) * cH;
      const gap  = cW / vis.length;
      const bW   = Math.max(2, gap * 0.72);
      const toX  = i => pad.left + i * gap + gap / 2;

      // Colours — modern black & blue
      const BULL  = "#1D6FE8";
      const BEAR  = isDarkCanvas ? "#bfc4ce" : "#131722";
      const WBULL = "#1D6FE8";
      const WBEAR = isDarkCanvas ? "#9ca3af" : "#374151";
      const GRID  = isDarkCanvas ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.065)";
      const TLBL  = isDarkCanvas ? "rgba(220,225,235,0.55)" : "rgba(18,18,42,0.5)";
      const GOLD  = T.gold || "#C6A15B";

      // ── Dashed horizontal grid lines ─────────────────────────────────────
      ctx.setLineDash([3, 4]); ctx.strokeStyle = GRID; ctx.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        const gy = pad.top + (cH / 6) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(W - pad.right, gy); ctx.stroke();
      }
      ctx.setLineDash([]);

      // ── Label anti-overlap helper ─────────────────────────────────────────
      const usedY = [];
      const fits  = (y, h = 14) => usedY.every(r => Math.abs(r.y - y) > (r.h + h) / 2 + 3);
      const grab  = (y, h = 14) => { usedY.push({ y, h }); };

      // ── Draw overlays ─────────────────────────────────────────────────────
      // Support zone (blue tint)
      overlays.forEach(o => {
        if (o.type !== "support_zone") return;
        const y1 = toY(o.priceHigh), y2 = toY(o.priceLow), midY = (y1 + y2) / 2;
        ctx.fillStyle = "rgba(29,111,232,0.07)";
        ctx.fillRect(pad.left, y1, cW, y2 - y1);
        ctx.strokeStyle = "rgba(29,111,232,0.3)"; ctx.lineWidth = 1; ctx.setLineDash([]);
        ctx.strokeRect(pad.left, y1, cW, y2 - y1);
        if (fits(midY)) {
          ctx.fillStyle = BULL; ctx.font = "bold 8px sans-serif";
          ctx.fillText("Support Zone", pad.left + 5, midY + 3); grab(midY);
        }
        // right pill
        if (fits(midY + 0.1, 20)) {
          ctx.fillStyle = BULL;
          roundRect(ctx, W - pad.right + 2, midY - 9, pad.right - 3, 18, 3); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.font = "bold 7.5px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(o.priceLow.toFixed(Math.min(inst.digits, 2)), W - pad.right / 2, midY + 3);
          ctx.textAlign = "left"; grab(midY, 20);
        }
      });

      // Resistance (red dashed line)
      overlays.forEach(o => {
        if (o.type !== "resistance") return;
        const y = toY(o.price);
        ctx.beginPath(); ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.setLineDash([]);
        const lY = y - 6;
        if (fits(lY, 10)) {
          ctx.fillStyle = "#ef4444"; ctx.font = "bold 8px sans-serif";
          ctx.fillText(o.label || "Resistance Zone", pad.left + 5, lY); grab(lY, 10);
        }
        if (fits(y, 20)) {
          ctx.fillStyle = "#ef4444";
          roundRect(ctx, W - pad.right + 2, y - 9, pad.right - 3, 18, 3); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.font = "bold 7.5px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(o.price.toFixed(Math.min(inst.digits, 2)), W - pad.right / 2, y + 3);
          ctx.textAlign = "left"; grab(y, 20);
        }
      });

      // Trendline (gold dashed diagonal)
      overlays.forEach(o => {
        if (o.type !== "trendline") return;
        const x2 = Math.min(toX(vis.length - 6), W - pad.right - 10);
        ctx.beginPath(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
        ctx.moveTo(pad.left, toY(o.price1)); ctx.lineTo(x2, toY(o.price2)); ctx.stroke();
        ctx.setLineDash([]);
        const lY = toY(o.price2) - 7;
        if (fits(lY, 10)) {
          ctx.fillStyle = GOLD; ctx.font = "bold 8px sans-serif";
          ctx.fillText("Uptrend Line", pad.left + 5, lY); grab(lY, 10);
        }
      });

      // Entry zone (gold shaded)
      overlays.forEach(o => {
        if (o.type !== "entry_zone") return;
        const y1 = toY(o.priceHigh), y2 = toY(o.priceLow);
        ctx.fillStyle = "rgba(198,161,91,0.09)";
        ctx.fillRect(pad.left, y1, cW, y2 - y1);
        [y1, y2].forEach(y => {
          ctx.beginPath(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
          ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
          ctx.setLineDash([]);
        });
      });

      // Current price crosshair (gold dashed + pill)
      overlays.forEach(o => {
        if (o.type !== "current_price") return;
        const y = toY(o.price);
        ctx.beginPath(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke(); ctx.setLineDash([]);
        if (fits(y, 20)) {
          ctx.fillStyle = GOLD;
          roundRect(ctx, W - pad.right + 2, y - 9, pad.right - 3, 18, 3); ctx.fill();
          ctx.fillStyle = isDarkCanvas ? "#000" : "#fff";
          ctx.font = "bold 7.5px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(o.price.toFixed(Math.min(inst.digits, 2)), W - pad.right / 2, y + 3);
          ctx.textAlign = "left"; grab(y, 20);
        }
      });

      // AI Projection arrow + annotation
      overlays.forEach(o => {
        if (o.type !== "projection") return;
        const lastX = toX(vis.length - 1);
        const lastY = toY(vis[vis.length - 1]?.close || o.target);
        const endX  = Math.min(lastX + gap * 4, W - pad.right - 12);
        const endY  = toY(o.target);
        ctx.beginPath(); ctx.strokeStyle = BULL; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.moveTo(lastX, lastY);
        ctx.bezierCurveTo(lastX + (endX - lastX) * 0.5, lastY, lastX + (endX - lastX) * 0.5, endY, endX, endY);
        ctx.stroke();
        ctx.fillStyle = BULL; ctx.beginPath();
        ctx.moveTo(endX, endY); ctx.lineTo(endX - 7, endY - 4); ctx.lineTo(endX - 7, endY + 4);
        ctx.closePath(); ctx.fill();
        // annotation box — try below arrow, then above if it would clip
        const boxW = 84, boxH = 38;
        const bx = Math.max(pad.left + 4, Math.min(endX - boxW + 10, W - pad.right - boxW - 2));
        let by = endY + 7;
        if (by + boxH > H - pad.bottom - 2) by = endY - boxH - 7;
        if (fits(by + boxH / 2, boxH)) {
          const bgFill = isDarkCanvas ? "rgba(20,30,55,0.93)" : "rgba(235,244,255,0.96)";
          ctx.fillStyle = bgFill; ctx.strokeStyle = "rgba(29,111,232,0.4)"; ctx.lineWidth = 1;
          roundRect(ctx, bx, by, boxW, boxH, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = BULL; ctx.font = "bold 7.5px sans-serif";
          ctx.fillText("AI Projection", bx + 5, by + 12);
          ctx.fillStyle = TLBL; ctx.font = "7px sans-serif";
          ["Price expected to reach", "next resistance zone."].forEach((l, li) =>
            ctx.fillText(l, bx + 5, by + 21 + li * 9)
          );
          grab(by + boxH / 2, boxH);
        }
      });

      // ── Draw candles (both bull and bear are FILLED) ──────────────────────
      vis.forEach((c, i) => {
        const x  = toX(i);
        const bull = c.close >= c.open;
        const yO = toY(c.open), yC = toY(c.close), yH = toY(c.high), yL = toY(c.low);
        // Wick
        ctx.beginPath(); ctx.strokeStyle = bull ? WBULL : WBEAR; ctx.lineWidth = 1;
        ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();
        // Body — filled solid
        const top = Math.min(yO, yC);
        const bh  = Math.max(1.5, Math.abs(yO - yC));
        ctx.fillStyle = bull ? BULL : BEAR;
        ctx.fillRect(x - bW / 2, top, bW, bh);
      });

      // ── Price axis labels (right column) ─────────────────────────────────
      ctx.fillStyle = TLBL; ctx.font = "8.5px sans-serif"; ctx.textAlign = "right";
      const nL = 5;
      for (let i = 0; i <= nL; i++) {
        const p = minP + (pR / nL) * i, y = toY(p);
        if (y < pad.top + 6 || y > H - pad.bottom - 2) continue;
        ctx.fillText(p.toFixed(Math.min(inst.digits, 2)), W - pad.right - 3, y + 3);
      }

      // ── Time axis labels (bottom) ─────────────────────────────────────────
      ctx.textAlign = "center"; ctx.font = "8px sans-serif"; ctx.fillStyle = TLBL;
      const tStep = Math.max(1, Math.floor(vis.length / 5));
      vis.forEach((c, i) => {
        if (i % tStep !== 0) return;
        const d   = new Date(c.t);
        const lbl = `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
        const x   = toX(i);
        if (x < 18 || x > W - pad.right - 8) return;
        ctx.fillText(lbl, x, H - 5);
      });
      ctx.textAlign = "left";

      // ── Pan progress bar (small indicator when panned back) ──────────────
      if (panOffset > 0 && candles.length > VISIBLE) {
        const ratio = (candles.length - VISIBLE - panOffset) / (candles.length - VISIBLE);
        const bLen  = Math.max(30, cW * 0.22);
        const bX    = pad.left + (cW - bLen) * (1 - Math.max(0, Math.min(1, ratio)));
        ctx.fillStyle = "rgba(29,111,232,0.32)";
        roundRect(ctx, bX, H - pad.bottom + 5, bLen, 3, 1.5); ctx.fill();
      }
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [candles, overlays, inst, panOffset]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width:"100%", height:"100%", display:"block", touchAction:"none" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Market bottom sheet
// ─────────────────────────────────────────────────────────────────────────────
function AddMarketSheet({ onClose, onSelect, activeSessions }) {
  const [category, setCategory] = useState(null);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.ink, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 32px", maxHeight:"85vh", overflowY:"auto" }}>
        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:T.cardBorder }} />
        </div>
        {!category ? (
          <>
            <div style={{ padding:"0 20px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper }}>Add Market</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>Choose a market category</div>
              </div>
              <button onClick={onClose} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 16px" }}>
              {ASSET_CATALOG.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat)} style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"18px 14px", textAlign:"left", cursor:"pointer" }}>
                  <div style={{ fontSize:22, marginBottom:8 }}>{cat.emoji}</div>
                  <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>{cat.label}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{cat.assets.length} markets</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding:"0 20px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={() => setCategory(null)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><ChevronLeft size={20} /></button>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper }}>{category.label}</div>
                <div style={{ fontSize:12, color:T.muted }}>Select a market</div>
              </div>
            </div>
            <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:8 }}>
              {category.assets.map(asset => (
                <button key={asset.symbol} onClick={() => onSelect(asset)} style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>{asset.symbol}</div>
                    <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{asset.name}</div>
                  </div>
                  <ChevronRight size={16} color={T.muted} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration picker modal
// ─────────────────────────────────────────────────────────────────────────────
function DurationPicker({ asset, onSelect, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:82, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.ink, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 32px", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:T.cardBorder }} />
        </div>
        <div style={{ padding:"0 20px 4px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper }}>Analyze This Market</div>
            <div style={{ fontFamily:FONT_HEAD, fontSize:15, color:T.goldBright, fontWeight:700, marginTop:4 }}>{asset.symbol}</div>
            <div style={{ fontSize:12, color:T.muted }}>{asset.name}</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:8 }}>How long should Raina AI focus on this market?</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
          {ANALYSIS_DURATIONS.map(dur => (
            <button key={dur.key} onClick={() => onSelect(dur)} style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"16px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:14, color:T.paper }}>{dur.label}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{dur.sublabel}</div>
              </div>
              <div style={{ background:T.gold, color:T.ink, fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, borderRadius:8, padding:"6px 14px" }}>Select</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Change market confirmation dialog
// ─────────────────────────────────────────────────────────────────────────────
function ChangeMarketDialog({ current, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:90, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:T.ink, border:`1px solid ${T.cardBorder}`, borderRadius:18, padding:24, width:"100%", maxWidth:340 }}>
        <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.paper, marginBottom:8 }}>Change Active Market?</div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.6, marginBottom:20 }}>Your current <strong style={{ color:T.paper }}>{current}</strong> analysis session is active. Changing markets will stop this session.</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:10, padding:"11px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper, cursor:"pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, background:T.rust, border:"none", borderRadius:10, padding:"11px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:"#fff", cursor:"pointer" }}>Change Market</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Format seconds → HH:MM:SS
// ─────────────────────────────────────────────────────────────────────────────
function fmtTime(secs) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Home Tab — main redesigned screen
// ─────────────────────────────────────────────────────────────────────────────
function HomeTab({ inst, last, changePct, series, activeSymbol, setActiveSymbol, entitlement, onSubscribe, session, sessionSecsLeft, startAnalysisSession, setSession, seriesMap, themeMode }) {
  const [showAddMarket, setShowAddMarket] = useState(false);
  const [pendingAsset, setPendingAsset] = useState(null);       // waiting for duration
  const [showChangeDlg, setShowChangeDlg] = useState(false);   // confirm change market
  const [pendingChange, setPendingChange] = useState(null);     // asset user tried to switch to
  const [showActivity, setShowActivity] = useState(false);
  const [showFullChart, setShowFullChart] = useState(false);

  // Sync dark canvas flag
  setIsDarkCanvas(T.ink === "#0F0E0B");

  // OHLCV candles from tick series
  const candles = React.useMemo(() => ticksToCandles(series || [], 70), [series]);

  // State label
  const stateLabel = session ? {
    analyzing: "AI Analysis Active",
    watching:  "Watching Setup",
    confirming:"Confirming",
    completed: "Session Complete",
  }[session.state] || "Active" : null;

  const stateColor = session?.state === "watching" ? T.sage
    : session?.state === "completed" ? T.muted
    : T.gold;

  function handleAssetSelect(asset) {
    setShowAddMarket(false);
    if (session && session.state !== "completed") {
      setPendingChange(asset);
      setShowChangeDlg(true);
    } else {
      setPendingAsset(asset);
    }
  }

  function handleDurationSelect(dur) {
    if (!pendingAsset) return;
    startAnalysisSession(pendingAsset, dur);
    setActiveSymbol(pendingAsset.symbol);
    setPendingAsset(null);
  }

  function handleConfirmChange() {
    setShowChangeDlg(false);
    setPendingAsset(pendingChange);
    setPendingChange(null);
  }

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* ── Asset tab bar ──────────────────────────────────────────────── */}
      <div className="hide-scroll" style={{ display:"flex", gap:6, padding:"12px 14px 6px", overflowX:"auto", overflowY:"hidden", WebkitOverflowScrolling:"touch", position:"relative" }}>
        {(session ? [ALL_ASSETS.find(a => a.symbol === session.symbol) || ALL_ASSETS[0]] : []).concat(
          ALL_ASSETS.filter(a => a.symbol === "XAUUSD" || a.symbol === "BTCUSD" || a.symbol === "ETHUSD")
            .filter(a => !session || a.symbol !== session.symbol)
        ).slice(0, 5).map(a => {
          const active = a.symbol === (session?.symbol || activeSymbol);
          return (
            <button key={a.symbol} onClick={() => handleAssetSelect(a)} style={{ flexShrink:0, background:active ? T.gold : T.card, color:active ? T.ink : T.paper, border:`1px solid ${active ? T.gold : T.cardBorder}`, borderRadius:20, padding:"6px 14px", fontFamily:FONT_HEAD, fontSize:11, fontWeight:700, cursor:"pointer" }}>
              {a.symbol}
            </button>
          );
        })}
        <button onClick={() => setShowAddMarket(true)} style={{ flexShrink:0, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:20, padding:"6px 12px", fontFamily:FONT_HEAD, fontSize:14, fontWeight:700, color:T.gold, cursor:"pointer" }}>+</button>
      </div>

      {/* ── Live market mini-strip ──────────────────────────────────────── */}
      <div className="hide-scroll" style={{ display:"flex", gap:8, padding:"10px 14px 0", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        {ALL_ASSETS.filter(a => ["BTCUSD","ETHUSD","XAUUSD","EURUSD","NAS100","SOLUSD"].includes(a.symbol)).map(a => {
          const arr = seriesMap[a.symbol] || [];
          const p  = arr.length ? arr[arr.length-1].price : a.base;
          const p2 = arr.length > 1 ? arr[arr.length-2].price : p;
          const up = p >= p2;
          return (
            <button key={a.symbol} onClick={() => handleAssetSelect(a)}
              style={{ flexShrink:0, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:10, padding:"6px 12px", cursor:"pointer", textAlign:"left" }}>
              <div style={{ fontFamily:FONT_HEAD, fontSize:9, fontWeight:700, color:T.muted }}>{a.symbol}</div>
              <div style={{ fontFamily:FONT_HEAD, fontSize:12, fontWeight:800, color:up ? "#1D6FE8" : T.rust, fontVariantNumeric:"tabular-nums" }}>{p.toFixed(Math.min(a.digits,2))}</div>
            </button>
          );
        })}
      </div>

      {/* ── Price header ─────────────────────────────────────────────────── */}
      <div style={{ padding:"8px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
          <span style={{ fontFamily:FONT_HEAD, fontSize:34, fontWeight:800, fontVariantNumeric:"tabular-nums", color:T.paper }}>{last?.toFixed(inst.digits) ?? "—"}</span>
          <span style={{ fontSize:14, fontWeight:700, color: changePct >= 0 ? T.sage : T.rust }}>{changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct || 0).toFixed(3)}%</span>
        </div>
        <div style={{ fontSize:12, color:T.muted, fontWeight:500, marginTop:1 }}>{inst.name} · {inst.symbol}</div>
      </div>

      {/* ── Chart preview area ────────────────────────────────────────────── */}
      <div style={{ margin:"12px 14px 0", borderRadius:14, border:`1px solid ${T.cardBorder}`, overflow:"hidden", background:T.card, position:"relative" }}>
        {/* AI badge + session timer */}
        {session && session.state !== "completed" && (
          <div style={{ position:"absolute", top:8, right:8, zIndex:5, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, background:T.ink, border:`1px solid ${stateColor}44`, borderRadius:20, padding:"3px 9px" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:stateColor, animation:"pulse 1.5s infinite" }} />
              <span style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:9.5, color:stateColor }}>{stateLabel}</span>
            </div>
            {sessionSecsLeft > 0 && (
              <div style={{ fontSize:9.5, color:T.muted, fontFamily:FONT_HEAD, fontWeight:600 }}>{fmtTime(sessionSecsLeft)}</div>
            )}
          </div>
        )}

        {/* No session CTA */}
        {!session && (
          <div style={{ position:"absolute", inset:0, zIndex:5, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:T.ink + "cc", borderRadius:14 }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper, marginBottom:4 }}>Choose a Market</div>
            <div style={{ fontSize:12, color:T.muted, marginBottom:16, textAlign:"center", maxWidth:200 }}>Select a market and let Raina AI study it for you</div>
            <button onClick={() => setShowAddMarket(true)} style={{ background:T.gold, color:T.ink, border:"none", borderRadius:10, padding:"10px 22px", fontFamily:FONT_HEAD, fontWeight:800, fontSize:13, cursor:"pointer" }}>+ Add Market</button>
          </div>
        )}

        {/* Preview chart — powered by lightweight-charts */}
        <div style={{ height:200 }}>
          <LightweightChart
            candles={candles}
            overlays={session?.overlays || []}
            inst={inst}
            containerHeight={200}
            compact={true}
            isDark={T.ink === "#0F0E0B"}
          />
        </div>

        {/* "Open Full Chart" button — always visible at bottom of chart */}
        <button
          onClick={() => setShowFullChart(true)}
          style={{
            width:"100%", background:T.ink, border:"none", borderTop:`1px solid ${T.cardBorder}`,
            padding:"9px 16px", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:7,
          }}
        >
          <Maximize2 size={13} color={T.gold} />
          <span style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, color:T.gold }}>Open Full Chart</span>
        </button>
      </div>

      {/* Full-screen chart overlay */}
      {showFullChart && (
        <FullChartView
          inst={inst}
          session={session}
          themeMode={themeMode}
          onClose={() => setShowFullChart(false)}
        />
      )}

      {/* ── Timeframe selector ───────────────────────────────────────────── */}
      <div className="hide-scroll" style={{ display:"flex", gap:6, padding:"10px 14px 0", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        {["15m","30m","1H","2H","4H","1D"].map(tf => {
          const active = tf === "15m";
          return (
            <button key={tf} style={{ flexShrink:0, minWidth:44, padding:"7px 0", borderRadius:8, border:`1px solid ${active ? T.gold : T.cardBorder}`, background:active ? T.gold : T.card, color:active ? T.ink : T.paper, fontFamily:FONT_HEAD, fontWeight:700, fontSize:11, cursor:"pointer" }}>
              {tf}
            </button>
          );
        })}
      </div>

      {/* ── Analysis Progress Panel ──────────────────────────────────────── */}
      {session && (
        <div style={{ margin:"12px 14px 0", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:13, color:T.paper }}>Raina AI Analysis Progress</div>
            <button onClick={() => {/* view full */}} style={{ background:"none", border:`1px solid ${T.cardBorder}`, borderRadius:8, padding:"4px 10px", fontFamily:FONT_HEAD, fontSize:11, fontWeight:700, color:T.gold, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>View Full <ChevronRight size={12} /></button>
          </div>
          {/* Step row */}
          <div style={{ display:"flex", gap:0, alignItems:"flex-start" }}>
            {(session.steps || STEP_DEFS.map(s => ({...s, status:"pending"}))).map((step, i, arr) => {
              const done = step.status === "done";
              const active = step.status === "active";
              const pending = step.status === "pending";
              return (
                <React.Fragment key={step.id}>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    {/* Circle */}
                    <div style={{ width:28, height:28, borderRadius:"50%", background:done ? T.sage : active ? T.gold : T.cardBorder, border:`2px solid ${done ? T.sage : active ? T.gold : T.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {done ? <span style={{ color:"#fff", fontSize:12, fontWeight:800 }}>✓</span>
                        : <span style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:10, color:active ? T.ink : T.muted }}>{i+1}</span>}
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontFamily:FONT_HEAD, fontSize:9, fontWeight:700, color:done ? T.paper : active ? T.gold : T.muted, lineHeight:1.3 }}>{step.label}</div>
                      <div style={{ fontSize:8.5, color:done ? T.sage : active ? T.muted : T.cardBorder, marginTop:2 }}>{done ? step.done : active ? "In progress" : "Pending"}</div>
                    </div>
                  </div>
                  {/* Connector */}
                  {i < arr.length - 1 && (
                    <div style={{ marginTop:13, height:2, width:12, background:done ? T.sage : T.cardBorder, flexShrink:0 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Trade Setup Card ─────────────────────────────────────────────── */}
      {session?.setup && (
        <div style={{ margin:"12px 14px 0", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:14, color:T.paper }}>Potential Trade Setup</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ background:`${T.sage}22`, color:T.sage, fontFamily:FONT_HEAD, fontWeight:700, fontSize:10, borderRadius:6, padding:"3px 8px" }}>Watching</span>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, color:T.muted, fontFamily:FONT_HEAD, fontWeight:600 }}>AI Confidence</div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.goldBright }}>{session.setup.confidence}%</div>
              </div>
            </div>
          </div>
          {/* 4-column grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:1, marginBottom:1 }}>
            {[
              { label:"Bias", val: <span style={{ color:T.sage, fontFamily:FONT_HEAD, fontWeight:800, fontSize:13 }}>BUY ↗</span> },
              { label:"Entry Zone", val: <span style={{ color:T.sage, fontFamily:FONT_HEAD, fontWeight:700, fontSize:11 }}>{session.setup.entryLow.toFixed(inst.digits)} – {session.setup.entryHigh.toFixed(inst.digits)}</span> },
              { label:"Take Profit 1", val: <span style={{ color:T.sage, fontFamily:FONT_HEAD, fontWeight:700, fontSize:12 }}>{session.setup.tp1.toFixed(inst.digits)}</span> },
              { label:"Analysis Reason", val: null, wide:true },
            ].map((cell, i) => (
              <div key={i} style={{ background:T.ink, borderRadius:8, padding:"10px 10px", border:`1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize:9, color:T.muted, fontWeight:700, fontFamily:FONT_HEAD, marginBottom:4 }}>{cell.label.toUpperCase()}</div>
                {cell.val || <div style={{ fontSize:10, color:T.muted, lineHeight:1.5 }}>{session.setup.reason}</div>}
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:1, marginTop:1 }}>
            {[
              { label:"Risk / Reward", val: <span style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, color:T.paper }}>1 : {session.setup.rr}</span> },
              { label:"Stop Loss", val: <span style={{ color:T.rust, fontFamily:FONT_HEAD, fontWeight:700, fontSize:12 }}>{session.setup.stopLoss.toFixed(inst.digits)}</span> },
              { label:"Take Profit 2", val: <span style={{ color:T.sage, fontFamily:FONT_HEAD, fontWeight:700, fontSize:12 }}>{session.setup.tp2.toFixed(inst.digits)}</span> },
              { label:"", val: null },
            ].map((cell, i) => (
              <div key={i} style={{ background:T.ink, borderRadius:8, padding:"10px 10px", border:`1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize:9, color:T.muted, fontWeight:700, fontFamily:FONT_HEAD, marginBottom:4 }}>{cell.label.toUpperCase()}</div>
                {cell.val}
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, fontSize:10.5, color:T.muted, lineHeight:1.6 }}>
            Raina AI continues to monitor the market and will alert you when the setup is confirmed.
          </div>
        </div>
      )}

      {/* ── Activity Feed ────────────────────────────────────────────────── */}
      {session?.activities?.length > 0 && (
        <div style={{ margin:"12px 14px 0", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"14px 16px" }}>
          <button onClick={() => setShowActivity(v => !v)} style={{ width:"100%", background:"none", border:"none", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", padding:0 }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:13, color:T.paper }}>Raina AI Activity</div>
            <ChevronRight size={14} color={T.muted} style={{ transform: showActivity ? "rotate(90deg)" : "rotate(0)", transition:"transform 0.2s" }} />
          </button>
          {showActivity && (
            <div style={{ marginTop:12 }}>
              {session.activities.slice(0, 8).map((a, i) => (
                <div key={i} style={{ borderBottom: i < session.activities.slice(0,8).length-1 ? `1px solid ${T.cardBorder}` : "none", padding:"8px 0" }}>
                  <span style={{ fontSize:10, color:T.gold, fontFamily:FONT_HEAD, fontWeight:700, marginRight:8 }}>{a.time}</span>
                  <span style={{ fontSize:12, color:T.paper, lineHeight:1.5 }}>{a.text}</span>
                </div>
              ))}
            </div>
          )}
          {!showActivity && session.activities.length > 0 && (
            <div style={{ marginTop:10, padding:"8px 0 0" }}>
              <span style={{ fontSize:10, color:T.gold, fontFamily:FONT_HEAD, fontWeight:700, marginRight:8 }}>{session.activities[0].time}</span>
              <span style={{ fontSize:12, color:T.paper }}>{session.activities[0].text}</span>
            </div>
          )}
        </div>
      )}

      {/* Session complete panel */}
      {session?.state === "completed" && (
        <div style={{ margin:"12px 14px 0", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"20px 16px", textAlign:"center" }}>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper, marginBottom:6 }}>Analysis Session Complete</div>
          <div style={{ fontSize:12, color:T.muted, marginBottom:16 }}>The selected analysis period has ended. Start a new session to continue monitoring.</div>
          <button onClick={() => { setSession(null); setShowAddMarket(true); }} style={{ background:T.gold, color:T.ink, border:"none", borderRadius:10, padding:"11px 28px", fontFamily:FONT_HEAD, fontWeight:800, fontSize:13, cursor:"pointer" }}>Analyze Again</button>
        </div>
      )}

      <div style={{ margin:"10px 14px 16px", fontSize:10.5, color:T.muted, lineHeight:1.6, textAlign:"center" }}>
        AI-generated analysis, not financial advice. No outcome is guaranteed. Always manage your risk.
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showAddMarket && <AddMarketSheet onClose={() => setShowAddMarket(false)} onSelect={handleAssetSelect} />}
      {pendingAsset && <DurationPicker asset={pendingAsset} onSelect={handleDurationSelect} onClose={() => setPendingAsset(null)} />}
      {showChangeDlg && <ChangeMarketDialog current={session?.symbol} onConfirm={handleConfirmChange} onCancel={() => { setShowChangeDlg(false); setPendingChange(null); }} />}
    </div>
  );
}
function Row({ label, value, color }) {
  return <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0" }}><span style={{ color:T.muted, fontWeight:500 }}>{label}</span><span style={{ color:color||T.paper, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{value}</span></div>;
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
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={recording ? "Listening…" : "Should I enter now?"} style={{ ...getInputStyle() }} />
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


// ---------- More Tab helpers ----------

const DEFAULT_BENEFITS = [
  { id: "verification", icon: "shield", title: "Verification & Badge", status: null },
  { id: "rewards",      icon: "trophy", title: "Trader Rewards Programme", status: null },
];

function BenefitIcon({ type }) {
  const s = { width: 36, height: 36, borderRadius: 10, background: "rgba(198,161,91,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  if (type === "trophy") return <div style={s}><Trophy size={18} color="#C6A15B" /></div>;
  if (type === "shield") return <div style={s}><ShieldCheck size={18} color="#C6A15B" /></div>;
  return <div style={s}><ShieldCheck size={18} color="#C6A15B" /></div>;
}

function MoreRow({ icon: Icon, iconType, title, subtitle, badge, badgeColor, onPress }) {
  return (
    <button onClick={onPress} style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: "none", padding: "13px 14px", cursor: "pointer", gap: 12 }}>
      {iconType ? <BenefitIcon type={iconType} /> : (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(198,161,91,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={18} color={T.gold} />
        </div>
      )}
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {badge && (
        <span style={{ fontSize: 10.5, fontWeight: 700, color: badgeColor || T.muted, border: `1px solid ${badgeColor ? badgeColor + "55" : T.cardBorder}`, borderRadius: 20, padding: "3px 9px", flexShrink: 0 }}>{badge}</span>
      )}
      <ChevronRight size={16} color={T.muted} style={{ flexShrink: 0 }} />
    </button>
  );
}

function SecuritySection({ icon: Icon, title, desc, onPress, label, comingSoon }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(198,161,91,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={19} color={T.gold} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper }}>{title}</span>
          {comingSoon && <span style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, border: `1px solid ${T.cardBorder}`, borderRadius: 6, padding: "2px 6px", fontFamily: FONT_HEAD }}>SOON</span>}
        </div>
        <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{desc}</div>
      </div>
      <button onClick={onPress} style={{ background: comingSoon ? "transparent" : T.gold, border: `1px solid ${comingSoon ? T.cardBorder : T.gold}`, borderRadius: 9, padding: "7px 13px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11.5, color: comingSoon ? T.muted : T.ink, cursor: "pointer", flexShrink: 0 }}>
        {label}
      </button>
    </div>
  );
}

function MoreSection({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.goldBright, marginBottom: 8, paddingLeft: 2 }}>{title}</div>
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function MoreRowDivider() {
  return <div style={{ height: 1, background: T.cardBorder, marginLeft: 62 }} />;
}

function GoldBarsIcon() {
  return (
    <svg width="96" height="78" viewBox="0 0 96 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0,52)">
        <path d="M10 0 L82 0 L92 9 L92 24 L20 24 L10 15 Z" fill="url(#bf1)"/>
        <path d="M82 0 L92 9 L92 24 L82 15 Z" fill="url(#bs1)"/>
        <path d="M10 0 L82 0 L92 9 L20 9 Z" fill="url(#bt1)"/>
      </g>
      <g transform="translate(0,27)">
        <path d="M10 0 L82 0 L92 9 L92 24 L20 24 L10 15 Z" fill="url(#bf2)"/>
        <path d="M82 0 L92 9 L92 24 L82 15 Z" fill="url(#bs2)"/>
        <path d="M10 0 L82 0 L92 9 L20 9 Z" fill="url(#bt2)"/>
      </g>
      <g transform="translate(0,2)">
        <path d="M10 0 L82 0 L92 9 L92 24 L20 24 L10 15 Z" fill="url(#bf3)"/>
        <path d="M82 0 L92 9 L92 24 L82 15 Z" fill="url(#bs3)"/>
        <path d="M10 0 L82 0 L92 9 L20 9 Z" fill="url(#bt3)"/>
      </g>
      <defs>
        <linearGradient id="bf1" x1="10" y1="0" x2="10" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#B8932A"/><stop offset="1" stopColor="#6B4A0A"/></linearGradient>
        <linearGradient id="bs1" x1="82" y1="0" x2="92" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#8A6B18"/><stop offset="1" stopColor="#4A3205"/></linearGradient>
        <linearGradient id="bt1" x1="10" y1="0" x2="92" y2="9" gradientUnits="userSpaceOnUse"><stop stopColor="#F5D96A"/><stop offset="0.5" stopColor="#E8C450"/><stop offset="1" stopColor="#C8A030"/></linearGradient>
        <linearGradient id="bf2" x1="10" y1="0" x2="10" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#C8A030"/><stop offset="1" stopColor="#7A5515"/></linearGradient>
        <linearGradient id="bs2" x1="82" y1="0" x2="92" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#9A7820"/><stop offset="1" stopColor="#553A08"/></linearGradient>
        <linearGradient id="bt2" x1="10" y1="0" x2="92" y2="9" gradientUnits="userSpaceOnUse"><stop stopColor="#FAE478"/><stop offset="0.5" stopColor="#EDCE60"/><stop offset="1" stopColor="#D4AC40"/></linearGradient>
        <linearGradient id="bf3" x1="10" y1="0" x2="10" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#D8AE40"/><stop offset="1" stopColor="#8A6020"/></linearGradient>
        <linearGradient id="bs3" x1="82" y1="0" x2="92" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#AA8828"/><stop offset="1" stopColor="#5F4010"/></linearGradient>
        <linearGradient id="bt3" x1="10" y1="0" x2="92" y2="9" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF0A0"/><stop offset="0.5" stopColor="#F8E080"/><stop offset="1" stopColor="#DEC058"/></linearGradient>
      </defs>
    </svg>
  );
}

function MoreSubScreen({ onBack, title, subtitle, rightElement, children }) {
  return (
    <div style={{ minHeight: "100%", animation: "slideInRight 0.2s ease" }}>
      <style>{"@keyframes slideInRight { from { transform: translateX(24px); opacity:0; } to { transform: translateX(0); opacity:1; } }"}</style>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px 10px", borderBottom: `1px solid ${T.cardBorder}` }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.paper, cursor: "pointer", display: "flex", alignItems: "center", padding: "4px", borderRadius: 8, flexShrink: 0 }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          {title && <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: T.goldBright, lineHeight: 1.2 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div style={{ flexShrink: 0, width: 30, display: "flex", justifyContent: "flex-end" }}>
          {rightElement || null}
        </div>
      </div>
      {children}
    </div>
  );
}

function RewardsScreen({ account, entitlement }) {
  const [rewardsData, setRewardsData] = useState(null);
  const [txns, setTxns] = useState([]);
  const [quickPage, setQuickPage] = useState(null);

  useEffect(() => {
    if (!account?.id) return;
    supabase.from("wallet_balances").select("*").eq("user_id", account.id).single()
      .then(({ data }) => { if (data) setRewardsData(data); }).catch(() => {});
    supabase.from("wallet_transactions").select("*").eq("user_id", account.id)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setTxns(data); }).catch(() => {});
  }, [account?.id]);

  const totalBalance    = rewardsData?.balance         ?? 0;
  const totalEarned     = rewardsData?.total_earned    ?? 0;
  const totalWithdrawn  = rewardsData?.total_withdrawn ?? 0;
  const pending         = rewardsData?.pending         ?? 0;
  const weeklyPct       = rewardsData?.weekly_change_pct ?? 0;

  const fmtGHS = (n) =>
    `GHS ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const quickItems = [
    { icon: Landmark,       label: "Bank\nAccounts",       page: "bank"      },
    { icon: Gift,           label: "My\nRewards",          page: "myRewards" },
    { icon: Trophy,         label: "Post\nGifts",          page: "postGifts" },
    { icon: CreditCardIcon, label: "Payout\nMethods",      page: "payout"    },
    { icon: ScrollText,     label: "Transaction\nHistory", page: "txHistory" },
  ];

  const activityIcon = (type) => {
    if (!type) return Gift;
    const t = type.toLowerCase();
    if (t.includes("gift") || t.includes("post")) return Gift;
    if (t.includes("reward") || t.includes("bonus") || t.includes("earn")) return Trophy;
    if (t.includes("withdraw") || t.includes("bank") || t.includes("payout")) return Landmark;
    return CreditCardIcon;
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000)  return `Today, ${d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}`;
    if (diff < 172800000) return `Yesterday, ${d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}`;
    return d.toLocaleDateString("en-GH");
  };

  const DEMO_TXN = [
    { id: "d1", type: "Post Gift Received",  description: "From: Kofi Mensah",         amount:  150, created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString()  },
    { id: "d2", type: "Reward Earned",        description: "Daily Check-in Bonus",      amount:   20, created_at: new Date(Date.now() - 1000 * 60 * 165).toISOString() },
    { id: "d3", type: "Bank Withdrawal",      description: "To: GCB Bank •••• 1234",   amount: -300, created_at: new Date(Date.now() - 86400000).toISOString()         },
  ];
  const displayTxns = txns.length > 0 ? txns : DEMO_TXN;

  if (quickPage) {
    const titles = {
      bank: "Bank Accounts", myRewards: "My Rewards", postGifts: "Post Gifts",
      payout: "Payout Methods", txHistory: "Transaction History",
    };
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setQuickPage(null)} style={{ background: "none", border: "none", color: T.goldBright, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
          <ChevronLeft size={18} /> Back
        </button>
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(198,161,91,0.12)", border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Trophy size={26} color={T.goldBright} />
          </div>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, color: T.paper, marginBottom: 8 }}>{titles[quickPage]}</div>
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7 }}>This feature is coming soon. Check back for updates.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", paddingBottom: 32 }}>

      {/* Balance Card — uses theme tokens, no hardcoded dark colors */}
      <div style={{ margin: "16px 16px 0" }}>
        <div style={{ background: `linear-gradient(135deg, ${T.card} 0%, ${T.ink} 100%)`, border: `1px solid ${T.cardBorder}`, borderRadius: 18, padding: "22px 20px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 18, background: "linear-gradient(135deg, rgba(198,161,91,0.07) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: T.goldBright, fontWeight: 600, marginBottom: 8, letterSpacing: 0.3 }}>Total Rewards Balance</div>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 32, color: T.paper, letterSpacing: -0.5, lineHeight: 1.15 }}>{fmtGHS(totalBalance)}</div>
              <div style={{ marginTop: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${T.cardBorder}88`, border: `1px solid ${T.gold}44`, borderRadius: 20, padding: "5px 12px", fontSize: 11.5, color: weeklyPct >= 0 ? T.goldBright : T.rust, fontWeight: 600 }}>
                  {weeklyPct >= 0 ? `+${weeklyPct.toFixed(2)}%` : `${weeklyPct.toFixed(2)}%`} this week
                </span>
              </div>
            </div>
            <div style={{ marginLeft: 8, marginTop: -4, flexShrink: 0 }}>
              <GoldBarsIcon />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div style={{ padding: "22px 16px 0" }}>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper, marginBottom: 16 }}>Quick Access</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {quickItems.map(({ icon: Icon, label, page }) => (
            <button key={page} onClick={() => setQuickPage(page)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0, flex: 1 }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: T.card, border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={22} color={T.goldBright} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 10.5, color: T.paper, textAlign: "center", fontWeight: 500, whiteSpace: "pre-line", lineHeight: 1.35 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Your Overview */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: "18px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 16, color: T.goldBright }}>↗</span>
            <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper }}>Your Overview</span>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 5 }}>Total Earned</div>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13, color: T.paper }}>{fmtGHS(totalEarned)}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>All time</div>
            </div>
            <div style={{ width: 1, background: T.cardBorder }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 5 }}>Total Withdrawn</div>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13, color: T.paper }}>{fmtGHS(totalWithdrawn)}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>All time</div>
            </div>
            <div style={{ width: 1, background: T.cardBorder }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 5 }}>Pending</div>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13, color: T.paper }}>{fmtGHS(pending)}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>Processing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.goldBright }}>Recent Activity</span>
          <button onClick={() => setQuickPage("txHistory")} style={{ background: "none", border: "none", color: T.goldBright, cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontSize: 12, fontFamily: FONT_HEAD, fontWeight: 600 }}>
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div>
          {displayTxns.map((tx, i) => {
            const IconComp = activityIcon(tx.type);
            const isPos = (tx.amount || 0) >= 0;
            return (
              <button key={tx.id || i} onClick={() => setQuickPage("txHistory")} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: i < displayTxns.length - 1 ? `1px solid ${T.cardBorder}` : "none" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `rgba(198,161,91,0.12)`, border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <IconComp size={20} color={T.goldBright} strokeWidth={1.6} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 13, color: T.paper }}>{tx.type || "Transaction"}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{tx.description || ""}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: isPos ? T.goldBright : T.rust }}>
                    {isPos ? `+${fmtGHS(Math.abs(tx.amount || 0))}` : `-${fmtGHS(Math.abs(tx.amount || 0))}`}
                  </div>
                  <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{fmtDate(tx.created_at)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ── Creator Wallet Screen ─────────────────────────────────────────────────
function CreatorWalletScreen({ account }) {
  const [walletData, setWalletData] = useState(null);
  const [txns, setTxns] = useState([]);
  const [walletPage, setWalletPage] = useState(null); // "topup" | "withdraw" | "history"
  const [payStep, setPayStep] = useState(null);   // chosen payment method
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!account?.id) return;
    supabase.from("wallet_balances").select("*").eq("user_id", account.id).single()
      .then(({ data }) => { if (data) setWalletData(data); }).catch(() => {});
    supabase.from("wallet_transactions").select("*").eq("user_id", account.id)
      .order("created_at", { ascending: false }).limit(15)
      .then(({ data }) => { if (data) setTxns(data); }).catch(() => {});
  }, [account?.id]);

  const balance = walletData?.balance ?? 0;
  const fmtGHS  = (n) => `GHS ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = Date.now() - d;
    if (diff < 86400000) return `Today, ${d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}`;
    if (diff < 172800000) return `Yesterday`;
    return d.toLocaleDateString("en-GH");
  };

  const PAYMENT_METHODS = [
    { id: "momo", label: "Mobile Money (MTN MoMo)", icon: "📱" },
    { id: "bank", label: "Bank Transfer", icon: "🏦" },
    { id: "card", label: "Visa / Mastercard", icon: "💳" },
  ];

  const handleSubmit = async () => {
    if (!amount || isNaN(+amount) || +amount <= 0) { setMsg("Enter a valid amount."); return; }
    setBusy(true); setMsg("");
    await supabase.from("wallet_transactions").insert({
      user_id: account.id,
      type: walletPage === "topup" ? "Top Up" : "Withdrawal",
      amount: walletPage === "topup" ? +amount : -(+amount),
      description: `Via ${payStep?.label || "—"}`,
      status: "pending",
    });
    setBusy(false);
    setMsg(walletPage === "topup" ? "Top-up request submitted! You will be notified once confirmed." : "Withdrawal request submitted! Processing within 24h.");
    setPayStep(null); setAmount("");
  };

  // Top-up or withdraw flow
  if (walletPage && payStep) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setPayStep(null)} style={{ background: "none", border: "none", color: T.goldBright, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: T.paper, marginBottom: 4 }}>{walletPage === "topup" ? "Top Up Wallet" : "Withdraw Funds"}</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>Via {payStep.label}</div>
        {msg ? (
          <div style={{ background: `rgba(122,158,134,0.12)`, border: `1px solid ${T.sage}44`, borderRadius: 14, padding: 18, marginBottom: 16, fontSize: 13, color: T.sage, lineHeight: 1.6 }}>{msg}</div>
        ) : null}
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>Amount (GHS)</label>
        <input
          type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          style={{ ...getInputStyle(), width: "100%", marginBottom: 16, fontSize: 20, fontFamily: FONT_HEAD, fontWeight: 700, textAlign: "center" }}
        />
        {!msg && (
          <button onClick={handleSubmit} disabled={busy} style={{ width: "100%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`, color: T.ink, border: "none", borderRadius: 13, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            {busy ? "Processing…" : walletPage === "topup" ? `Top Up ${amount ? fmtGHS(+amount) : ""}` : `Withdraw ${amount ? fmtGHS(+amount) : ""}`}
          </button>
        )}
      </div>
    );
  }

  if (walletPage) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setWalletPage(null)} style={{ background: "none", border: "none", color: T.goldBright, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: T.paper, marginBottom: 16 }}>{walletPage === "topup" ? "Select Top-Up Method" : walletPage === "withdraw" ? "Select Withdrawal Method" : "Transaction History"}</div>
        {walletPage === "history" ? (
          txns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: T.muted, fontSize: 13 }}>No transactions yet.</div>
          ) : txns.map((tx, i) => {
            const isPos = (tx.amount || 0) > 0;
            return (
              <div key={tx.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: i < txns.length - 1 ? `1px solid ${T.cardBorder}` : "none" }}>
                <div>
                  <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper }}>{tx.type || "Transaction"}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{fmtDate(tx.created_at)} · {tx.status || "pending"}</div>
                </div>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: isPos ? T.goldBright : T.rust }}>
                  {isPos ? "+" : ""}{fmtGHS(Math.abs(tx.amount || 0))}
                </div>
              </div>
            );
          })
        ) : PAYMENT_METHODS.map(m => (
          <button key={m.id} onClick={() => setPayStep(m)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
            <span style={{ fontSize: 24 }}>{m.icon}</span>
            <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper }}>{m.label}</span>
            <ChevronRight size={16} color={T.muted} style={{ marginLeft: "auto" }} />
          </button>
        ))}
      </div>
    );
  }

  // Main wallet screen
  const DEMO_TXN = [
    { id: "w1", type: "Top Up",    description: "Via MTN MoMo", amount:  500, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: "w2", type: "Withdrawal", description: "To: GCB Bank", amount: -200, created_at: new Date(Date.now() - 172800000).toISOString() },
  ];
  const displayTxns = txns.length > 0 ? txns : DEMO_TXN;

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Virtual card */}
      <div style={{ margin: "16px 16px 0" }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldBright} 40%, #8B6914 100%)`,
          borderRadius: 20, padding: "26px 22px 22px", position: "relative", overflow: "hidden", minHeight: 170,
          boxShadow: `0 8px 32px ${T.gold}44`,
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", bottom: -20, right: 30, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11, color: "rgba(0,0,0,0.55)", letterSpacing: 1.5, marginBottom: 24 }}>CREATOR WALLET</div>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 30, color: T.ink, letterSpacing: -0.5 }}>{fmtGHS(balance)}</div>
          <div style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", marginTop: 4, fontFamily: FONT_HEAD }}>Available Balance</div>
          <div style={{ position: "absolute", bottom: 20, right: 22, fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14, color: "rgba(0,0,0,0.4)" }}>RainX</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ margin: "16px 16px 0", display: "flex", gap: 10 }}>
        <button onClick={() => setWalletPage("topup")} style={{ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "16px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `rgba(198,161,91,0.12)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowUpCircle size={22} color={T.gold} />
          </div>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, color: T.paper }}>Top Up</span>
        </button>
        <button onClick={() => setWalletPage("withdraw")} style={{ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "16px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `rgba(176,96,74,0.12)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowDownCircle size={22} color={T.rust} />
          </div>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, color: T.paper }}>Withdraw</span>
        </button>
        <button onClick={() => setWalletPage("history")} style={{ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "16px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `rgba(91,156,246,0.12)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ScrollText size={22} color="#5B9CF6" />
          </div>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, color: T.paper }}>History</span>
        </button>
      </div>

      {/* Recent transactions */}
      <div style={{ padding: "22px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper }}>Recent Transactions</span>
          <button onClick={() => setWalletPage("history")} style={{ background: "none", border: "none", color: T.goldBright, cursor: "pointer", fontSize: 12, fontFamily: FONT_HEAD, fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, overflow: "hidden" }}>
          {displayTxns.slice(0, 5).map((tx, i) => {
            const isPos = (tx.amount || 0) > 0;
            return (
              <div key={tx.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: i < Math.min(displayTxns.length, 5) - 1 ? `1px solid ${T.cardBorder}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: isPos ? `rgba(198,161,91,0.12)` : `rgba(176,96,74,0.12)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isPos ? <ArrowUpCircle size={18} color={T.gold} /> : <ArrowDownCircle size={18} color={T.rust} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper }}>{tx.type}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{tx.description || ""} · {fmtDate(tx.created_at)}</div>
                  </div>
                </div>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: isPos ? T.goldBright : T.rust }}>
                  {isPos ? "+" : ""}{fmtGHS(Math.abs(tx.amount || 0))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MoreTab({ autoScan, setAutoScan, analysis, inst, last, account, onLogout, setTab, entitlement, themeMode, setThemeMode }) {
  const [morePage, setMorePage] = useState(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [benefits, setBenefits] = useState(DEFAULT_BENEFITS);
  const [verification, setVerification] = useState(null);
  const [showLegal, setShowLegal] = useState(false);

  // Map subscription tier → verification badge (single source of truth)
  const tierToVerif = (t) => {
    if (t === "biannual") return "golden";
    if (t === "monthly" || t === "weekly") return "blue";
    return null;
  };

  useEffect(() => {
    if (!account?.id) return;
    supabase.from("profiles").select("username, bio, avatar_url, verification_status").eq("id", account.id).single().then(({ data }) => {
      if (data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || null);
      }
    });
    supabase.from("site_content").select("value").eq("key", "more_benefits").single().then(({ data }) => {
      if (data?.value) { try { setBenefits(JSON.parse(data.value)); } catch { /* use defaults */ } }
    });
  }, [account?.id]);

  // Derive verification from live entitlement and keep DB in sync
  useEffect(() => {
    if (!account?.id || entitlement.tier === "loading") return;
    const expected = tierToVerif(entitlement.tier);
    setVerification(expected);
    // Sync the DB so community profile / other places stay consistent
    supabase.from("profiles").update({ verification_status: expected }).eq("id", account.id).then(() => {});
  }, [account?.id, entitlement.tier]);

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
    const clean = username.trim() ? username.trim().replace(/[\x00-\x1F\x7F]/g, "").slice(0, 30) : null;
    const { error } = await supabase.from("profiles").update({ username: clean, bio: bio.trim() }).eq("id", account.id);
    setSavingProfile(false);
    setProfileMsg(error ? (error.code === "23505" ? "That username is taken." : "Something went wrong.") : "Saved.");
  };

  const rewardsPlan = entitlement.tier === "none" ? "Not enrolled" :
    entitlement.tier === "weekly"   ? "Weekly Rewards"    :
    entitlement.tier === "monthly"  ? "Monthly Rewards"   :
    entitlement.tier === "biannual" ? "Bi-Annual Rewards" : "Loading…";

  const verificationLabel =
    verification === "golden" ? "Golden Verified" :
    verification === "blue"   ? "Blue Verified"   :
    verification === "verified" || verification === "basic" ? "Verified" :
    "Not Verified";

  const BLUE = "#5B9CF6";
  const verificationColor =
    verification === "golden" ? T.goldBright :
    verification === "blue"   ? BLUE         : T.muted;

  // Inline verified badge — same circular checkmark shape as community, colour-coded by tier
  const VerifBadgeIcon = ({ size = 16 }) =>
    verification === "golden" ? (
      <svg width={size} height={size} viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }}>
        <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#E3C077" />
      </svg>
    ) : verification === "blue" ? (
      <svg width={size} height={size} viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }}>
        <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0" />
      </svg>
    ) : (
      <ShieldCheck size={size} color={T.muted} />
    );

  const profileInitial = (username || account?.email || "?")[0]?.toUpperCase();

  // ---- Sub-screens ----
  if (morePage === "profile") return (
    <MoreSubScreen onBack={() => setMorePage(null)}>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: 18, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
            : <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, fontWeight: 800, fontFamily: FONT_HEAD, fontSize: 22 }}>{profileInitial}</div>
          }
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper }}>{username || account?.email}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>Member since {new Date(account?.joinedAt || Date.now()).toLocaleDateString()}</div>
            <label style={{ display: "inline-block", marginTop: 6, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "5px 10px", color: T.goldBright, fontSize: 11, cursor: "pointer", fontFamily: FONT_HEAD, fontWeight: 600 }}>
              {uploadingAvatar ? "Uploading…" : "Change photo"}
              <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadAvatar(e.target.files[0])} style={{ display: "none" }} disabled={uploadingAvatar} />
            </label>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Leave blank to show email" style={{ ...getInputStyle(), width: "100%" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>Bio</label>
          <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Say something about yourself" style={{ ...getInputStyle(), width: "100%" }} />
        </div>
        {profileMsg && <div style={{ fontSize: 11, color: profileMsg === "Saved." ? T.sage : T.rust, marginBottom: 10 }}>{profileMsg}</div>}
        <button onClick={saveProfile} disabled={savingProfile} style={{ width: "100%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`, color: T.ink, border: "none", borderRadius: 12, padding: "13px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
          {savingProfile ? "Saving…" : "Save Profile"}
        </button>
        <button onClick={() => setMorePage("security")} style={{ width: "100%", marginTop: 10, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Lock size={15} color={T.gold} /> Security Settings
        </button>
        <button onClick={onLogout} style={{ width: "100%", marginTop: 10, background: "none", border: `1px solid rgba(176,96,74,0.4)`, borderRadius: 12, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.rust, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <LogOut size={15} /> Log out
        </button>
      </div>
    </MoreSubScreen>
  );

  if (morePage === "verification") {
    const isGolden = verification === "golden";
    const isBlue   = verification === "blue";
    const isVerif  = isGolden || isBlue;
    const badgeBg  = isGolden ? "rgba(198,161,91,0.12)" : isBlue ? "rgba(91,156,246,0.12)" : "rgba(100,100,100,0.10)";
    const badgeBorder = isGolden ? T.gold : isBlue ? "#5B9CF6" : T.cardBorder;
    const iconBg   = isGolden ? "rgba(198,161,91,0.15)" : isBlue ? "rgba(91,156,246,0.15)" : "rgba(100,100,100,0.08)";
    const iconBorder = isGolden ? `2px solid ${T.gold}` : isBlue ? "2px solid #5B9CF6" : `1px solid ${T.cardBorder}`;

    const tiers = [
      { key: "weekly",   label: "Weekly",    verif: "Blue Verified",   icon: "blue",   desc: "Subscribers on the Weekly plan receive a Blue Verified badge." },
      { key: "monthly",  label: "Monthly",   verif: "Blue Verified",   icon: "blue",   desc: "Subscribers on the Monthly plan receive a Blue Verified badge." },
      { key: "biannual", label: "Bi-Annual", verif: "Golden Verified", icon: "golden", desc: "Premium Bi-Annual subscribers receive the exclusive Golden Verified badge." },
    ];

    return (
      <MoreSubScreen onBack={() => setMorePage(null)} title="Verification" subtitle="Your identity & trust level">
        <div style={{ padding: 16 }}>
          {/* Status card */}
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 18, padding: 24, marginBottom: 14, textAlign: "center" }}>
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: iconBg, border: iconBorder, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              {isGolden ? (
                <svg width="38" height="38" viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }}>
                  <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#E3C077" />
                </svg>
              ) : isBlue ? (
                <svg width="38" height="38" viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }}>
                  <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0" />
                </svg>
              ) : (
                <ShieldCheck size={34} color={T.muted} />
              )}
            </div>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 17, color: T.paper, marginBottom: 10 }}>
              {isVerif ? verificationLabel : "Not Verified"}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: badgeBg, border: `1px solid ${badgeBorder}`, borderRadius: 20, padding: "7px 18px" }}>
              <VerifBadgeIcon size={13} />
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, color: verificationColor }}>{verificationLabel}</span>
            </div>
            {isVerif && (
              <div style={{ marginTop: 12, fontSize: 11.5, color: T.muted, lineHeight: 1.6 }}>
                {isGolden ? "Premium Bi-Annual subscriber · highest trust level" : "Active subscriber · community trusted"}
              </div>
            )}
          </div>

          {/* Tier breakdown */}
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: "6px 0", marginBottom: 14 }}>
            <div style={{ padding: "12px 16px 8px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, color: T.goldBright, letterSpacing: 0.5 }}>HOW IT WORKS</div>
            {tiers.map((t, i) => {
              const active = entitlement.tier === t.key;
              const tBlue = t.icon === "blue";
              return (
                <div key={t.key} style={{ padding: "12px 16px", borderTop: i > 0 ? `1px solid ${T.cardBorder}` : "none", display: "flex", alignItems: "center", gap: 12, background: active ? (tBlue ? "rgba(91,156,246,0.06)" : "rgba(198,161,91,0.06)") : "transparent" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: tBlue ? "rgba(91,156,246,0.12)" : "rgba(198,161,91,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {tBlue ? (
                      <svg width="16" height="16" viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }}>
                        <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }}>
                        <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#E3C077" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper }}>{t.label} Plan</span>
                      {active && <span style={{ fontSize: 10, fontWeight: 700, color: tBlue ? "#5B9CF6" : T.goldBright, background: tBlue ? "rgba(91,156,246,0.15)" : "rgba(198,161,91,0.15)", borderRadius: 8, padding: "2px 7px" }}>ACTIVE</span>}
                    </div>
                    <div style={{ fontSize: 11, color: tBlue ? "#5B9CF6" : T.goldBright, marginTop: 2, fontWeight: 600 }}>{t.verif}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          {!isVerif && (
            <button onClick={() => setMorePage("rewards")} style={{ width: "100%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`, color: T.ink, border: "none", borderRadius: 13, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
              Get Verified — View Plans
            </button>
          )}
          {isVerif && (
            <button onClick={() => setMorePage("rewards")} style={{ width: "100%", background: "none", border: `1px solid ${verificationColor}`, borderRadius: 13, padding: "13px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, cursor: "pointer", color: verificationColor }}>
              View Rewards & Balance
            </button>
          )}
        </div>
      </MoreSubScreen>
    );
  }

  if (morePage === "rewards") return entitlement.tier !== "none" ? (
    <MoreSubScreen onBack={() => setMorePage(null)} title="Rewards & Balance" subtitle="Track your earnings and rewards" rightElement={<Bell size={20} color={T.muted} style={{ cursor: "pointer" }} />}>
      <RewardsScreen account={account} entitlement={entitlement} />
    </MoreSubScreen>
  ) : (
    <MoreSubScreen onBack={() => setMorePage(null)} title="Trader Rewards Program" subtitle="Choose a plan to get started">
      <SubscribeScreen account={account} entitlement={entitlement} onBack={() => setMorePage(null)} />
    </MoreSubScreen>
  );

  if (morePage === "wallet") return (
    <MoreSubScreen onBack={() => setMorePage(null)} title="Creator Wallet" subtitle="Your personal trading wallet">
      <CreatorWalletScreen account={account} />
    </MoreSubScreen>
  );

  if (morePage === "history") return (
    <MoreSubScreen onBack={() => setMorePage(null)}>
      <HistoryTab account={account} entitlement={entitlement} onSubscribe={() => setMorePage("rewards")} />
    </MoreSubScreen>
  );

  if (morePage === "scalping") return (
    <MoreSubScreen onBack={() => setMorePage(null)}>
      <ScalpingTab account={account} entitlement={entitlement} onSubscribe={() => setMorePage("rewards")} />
    </MoreSubScreen>
  );

  if (morePage === "telegram") return (
    <MoreSubScreen onBack={() => setMorePage(null)}>
      <div style={{ padding: 16 }}>
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 22, marginBottom: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#229ED9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Send size={22} color="#fff" />
          </div>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, color: T.paper, marginBottom: 8 }}>Connect to Telegram</div>
          <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.8, marginBottom: 18 }}>
            Receive live signals directly in Telegram. Open the bot, tap <strong style={{ color: T.paper }}>Start</strong>, choose <strong style={{ color: T.paper }}>Log in</strong>, and enter your RainX email and password to link your account.
          </div>
          <a href="https://t.me/RainaAIBot" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#229ED9", color: "#fff", border: "none", borderRadius: 12, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, cursor: "pointer", textDecoration: "none", boxSizing: "border-box" }}>
            <Send size={16} /> Open @RainaAIBot
          </a>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.7 }}>Already linked? Your signals will arrive automatically when confidence ≥ 65%.</div>
        </div>
      </div>
    </MoreSubScreen>
  );

  // Community profile = redirect to main profile (same data)
  if (morePage === "community-profile") {
    setMorePage("profile");
    return null;
  }

  if (morePage === "security") return (
    <MoreSubScreen onBack={() => setMorePage(null)} title="Security" subtitle="Protect your account">
      <div style={{ padding: 16 }}>
        {/* Reset password */}
        <SecuritySection
          icon={Key}
          title="Change Password"
          desc="Update your account password"
          onPress={async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(account?.email || "");
            if (!error) alert("Password reset link sent to your email.");
            else alert("Could not send reset email. Try again.");
          }}
          label="Send Reset Email"
        />
        {/* 2FA */}
        <SecuritySection
          icon={Smartphone}
          title="Two-Step Authentication"
          desc="Add an extra layer of protection to your account"
          onPress={() => alert("2FA setup is coming soon. Check back for updates.")}
          label="Set Up 2FA"
          comingSoon
        />
        {/* Phone number */}
        <SecuritySection
          icon={Smartphone}
          title="Phone Number"
          desc="Add a phone number for account recovery"
          onPress={() => alert("Phone verification is coming soon.")}
          label="Add Phone"
          comingSoon
        />
        {/* Active sessions */}
        <SecuritySection
          icon={Eye}
          title="Active Sessions"
          desc="View and manage your active login sessions"
          onPress={() => alert("Session management coming soon.")}
          label="View Sessions"
          comingSoon
        />
        {/* Delete account */}
        <div style={{ marginTop: 24 }}>
          <button onClick={() => {
            if (window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
              alert("Please contact support to delete your account.");
            }
          }} style={{ width: "100%", background: "none", border: `1px solid ${T.rust}44`, borderRadius: 13, padding: "13px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.rust, cursor: "pointer" }}>
            Delete Account
          </button>
        </div>
      </div>
    </MoreSubScreen>
  );

  // ---- Main More Page ----
  return (
    <div style={{ padding: "8px 16px 28px" }}>
      <MoreSection title="Account">
        <MoreRow
          icon={Users2}
          title={username || account?.email || "Profile"}
          subtitle={`Member since ${new Date(account?.joinedAt || Date.now()).toLocaleDateString()}`}
          onPress={() => setMorePage("profile")}
        />
        <MoreRowDivider />
        <div style={{ display: "flex" }}>
          <button onClick={() => setMorePage("verification")} style={{ flex: 1, display: "flex", alignItems: "center", padding: "12px 14px", background: "none", border: "none", borderRight: `1px solid ${T.cardBorder}`, cursor: "pointer", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: verification === "golden" ? "rgba(198,161,91,0.12)" : verification === "blue" ? "rgba(91,156,246,0.12)" : "rgba(100,100,100,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <VerifBadgeIcon size={16} />
            </div>
            <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11.5, color: T.paper, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Verification</div>
              <div style={{ fontSize: 10.5, color: verificationColor, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3 }}>
                {verificationLabel}
              </div>
            </div>
            <ChevronRight size={13} color={T.muted} style={{ flexShrink: 0 }} />
          </button>
          <button onClick={() => setMorePage("rewards")} style={{ flex: 1, display: "flex", alignItems: "center", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(198,161,91,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CreditCardIcon size={16} color={T.gold} />
            </div>
            <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11.5, color: T.paper, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Rewards</div>
              <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rewardsPlan}</div>
            </div>
            <ChevronRight size={13} color={T.muted} style={{ flexShrink: 0 }} />
          </button>
        </div>
      </MoreSection>

      <MoreSection title="Trader Rewards Programme">
        {benefits.map((b, i) => (
          <React.Fragment key={b.id}>
            {i > 0 && <MoreRowDivider />}
            <MoreRow
              iconType={b.icon}
              title={b.title}
              badge={b.status}
              badgeColor={b.status === "Qualified" ? T.goldBright : undefined}
              onPress={() => b.id === "verification" ? setMorePage("verification") : setMorePage("rewards")}
            />
          </React.Fragment>
        ))}
      </MoreSection>

      <MoreSection title="Wallet">
        <MoreRow
          icon={Wallet}
          title="Creator Wallet"
          subtitle="Your personal trading wallet"
          onPress={() => setMorePage("wallet")}
        />
      </MoreSection>

      <MoreSection title="More">
        <MoreRow icon={ScrollText} title="Trade History" onPress={() => setMorePage("history")} />
        <MoreRowDivider />
        <MoreRow
          icon={Zap}
          title="Scalping"
          badge={hasAccess(entitlement.tier, "monthly") ? "Unlocked" : "Locked"}
          badgeColor={hasAccess(entitlement.tier, "monthly") ? T.sage : T.muted}
          onPress={() => setMorePage("scalping")}
        />
        <MoreRowDivider />
        <MoreRow icon={Send} title="Connect Telegram" onPress={() => setMorePage("telegram")} />
        <MoreRowDivider />
        <MoreRow icon={Lock} title="Security" onPress={() => setMorePage("security")} />
      </MoreSection>

      <MoreSection title="Appearance">
        {[["light","Light","Sun — white background"],["dark","Dark","Moon — dark background"],["system","System","Match device setting"]].map(([val, label, desc]) => (
          <React.Fragment key={val}>
            <button onClick={() => { lsSet("rainx-theme", val); setThemeMode(val); }} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "13px 16px", gap: 12 }}>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, color: T.paper }}>{label}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{desc}</div>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${themeMode === val ? T.gold : T.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {themeMode === val && <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.gold }} />}
              </div>
            </button>
            {val !== "system" && <MoreRowDivider />}
          </React.Fragment>
        ))}
      </MoreSection>

      <div style={{ textAlign: "center", marginTop: 4 }}>
        <button onClick={() => setShowLegal(true)} style={{ background: "none", border: "none", color: T.muted, fontSize: 10.5, cursor: "pointer", textDecoration: "underline", fontFamily: FONT_BODY }}>Terms & Risk Disclosure</button>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 4, lineHeight: 1.6 }}>RainX is an analysis tool, not a broker.</div>
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
              <p><strong>No guaranteed outcomes.</strong> Trading forex, metals, indices, and crypto carries a high level of risk and may not be suitable for all investors. Past performance and AI-generated confidence scores do not guarantee future results.</p>
              <p><strong>Your responsibility.</strong> You are solely responsible for your own trading decisions, position sizing, and risk management. RainX does not execute trades and is not a broker.</p>
              <p><strong>Data.</strong> Market data and analysis in this app may be simulated or delayed pending a live data connection. Always verify prices with your broker before acting.</p>
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
