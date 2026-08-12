import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell, Home, Briefcase, MessageCircle, MoreHorizontal, Settings, X,
  TrendingUp, TrendingDown, Minus, Activity, Send, Calendar as CalendarIcon,
  Calculator, Mail, ShieldCheck, LogOut, Mic, Square, FileText, ScrollText, Users2,
  CreditCard as CreditCardIcon, Zap, ArrowRight, ChevronRight, ChevronLeft, Wallet, Landmark, Gift, Trophy,
  Maximize2, User, Lock, Smartphone, Eye, EyeOff, Key, ArrowUpCircle, ArrowDownCircle, Plus,
} from "lucide-react";
import { supabase } from "./supabaseClient";

// ---------- Design tokens ----------
export const T = {
  ink: "#0F0E0B",
  card: "#1C1913",
  cardBorder: "#332C1F",
  gold: "#FFD24D",
  goldBright: "#FFD24D",
  sage: "#7A9E86",
  rust: "#B0604A",
  paper: "#F2EDE0",
  muted: "#9C947F",
};
// Light and dark token palettes – applied by mutating T in-place inside MainAppContent
// Module-level signal for triggering HeaderAvatar refresh after upload/save
export let _avatarRefreshTick = 0;
export const _avatarRefreshListeners = new Set();
export function notifyAvatarRefresh() { _avatarRefreshTick++; _avatarRefreshListeners.forEach(fn => fn(_avatarRefreshTick)); }

export const DARK_TOKENS  = { ink:"#0F0E0B", card:"#1C1913", cardBorder:"#332C1F", gold:"#FFD24D", goldBright:"#FFD24D", sage:"#7A9E86",  rust:"#B0604A", paper:"#F2EDE0", muted:"#9C947F" };
export const LIGHT_TOKENS = { ink:"#FFFFFF",  card:"#F7F9F9", cardBorder:"#EFF3F4", gold:"#FFD24D", goldBright:"#FFD24D", sage:"#1A7A50",  rust:"#C0392B", paper:"#0F1419", muted:"#536471" };
export const FONT_HEAD = "'Montserrat', sans-serif";
export const FONT_BODY = "'Montserrat', sans-serif";
export const COUNTRIES = ["Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Bulgaria","Cameroon","Canada","Chile","China","Colombia","Costa Rica","Croatia","Cuba","Czech Republic","Denmark","Ecuador","Egypt","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Lebanon","Libya","Malaysia","Mexico","Morocco","Mozambique","Myanmar","Nepal","Netherlands","New Zealand","Nicaragua","Nigeria","Norway","Oman","Pakistan","Panama","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Singapore","Somalia","South Africa","South Korea","Spain","Sudan","Sweden","Switzerland","Taiwan","Tanzania","Thailand","Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];


export const LOCATION_SUGGESTIONS = [
  "Accra, Ghana","Kumasi, Ghana","Tema, Ghana","Takoradi, Ghana",
  "Lagos, Nigeria","Abuja, Nigeria","Kano, Nigeria","Ibadan, Nigeria","Port Harcourt, Nigeria","Benin City, Nigeria",
  "Nairobi, Kenya","Mombasa, Kenya","Kampala, Uganda","Dar es Salaam, Tanzania","Kigali, Rwanda","Lusaka, Zambia",
  "Johannesburg, South Africa","Cape Town, South Africa","Durban, South Africa","Pretoria, South Africa",
  "Harare, Zimbabwe","Gaborone, Botswana","Windhoek, Namibia","Maputo, Mozambique","Lilongwe, Malawi",
  "Cairo, Egypt","Alexandria, Egypt","Addis Ababa, Ethiopia","Casablanca, Morocco","Tunis, Tunisia",
  "Dakar, Senegal","Abidjan, Côte d'Ivoire","Accra Metro, Ghana","Kumasi Metro, Ghana",
  "London, UK","Manchester, UK","Birmingham, UK","Glasgow, UK","Edinburgh, UK","Liverpool, UK","Bristol, UK","Leeds, UK",
  "New York, USA","Los Angeles, USA","Chicago, USA","Houston, USA","Miami, USA","Atlanta, USA",
  "Dallas, USA","San Francisco, USA","Seattle, USA","Boston, USA","Washington DC, USA","Phoenix, USA",
  "Toronto, Canada","Vancouver, Canada","Montreal, Canada","Calgary, Canada","Ottawa, Canada","Edmonton, Canada",
  "Sydney, Australia","Melbourne, Australia","Brisbane, Australia","Perth, Australia","Adelaide, Australia",
  "Dublin, Ireland","Amsterdam, Netherlands","Paris, France","Berlin, Germany","Madrid, Spain","Rome, Italy",
  "Zurich, Switzerland","Vienna, Austria","Stockholm, Sweden","Oslo, Norway","Copenhagen, Denmark",
  "Dubai, UAE","Abu Dhabi, UAE","Riyadh, Saudi Arabia","Doha, Qatar","Kuwait City, Kuwait","Manama, Bahrain",
  "Kuala Lumpur, Malaysia","Singapore","Bangkok, Thailand","Jakarta, Indonesia","Manila, Philippines",
  "Tokyo, Japan","Seoul, South Korea","Hong Kong","Shanghai, China","Beijing, China","Shenzhen, China",
  "Mumbai, India","Delhi, India","Bengaluru, India","Chennai, India","Hyderabad, India","Kolkata, India",
  "Karachi, Pakistan","Lahore, Pakistan","Islamabad, Pakistan","Dhaka, Bangladesh","Colombo, Sri Lanka",
  "São Paulo, Brazil","Rio de Janeiro, Brazil","Buenos Aires, Argentina","Bogotá, Colombia",
  "Lima, Peru","Santiago, Chile","Mexico City, Mexico","Guadalajara, Mexico",
];

export function CoverCropModal({ file, onConfirm, onCancel, T, FONT_HEAD }) {
  const DISPLAY_W = 340;
  const CROP_RATIO = 4; // 4:1 banner
  const DISPLAY_H = Math.round(DISPLAY_W / CROP_RATIO);
  const canvasRef = React.useRef(null);
  const [imgSrc, setImgSrc] = React.useState(null);
  const [natW, setNatW] = React.useState(1);
  const [natH, setNatH] = React.useState(1);
  const [offsetY, setOffsetY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragRef = React.useRef({ startY: 0, startOffset: 0 });

  React.useEffect(() => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        setNatW(img.naturalWidth); setNatH(img.naturalHeight);
        const scale = DISPLAY_W / img.naturalWidth;
        const rh = img.naturalHeight * scale;
        setOffsetY(-Math.max(0, (rh - DISPLAY_H) / 2));
      };
      img.src = e.target.result;
      setImgSrc(e.target.result);
    };
    reader.readAsDataURL(file);
  }, [file]);

  const scale = DISPLAY_W / natW;
  const renderedH = natH * scale;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const onPD = e => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); dragRef.current = { startY: e.clientY, startOffset: offsetY }; };
  const onPM = e => { if (!dragging) return; const dy = e.clientY - dragRef.current.startY; setOffsetY(clamp(dragRef.current.startOffset + dy, -(renderedH - DISPLAY_H), 0)); };
  const onPU = () => setDragging(false);

  const confirm = () => {
    const OUT_W = 1200, OUT_H = 300;
    const cvs = canvasRef.current; cvs.width = OUT_W; cvs.height = OUT_H;
    const ctx = cvs.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const srcY = (-offsetY / scale);
      const srcH = natW / CROP_RATIO;
      ctx.drawImage(img, 0, srcY, natW, srcH, 0, 0, OUT_W, OUT_H);
      cvs.toBlob(blob => onConfirm(blob), 'image/jpeg', 0.88);
    };
    img.src = imgSrc;
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.88)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
      onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU}>
      <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:15, color:'#fff', marginBottom:14 }}>Drag to position</div>
      <div style={{ width:DISPLAY_W, height:DISPLAY_H, overflow:'hidden', borderRadius:8, border:'2px solid #FFD24D', cursor:dragging?'grabbing':'grab', position:'relative', userSelect:'none', touchAction:'none' }}
        onPointerDown={onPD}>
        {imgSrc && <img src={imgSrc} style={{ width:DISPLAY_W, height:'auto', position:'absolute', top:offsetY, left:0, pointerEvents:'none', userSelect:'none', draggable:false }} alt='' />}
      </div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:10, marginBottom:20 }}>Cover photo · 4:1</div>
      <div style={{ display:'flex', gap:12 }}>
        <button onClick={onCancel} style={{ background:'none', border:'1px solid rgba(255,255,255,0.25)', borderRadius:10, padding:'10px 24px', color:'#fff', fontFamily:FONT_HEAD, fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancel</button>
        <button onClick={confirm} style={{ background:'#FFD24D', border:'none', borderRadius:10, padding:'10px 24px', color:'#0F0E0B', fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, cursor:'pointer' }}>Use photo</button>
      </div>
      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  );
}

export function ProfileLocationInput({ value, onChange, T, FONT_HEAD }) {
  const [open, setOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);
  const handleInput = (v) => {
    onChange(v);
    if (v.length >= 2) {
      const q = v.toLowerCase();
      const matches = LOCATION_SUGGESTIONS.filter(l =>
        l.toLowerCase().startsWith(q) || l.toLowerCase().includes(q)
      ).slice(0, 6);
      setSuggestions(matches);
      setOpen(matches.length > 0);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };
  return (
    <div style={{ position:"relative" }}>
      <input
        type="text"
        value={value}
        onChange={e => handleInput(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="City, Country or region"
        style={{ width:"100%", background:"none", border:"none", borderBottom:`1px solid ${T.cardBorder}`, color:T.paper, fontSize:15, padding:"6px 0", fontFamily:FONT_HEAD, outline:"none", boxSizing:"border-box" }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:10, zIndex:200, boxShadow:"0 6px 20px rgba(0,0,0,0.5)", overflow:"hidden" }}>
          {suggestions.map(s => (
            <button key={s} onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); setSuggestions([]); }}
              style={{ width:"100%", textAlign:"left", padding:"11px 14px", background:"none", border:"none", borderBottom:`1px solid ${T.cardBorder}44`, color:T.paper, fontSize:13, cursor:"pointer", fontFamily:FONT_HEAD }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ---------- Resilient storage (uses Claude's artifact storage when present,
// otherwise falls back to real localStorage - which works fine once this is
// deployed as a normal website outside the Claude preview sandbox) ----------
const memoryStore = {};
export function lsGet(key) {
  try { const v = localStorage.getItem(key); return v !== null ? v : undefined; } catch { return memoryStore[key]; }
}
export function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { memoryStore[key] = value; }
}
export function lsDelete(key) {
  try { localStorage.removeItem(key); } catch { delete memoryStore[key]; }
}

// ── URL-hash routing helpers — keeps current page alive across refresh ────────
const _ROUTE_TABS = ["home","markets","community","more","history","scalping","subscribe"];
export function routeRead() {
  try {
    const h = window.location.hash.slice(1);
    if (!h) return { tab: null, sub: null, flag: null };
    const [a, b, c] = h.split("/");
    return { tab: _ROUTE_TABS.includes(a) ? a : null, sub: b || null, flag: c || null };
  } catch { return { tab: null, sub: null, flag: null }; }
}
export function routeWrite(tab, sub, flag) {
  try {
    let h = tab || "home";
    if (sub)  h += "/" + encodeURIComponent(sub);
    if (flag) h += "/" + flag;
    const next = "#" + h;
    if (window.location.hash !== next) history.pushState(null, "", next);
  } catch {}
}
export function routeReplace(tab, sub, flag) {
  try {
    let h = tab || "home";
    if (sub)  h += "/" + encodeURIComponent(sub);
    if (flag) h += "/" + flag;
    const next = "#" + h;
    if (window.location.hash !== next) history.replaceState(null, "", next);
  } catch {}
}
export async function storageGet(key, shared) {
  if (typeof window !== "undefined" && window.storage && typeof window.storage.get === "function") {
    try { return await window.storage.get(key, shared); } catch { /* fall through */ }
  }
  const v = lsGet(key);
  return v !== undefined ? { key, value: v, shared } : null;
}
export async function storageSet(key, value, shared) {
  lsSet(key, value);
  if (typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") {
    try { return await window.storage.set(key, value, shared); } catch { /* fall through */ }
  }
  return { key, value, shared };
}
export async function storageDelete(key, shared) {
  lsDelete(key);
  if (typeof window !== "undefined" && window.storage && typeof window.storage.delete === "function") {
    try { return await window.storage.delete(key, shared); } catch { /* fall through */ }
  }
  return null;
}

// ---------- Asset catalog --------------------------------------------------------
export const ASSET_CATALOG = [
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
export const ALL_ASSETS = ASSET_CATALOG.flatMap(c => c.assets.map(a => ({ ...a, category:c.id })));
// Keep INSTRUMENTS as the 3 default chart-data assets (price engine seeded for these)
export const INSTRUMENTS = ALL_ASSETS;

// ---------- Analysis durations -----------------------------------------------
export const ANALYSIS_DURATIONS = [
  { key:"15m", label:"15 MIN",  sublabel:"Fast market analysis",    secs:15*60 },
  { key:"30m", label:"30 MIN",  sublabel:"Short-term setup",        secs:30*60 },
  { key:"1h",  label:"1 HOUR",  sublabel:"Intraday analysis",       secs:60*60 },
  { key:"2h",  label:"2 HOURS", sublabel:"Extended intraday",       secs:2*60*60 },
  { key:"4h",  label:"4 HOURS", sublabel:"Session analysis",        secs:4*60*60 },
  { key:"1d",  label:"1 DAY",   sublabel:"Daily market analysis",   secs:24*60*60 },
];

export const STEP_DEFS = [
  { id:"structure", label:"Market Structure", done:"Identified" },
  { id:"sr",        label:"Support & Resistance", done:"Mapped" },
  { id:"trend",     label:"Trend Direction", done:"Bullish" },
  { id:"entry",     label:"Entry Zone", done:"Watching" },
  { id:"confirm",   label:"Confirmation", done:"Pending" },
];

export function isMarketOpen(cls) {
  if (cls === "crypto") return true;
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day === 6) return false;
  if (day === 0 && hour < 21) return false;
  if (day === 5 && hour >= 21) return false;
  return true;
}
export function nextOpenLabel(cls) {
  if (cls === "crypto") return null;
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 6 || (day === 0 && now.getUTCHours() < 21)) return "Opens Sunday 21:00 UTC";
  if (day === 5 && now.getUTCHours() >= 21) return "Opens Sunday 21:00 UTC";
  return null;
}

// ---------- Price engine ----------
export function seedSeries(inst) {
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

export function ticksToCandles(ticks, count = 70) {
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
      high: rawHi + spread * (0.1 + Math.random() * 0.15),
      low:  rawLo - spread * (0.1 + Math.random() * 0.15),
    });
  }
  return out.slice(-count);
}

export function seedSeriesFromPrice(inst, price) {
  const base = seedSeries(inst);
  const shift = price - base[base.length - 1].price;
  return base.map((p) => ({ t: p.t, price: Number((p.price + shift).toFixed(inst.digits)) }));
}

// Module-level ref so the price hook can read the active symbol
// without needing it as a prop (avoids hook-ordering issues).
export const _activeSymbolRef = { current: "XAUUSD" };

export async function fetchLivePrice(symbol) {
  try {
    const res = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.price ? Number(data.price) : null;
  } catch { return null; }
}

export function useMultiPriceSeries() {
  const [seriesMap, setSeriesMap] = useState(() => {
    const m = {};
    INSTRUMENTS.forEach((inst) => (m[inst.symbol] = seedSeries(inst)));
    return m;
  });

  // ── Seed all instruments once on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all(INSTRUMENTS.map(async (inst) => {
        if (cancelled || !isMarketOpen(inst.cls)) return;
        const price = await fetchLivePrice(inst.symbol);
        if (price && !cancelled) {
          setSeriesMap(prev => ({ ...prev, [inst.symbol]: seedSeriesFromPrice(inst, price) }));
        }
      }));
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Background slow rotation for non-active instruments (30 s) ─────────
  useEffect(() => {
    let cancelled = false;
    let i = 0;
    const id = setInterval(async () => {
      // Skip the active symbol — it has its own fast poller
      const sym = INSTRUMENTS[i % INSTRUMENTS.length].symbol;
      i++;
      if (sym === _activeSymbolRef.current) return;
      const inst = INSTRUMENTS.find(x => x.symbol === sym);
      if (!inst || !isMarketOpen(inst.cls)) return;
      const price = await fetchLivePrice(sym);
      if (price && !cancelled) {
        setSeriesMap(prev => {
          const arr = prev[sym] || [];
          const newTick = { t: Date.now(), price: Number(price.toFixed(inst.digits)) };
          return { ...prev, [sym]: [...arr.slice(-200), newTick] };
        });
      }
    }, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ── Fast poller: real price every 2 s for the active symbol ────────────
  useEffect(() => {
    let cancelled = false;
    let lastRealPrice = null;

    const poll = async () => {
      const sym = _activeSymbolRef.current;
      const inst = ALL_ASSETS.find(a => a.symbol === sym);
      if (!inst || !isMarketOpen(inst.cls)) return;
      const price = await fetchLivePrice(sym);
      if (price && !cancelled) {
        lastRealPrice = price;
        setSeriesMap(prev => {
          const arr = prev[sym] || [];
          const newTick = { t: Date.now(), price: Number(price.toFixed(inst.digits)) };
          return { ...prev, [sym]: [...arr.slice(-200), newTick] };
        });
      }
    };

    poll();
    const fastId = setInterval(poll, 2000);

    // ── Micro-tick: smooth 500 ms jitter between real API calls ──────────
    const microId = setInterval(() => {
      const sym = _activeSymbolRef.current;
      const inst = ALL_ASSETS.find(a => a.symbol === sym);
      if (!inst || !isMarketOpen(inst.cls)) return;
      setSeriesMap(prev => {
        const arr = prev[sym];
        if (!arr || arr.length < 2) return prev;
        const last = arr[arr.length - 1].price;
        // Tiny random walk: ±4 % of the instrument's per-minute volatility
        const jitter = (Math.random() - 0.5) * inst.vol * 0.04;
        const newPrice = Number(Math.max(inst.base * 0.5, last + jitter).toFixed(inst.digits));
        const newTick  = { t: Date.now(), price: newPrice };
        return { ...prev, [sym]: [...arr.slice(-200), newTick] };
      });
    }, 500);

    return () => { cancelled = true; clearInterval(fastId); clearInterval(microId); };
  }, []); // runs once; reads _activeSymbolRef.current dynamically

  return seriesMap;
}
export function sma(values, period) {
  if (values.length < period) return null;
  return values.slice(-period).reduce((a, b) => a + b, 0) / period;
}
export function rsi(values, period = 14) {
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
export async function askRaina(history, context) {
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
export function BiasChip({ bias }) {
  const map = {
    buy: { color: T.sage, label: "BUY", dot: "🟢" },
    sell: { color: T.rust, label: "SELL", dot: "🔴" },
    hold: { color: T.muted, label: "HOLD", dot: "⚪" },
  };
  const m = map[bias] || map.hold;
  return <div style={{ display: "flex", alignItems: "center", gap: 6, color: m.color, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15 }}><span>{m.dot}</span> {m.label}</div>;
}
export function playNotifSound() {
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
export function Toast({ toast, onDone }) {
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
export const getInputStyle = () => ({ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.paper, padding: 10, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500 });

// ---------- Auth (real Supabase accounts) ----------
export async function recordActivity(userId, action, meta) {
  try { await supabase.from("activity_logs").insert({ user_id: userId, action, meta: meta || null }); } catch {}
}

// ---------- Candle-based signal engine ----------
export const TIMEFRAMES = [
  { key: "15m", td: "15min", label: "15 Minute" },
  { key: "1h", td: "1h", label: "1 Hour" },
  { key: "4h", td: "4h", label: "4 Hour" },
];

export async function saveTradeHistory(account, inst, tf, sig, result, points) {
  if (!account?.id) return;
  try {
    await supabase.from("trade_history").insert({
      user_id: account.id, symbol: inst.symbol, timeframe: tf.label, direction: sig.bias,
      entry: sig.entry, stop_loss: sig.stop_loss, take_profit: sig.take_profit_1,
      result, points, reason: sig.reason,
    });
  } catch { /* history save failing shouldn't block the live trade update */ }
}

