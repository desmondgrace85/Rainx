import React, { useState, useEffect, useRef, useCallback } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Area, ComposedChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  Bell, Home, Briefcase, MessageCircle, MoreHorizontal, Settings, X, Repeat2,
  TrendingUp, TrendingDown, Minus, Activity, Send, Calendar as CalendarIcon,
  Calculator, Mail, ShieldCheck, LogOut, Mic, Square, FileText, ScrollText, Users2,
  CreditCard as CreditCardIcon, Zap, ArrowRight, ChevronRight, ChevronLeft, Wallet, Landmark, Gift, Trophy,
  Maximize2, User, Lock, Smartphone, Eye, EyeOff, Key, ArrowUpCircle, ArrowDownCircle, Plus, ChevronDown,
  BrainCircuit, Cpu, Palette, Globe, Trash2, UserX, Download, FileCheck, Cookie, Database,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import CommunityTab, { ProfileFeed as CommunityProfileFeed, Composer as CommunityComposer, FollowListModal, Badge as CommunityBadge, formatCount } from "./CommunityTab";
import FullChartView from "./FullChartView";
import LightweightChart from "./LightweightChart";
import SpaceCoinsIntro from "./SpaceCoinsIntro";
import SpaceCoinsDashboard from "./SpaceCoinsDashboard";
import HomeTab from "./HomeTab";

import rainxLogoTransparent from "./assets/rainx-logo-transparent.png";
import { resolveMarketLogo, resolveMarketDirection, isMarketNotification, FALLBACK_NEWS_LOGO, FALLBACK_RAINX_LOGO, MARKET_NAMES } from "./MarketLogos";

// ---------- Design tokens ----------
const T = {
  ink: "#0F0E0B",
  card: "#1C1913",
  cardBorder: "#332C1F",
  gold: "#F4D35E",
  goldBright: "#F4D35E",
  goldGradient: "linear-gradient(135deg, #F4D35E 0%, #F4D35E 50%, #F4D35E 100%)",
  goldShine: "linear-gradient(180deg, #F4D35E 0%, #F4D35E 48%, #F4D35E 100%)",
  sage: "#7A9E86",
  rust: "#B0604A",
  paper: "#F2EDE0",
  muted: "#9C947F",
};
// Light and dark token palettes – applied by mutating T in-place inside MainAppContent
// Module-level signal for triggering HeaderAvatar refresh after upload/save
let _avatarRefreshTick = 0;
const _avatarRefreshListeners = new Set();
function notifyAvatarRefresh() { _avatarRefreshTick++; _avatarRefreshListeners.forEach(fn => fn(_avatarRefreshTick)); }

const DARK_TOKENS  = { ink:"#0F0E0B", card:"#1C1913", cardBorder:"#332C1F", gold:"#F4D35E", goldBright:"#F4D35E", goldGradient:"linear-gradient(135deg, #F4D35E 0%, #F4D35E 50%, #F4D35E 100%)", goldShine:"linear-gradient(180deg, #F4D35E 0%, #F4D35E 48%, #F4D35E 100%)", sage:"#7A9E86",  rust:"#B0604A", paper:"#F2EDE0", muted:"#9C947F" };
const LIGHT_TOKENS = { ink:"#FFFFFF",  card:"#F7F9F9", cardBorder:"#EFF3F4", gold:"#F4D35E", goldBright:"#F4D35E", goldGradient:"linear-gradient(135deg, #F4D35E 0%, #F4D35E 50%, #F4D35E 100%)", goldShine:"linear-gradient(180deg, #F4D35E 0%, #F4D35E 48%, #F4D35E 100%)", sage:"#1A7A50",  rust:"#C0392B", paper:"#0F1419", muted:"#536471" };
const FONT_HEAD = "'Montserrat', sans-serif";
const FONT_BODY = "'Montserrat', sans-serif";

// Format a notification timestamp as "DD/MM/YYYY, HH:MM" (date + time).
// Falls back to n.time (time-only) or n.created_at when available.
function notifDateTime(n) {
  const raw = n.created_at;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d)) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`;
    }
  }
  return n.time || "";
}

/**
 * Relative time for notification lists:
 *   - Same calendar day → show the clock time only (e.g. "11:31")
 *   - 1+ days but < 1 year → "1 day ago", "2 days ago", … "300 days ago"
 *   - 1 year+ → "1 year ago", "2 years ago"
 */
function notifTimeAgo(n) {
  const raw = n.created_at;
  if (!raw) return n.time || "";
  const d = new Date(raw);
  if (isNaN(d)) return n.time || "";
  const now = new Date();
  // Same calendar day → time only.
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}`;
  }
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  const years = Math.floor(days / 365);
  if (years >= 1) {
    return years === 1 ? "1 year ago" : `${years} years ago`;
  }
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

// ---------- Market notification avatar (logo + BUY/SELL badge) ----------
// Renders a market logo as the "profile image" for signal / trade / news
// notifications, with a small BUY (sage, up-arrow) or SELL (rust, down-arrow)
// badge at the bottom-right corner — mirroring the community notification style.
function MarketNotifAvatar({ n, size = 44 }) {
  const logo = resolveMarketLogo(n);
  const dir = resolveMarketDirection(n);
  // Pick the fallback: a news icon for news-type, RainX mark otherwise.
  const fallback = (n?.type === "news" || /news|cpi|nfp|fomc|economic/i.test(`${n?.title || ""} ${n?.body || ""}`))
    ? FALLBACK_NEWS_LOGO
    : FALLBACK_RAINX_LOGO;
  const src = logo?.src || fallback;
  const alt = logo ? (MARKET_NAMES[logo.symbol] || logo.symbol) : "RainX";
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <img src={src} alt={alt} width={size} height={size} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      {dir && (
        <span style={{
          position: "absolute", right: -3, bottom: -3, width: 20, height: 20, borderRadius: "50%",
          background: dir === "buy" ? T.sage : T.rust, border: `2px solid ${T.ink}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {dir === "buy"
            ? <TrendingUp size={12} strokeWidth={3} color="#fff" />
            : <TrendingDown size={12} strokeWidth={3} color="#fff" />}
        </span>
      )}
    </div>
  );
}
const PUSH_STATE_DB_NAME = "rainx-notification-state";
const PUSH_STATE_STORE_NAME = "delivered-pushes";

function readDeliveredPushIds() {
  return new Promise((resolve) => {
    if (!("indexedDB" in window)) {
      resolve([]);
      return;
    }
    const request = indexedDB.open(PUSH_STATE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(PUSH_STATE_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      const getAllRequest = db.transaction(PUSH_STATE_STORE_NAME, "readonly")
        .objectStore(PUSH_STATE_STORE_NAME)
        .getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result.map((item) => String(item.id)));
      getAllRequest.onerror = () => resolve([]);
    };
    request.onerror = () => resolve([]);
  });
}
const COUNTRIES = ["Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Bulgaria","Cameroon","Canada","Chile","China","Colombia","Costa Rica","Croatia","Cuba","Czech Republic","Denmark","Ecuador","Egypt","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Lebanon","Libya","Malaysia","Mexico","Morocco","Mozambique","Myanmar","Nepal","Netherlands","New Zealand","Nicaragua","Nigeria","Norway","Oman","Pakistan","Panama","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Singapore","Somalia","South Africa","South Korea","Spain","Sudan","Sweden","Switzerland","Taiwan","Tanzania","Thailand","Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];


const LOCATION_SUGGESTIONS = [
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

function CoverCropModal({ file, onConfirm, onCancel, T, FONT_HEAD }) {
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
      <div style={{ width:DISPLAY_W, height:DISPLAY_H, overflow:'hidden', borderRadius:8, border:'2px solid #F4D35E', cursor:dragging?'grabbing':'grab', position:'relative', userSelect:'none', touchAction:'none' }}
        onPointerDown={onPD}>
        {imgSrc && <img src={imgSrc} style={{ width:DISPLAY_W, height:'auto', position:'absolute', top:offsetY, left:0, pointerEvents:'none', userSelect:'none', draggable:false }} alt='' />}
      </div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:10, marginBottom:20 }}>Cover photo · 4:1</div>
      <div style={{ display:'flex', gap:12 }}>
        <button onClick={onCancel} style={{ background:'none', border:'1px solid rgba(255,255,255,0.25)', borderRadius:10, padding:'10px 24px', color:'#fff', fontFamily:FONT_HEAD, fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancel</button>
        <button onClick={confirm} style={{ background:'#F4D35E', border:'none', borderRadius:10, padding:'10px 24px', color:'#0F0E0B', fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, cursor:'pointer' }}>Use photo</button>
      </div>
      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  );
}

function ProfileLocationInput({ value, onChange, T, FONT_HEAD }) {
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
function lsGet(key) {
  try { const v = localStorage.getItem(key); return v !== null ? v : undefined; } catch { return memoryStore[key]; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { memoryStore[key] = value; }
}
function lsDelete(key) {
  try { localStorage.removeItem(key); } catch { delete memoryStore[key]; }
}
function getStoredRainxSetting(key, fallback) {
  try { const prefs = JSON.parse(lsGet("rainx-settings-prefs") || "{}"); return prefs[key] ?? fallback; } catch { return fallback; }
}
function getStoredRainxSecuritySetting(key, fallback) {
  try { const prefs = JSON.parse(lsGet("rainx-security-prefs") || "{}"); return prefs[key] ?? fallback; } catch { return fallback; }
}

// ── URL-hash routing helpers — keeps current page alive across refresh ────────
const _ROUTE_TABS = ["home","markets","community","more","history","scalping","subscribe","space-coins"];
function routeRead() {
  try {
    const h = window.location.hash.slice(1);
    if (!h) return { tab: null, sub: null, flag: null };
    const [a, b, c] = h.split("/");
    return { tab: _ROUTE_TABS.includes(a) ? a : null, sub: b || null, flag: c || null };
  } catch { return { tab: null, sub: null, flag: null }; }
}
function routeWrite(tab, sub, flag) {
  try {
    let h = tab || "home";
    if (sub)  h += "/" + encodeURIComponent(sub);
    if (flag) h += "/" + flag;
    const next = "#" + h;
    if (window.location.hash !== next) history.pushState(null, "", next);
  } catch {}
}
function routeReplace(tab, sub, flag) {
  try {
    let h = tab || "home";
    if (sub)  h += "/" + encodeURIComponent(sub);
    if (flag) h += "/" + flag;
    const next = "#" + h;
    if (window.location.hash !== next) history.replaceState(null, "", next);
  } catch {}
}
function buildRainxNotificationUrl(target = {}) {
  const params = new URLSearchParams();
  if (target.kind) params.set("rainxTarget", target.kind);
  Object.entries(target).forEach(([key, value]) => {
    if (key !== "kind" && value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  return `/?${params.toString()}`;
}
function readRainxNotificationTarget() {
  try {
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("rainxTarget");
    if (!kind) return null;
    const target = { kind };
    params.forEach((value, key) => { if (key !== "rainxTarget") target[key] = value; });
    return target;
  } catch {
    return null;
  }
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
// Trading unit label for an instrument — "pips" for forex/metals, "points" for crypto/indices/energy.
// (inst.unit was never defined, which caused "undefined" in profit notifications.)
const unitFor = (inst) => (inst && (inst.cls === "forex" || inst.cls === "metal")) ? "pips" : "points";

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

// ---------- Price engine ----------
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
      high: rawHi + spread * (0.1 + Math.random() * 0.15),
      low:  rawLo - spread * (0.1 + Math.random() * 0.15),
    });
  }
  return out.slice(-count);
}

function seedSeriesFromPrice(inst, price) {
  const base = seedSeries(inst);
  const shift = price - base[base.length - 1].price;
  return base.map((p) => ({ t: p.t, price: Number((p.price + shift).toFixed(inst.digits)) }));
}

// Module-level ref so the price hook can read the active symbol
// without needing it as a prop (avoids hook-ordering issues).
const _activeSymbolRef = { current: "XAUUSD" };

async function fetchLivePrice(symbol) {
  try {
    const res = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.price ? Number(data.price) : null;
  } catch { return null; }
}

function useMultiPriceSeries() {
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
    const prefs = JSON.parse(localStorage.getItem("rainx-settings-prefs") || "{}");
    if (prefs.signalSounds === false) return;
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
function Toast({ toast, items = [], onDone, onDismissOne, onOpen }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [dragX, setDragX] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    if (!toast) return;
    setDragX(0);
    setExpanded(false);
    playNotifSound();
    if (expanded) return; // don't auto-hide while the user is looking at the expanded list
    const id = setTimeout(() => onDoneRef.current(), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  const colorMap = { signal: T.gold, update: T.sage, warning: T.rust, news: T.gold, community: T.gold };
  const count = items.length > 1 ? items.length : (toast.count || 1);

  const onTouchStart = (e) => { if (expanded) return; dragging.current = true; startX.current = e.touches[0].clientX; };
  const onTouchMove = (e) => { if (dragging.current) setDragX(e.touches[0].clientX - startX.current); };
  const onTouchEnd = () => {
    dragging.current = false;
    if (Math.abs(dragX) > 80) onDoneRef.current(); else setDragX(0);
  };

  return (
      <div
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onClick={() => { if (!expanded) { onOpen?.(toast); onDoneRef.current(); } }}
      role="status"
      aria-live="polite"
      style={{
        position: "fixed", top: 10, left: 10, right: 10, maxWidth: 460, margin: "0 auto", zIndex: 1000,
        background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 16,
        padding: "12px 14px", boxShadow: "0 10px 32px rgba(0,0,0,0.28)", cursor: expanded ? "default" : "pointer",
        transform: `translateX(${dragX}px)`, opacity: Math.max(0, 1 - Math.abs(dragX) / 200),
        transition: dragging.current ? "none" : "transform 0.2s, opacity 0.2s",
        animation: dragX === 0 ? "slideDown 0.25s ease-out" : "none",
        maxHeight: expanded ? "70vh" : "none", overflowY: expanded ? "auto" : "visible",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {(() => {
          const logo = resolveMarketLogo(toast);
          const dir = resolveMarketDirection(toast);
          if (logo || isMarketNotification(toast)) {
            const src = logo?.src || ((toast?.type === "news" || /news|cpi|nfp|fomc|economic/i.test(`${toast?.title || ""} ${toast?.body || ""}`)) ? FALLBACK_NEWS_LOGO : FALLBACK_RAINX_LOGO);
            return (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={src} alt="" style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0 }} />
                {dir && (
                  <span style={{ position: "absolute", right: -2, bottom: -2, width: 14, height: 14, borderRadius: "50%", background: dir === "buy" ? T.sage : T.rust, border: `1.5px solid ${T.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {dir === "buy" ? <TrendingUp size={8} strokeWidth={3} color="#fff" /> : <TrendingDown size={8} strokeWidth={3} color="#fff" />}
                  </span>
                )}
              </div>
            );
          }
          return (
            <img
              src={`${(import.meta.env.BASE_URL || "/").replace(/\/?$/, "/")}icons/icon-192.png`}
              alt=""
              style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0 }}
            />
          );
        })()}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 12.5, fontWeight: 800, color: T.paper, flexShrink: 0 }}>RainX</div>
              <div style={{ fontSize: 10.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {count > 1 ? `${count} messages` : "Just now"}
              </div>
            </div>
            {count > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                style={{ background: T.card, border: `1px solid ${T.cardBorder}`, color: T.paper, fontSize: 11, fontWeight: 700, borderRadius: 999, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 7px", flexShrink: 0, cursor: "pointer", gap: 3 }}
              >
                {count}
                <ChevronDown size={11} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </button>
            )}
          </div>

          {!expanded && (
            <>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13.5, fontWeight: 800, color: T.paper, marginTop: 3 }}>{toast.title}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.paper, marginTop: 3, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast.body}</div>
            </>
          )}
        </div>
        {!expanded && (
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={(event) => { event.stopPropagation(); onDoneRef.current(); }}
            style={{ background: "none", border: "none", color: T.muted, padding: 2, display: "flex", flexShrink: 0, cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Expanded list — each queued item shown individually, WhatsApp-style */}
      {expanded && (
        <div style={{ marginTop: 8 }}>
          {items.map((item, i) => (
            <div
              key={item.id ?? i}
              onClick={(e) => { e.stopPropagation(); onOpen?.(item); onDismissOne?.(item); }}
              style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "8px 0", borderTop: i > 0 ? `1px solid ${T.cardBorder}` : "none", cursor: "pointer" }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 12.5, fontWeight: 700, color: colorMap[item.type] || T.paper }}>{item.title}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.paper, marginTop: 2 }}>{item.body}</div>
              </div>
              <button
                aria-label="Dismiss"
                onClick={(e) => { e.stopPropagation(); onDismissOne?.(item); }}
                style={{ background: "none", border: "none", color: T.muted, padding: 2, flexShrink: 0, cursor: "pointer" }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); onDoneRef.current(); }}
            style={{ width: "100%", marginTop: 6, background: "none", border: "none", color: T.gold, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, padding: "8px 0", cursor: "pointer" }}
          >
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
const getInputStyle = () => ({ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.paper, padding: 10, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500 });

// ---------- Auth + security helpers ----------
const AUTH_EVENT_FUNCTION_URL = "https://fsndqkacfizulovhfldz.supabase.co/functions/v1/record-auth-event";

function describeRainxUserAgent(userAgent = "") {
  const ua = String(userAgent || "");
  let os = "Unknown OS";
  if (/Android/i.test(ua)) os = `Android ${ua.match(/Android\s+([0-9.]+)/i)?.[1] || ""}`.trim();
  else if (/iPhone|iPad|iPod/i.test(ua)) os = `iOS ${(ua.match(/OS\s([0-9_]+)/i)?.[1] || "").replaceAll("_", ".")}`.trim();
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let model = "";
  if (/Android/i.test(ua)) {
    const m = ua.match(/Android[^;)]*;\s*(?:[a-z]{2}(?:-[A-Z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i);
    if (m?.[1] && !/wv|mobile|build/i.test(m[1])) model = m[1].trim();
  } else if (/iPhone/i.test(ua)) model = "iPhone";
  else if (/iPad/i.test(ua)) model = "iPad";
  let browser = "RainX";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/wv\)/i.test(ua)) browser = "Android WebView";
  return { label: [model, os].filter(Boolean).join(" · ") || browser, model: model || null, os, browser };
}

async function hashRainxPin(pin) {
  const bytes = new TextEncoder().encode(String(pin));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function recordActivity(userId, action, meta) {
  try { await supabase.from("activity_logs").insert({ user_id: userId, action, meta: meta || null }); } catch {}
}

async function recordAuthEvent(action, session) {
  if (!session?.access_token) return false;
  try {
    const response = await fetch(AUTH_EVENT_FUNCTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language }),
    });
    if (response.ok) return true;
  } catch {}
  try {
    await supabase.from("activity_logs").insert({
      user_id: session.user.id, action,
      meta: { userAgent:navigator.userAgent, language:navigator.language, timezone:Intl.DateTimeFormat().resolvedOptions().timeZone, platform:navigator.platform, device:describeRainxUserAgent(navigator.userAgent).label, source:"client-fallback" }
    });
    return true;
  } catch { return false; }
}

// ---------- Candle-based signal engine ----------
const TIMEFRAMES = [
  { key: "15m", td: "15min", label: "15 Minute" },
  { key: "1h", td: "1h", label: "1 Hour" },
  { key: "4h", td: "4h", label: "4 Hour" },
];

// How long a signal for each timeframe should stay put before we let the
// bot recompute it. This used to be a flat 4 minutes for every timeframe,
// which meant a "1 Hour" signal could get silently replaced after only a
// few minutes. Now each timeframe holds for (roughly) its own candle length.
const TF_STABILITY_MS = {
  "15m": 15 * 60 * 1000,
  "1h":  60 * 60 * 1000,
  "4h":  4 * 60 * 60 * 1000,
  "1d":  24 * 60 * 60 * 1000,
};
const stabilityWindowFor = (tfKey) => TF_STABILITY_MS[tfKey] || 60 * 60 * 1000;

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username2, setUsername2] = useState(""); // signup username (separate from profile username)
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mfaLogin, setMfaLogin] = useState(null);
  const [mfaLoginCode, setMfaLoginCode] = useState("");
  const [mfaLoginBusy, setMfaLoginBusy] = useState(false);
  const [mfaLoginError, setMfaLoginError] = useState("");
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

  const verifyMfaLogin = async () => {
    if (!mfaLogin?.factorId || !/^\d{6}$/.test(mfaLoginCode)) { setMfaLoginError("Enter the 6-digit verification code."); return; }
    setMfaLoginBusy(true); setMfaLoginError("");
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId:mfaLogin.factorId, ...(mfaLogin.factorType === "phone" ? { channel:"sms" } : {}) });
      if (challengeError) throw challengeError;
      const { error } = await supabase.auth.mfa.verify({ factorId:mfaLogin.factorId, challengeId:challenge.id, code:mfaLoginCode });
      if (error) throw error;
      const { data: sessionData } = await supabase.auth.getSession();
      await recordAuthEvent("login", sessionData.session);
      setMfaLogin(null); setMfaLoginCode(""); onAuthed(sessionData.session);
    } catch (e) { setMfaLoginError(e?.message || "The verification code is incorrect or expired."); }
    finally { setMfaLoginBusy(false); }
  };

  const submit = async () => {
    setError(""); setNotice("");
    if (!email.trim() || !password) { setError("Enter your email (or username) and password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (mode === "signup" && !agree) { setError("Please accept the risk disclosure to continue."); return; }
    setBusy(true);

    if (mode === "signup") {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.includes("@")) { setError("Please enter a valid email address for signup."); setBusy(false); return; }
      if (!firstName.trim() || !lastName.trim()) { setError("Please enter your first and last name."); setBusy(false); return; }
      const { data, error: signErr } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (signErr) {
        const msg = signErr.message || "";
        setError(
          msg.toLowerCase().includes("rate limit")
            ? "Too many signup attempts. Please try again in a few minutes."
            : msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")
            ? "An account with this email already exists. Try signing in instead."
            : msg || "Signup failed. Please try again."
        );
        setBusy(false); return;
      }
      if (data.user) {
        const displayName = username2.trim() || `${firstName.trim()} ${lastName.trim()}`;
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          username: username2.trim() || null,
          display_name: displayName,
          phone: phone.trim() || null,
          country: country.trim() || null,
        }).catch(() => {});
        await recordAuthEvent("signup", data.session);
        // Referral attribution — ?ref=CODE in the URL
        try {
          const refCode = new URLSearchParams(window.location.search).get("ref");
          if (refCode) {
            const { data: referrer } = await supabase.from("profiles").select("id").eq("referral_code", refCode).maybeSingle();
            if (referrer?.id) {
              await supabase.from("profiles").update({ referred_by: referrer.id }).eq("id", data.user.id).catch(() => {});
            }
          }
        } catch {}
      }
      if (data.user && !data.session) {
        setNotice("Account created! Check your email to confirm, then sign in.");
        setMode("signin");
        setBusy(false);
        return;
      }
      onAuthed(data.session);
    } else {
      // Allow login with username OR email
      let loginEmail = email.trim().toLowerCase();
      if (!loginEmail.includes("@")) {
        // Treat as username — look up associated email via profiles
        const { data: profRow } = await supabase.from("profiles").select("email").ilike("username", loginEmail).maybeSingle();
        if (profRow?.email) {
          loginEmail = profRow.email;
        } else {
          // Try display_name as fallback
          const { data: profRow2 } = await supabase.from("profiles").select("email").ilike("username", loginEmail).maybeSingle();
          if (profRow2?.email) { loginEmail = profRow2.email; }
          else { setError("No account found with that username. Try your email address."); setBusy(false); return; }
        }
      }
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (signErr) { setError(signErr.message); setBusy(false); return; }
      const { data: profile } = await supabase.from("profiles").select("is_banned, is_suspended").eq("id", data.user.id).single();
      if (profile && (profile.is_banned || profile.is_suspended)) {
        await supabase.auth.signOut();
        setError(profile.is_banned ? "This account has been banned." : "This account is suspended. Contact support.");
        setBusy(false);
        return;
      }
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;
      if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const verified = [...(factors?.totp || []), ...(factors?.phone || [])].filter(f => f.status === "verified");
        if (!verified.length) throw new Error("Your account has MFA enabled but no verified factor is available. Contact support.");
        const factor = verified.find(f=>f.factor_type === "totp") || verified[0];
        setMfaLogin({ factorId:factor.id, factorType:factor.factor_type });
        setMfaLoginCode(""); setMfaLoginError(""); setBusy(false); return;
      }
      await recordAuthEvent("login", data.session);
      onAuthed(data.session);
    }
    setBusy(false);
  };

  // Local premium palette - scoped to this screen only, doesn't touch the
  // shared T tokens used everywhere else in the app.
  const A = {
    bg: "#0B0B0B", card: "#171513", gold: "#F4D35E",
    goldGrad: "linear-gradient(135deg, #F4D35E 0%, #F4D35E 50%, #F4D35E 100%)",
    border: "rgba(255,255,255,0.08)", gray: "#B4B4B4",
  };
  const [oauthNotice, setOauthNotice] = useState("");

  if (mfaLogin) return (
    <div style={{ minHeight:"100dvh", background:A.bg, color:"#fff", fontFamily:FONT_BODY, display:"flex", flexDirection:"column", justifyContent:"center", padding:"28px 22px", maxWidth:480, margin:"0 auto" }}>
      <div style={{background:A.card,border:`1px solid ${A.border}`,borderRadius:20,padding:22}}>
        <div style={{fontFamily:FONT_HEAD,fontWeight:900,fontSize:20,marginBottom:6}}>Verify your sign-in</div>
        <div style={{fontSize:12,color:A.gray,lineHeight:1.55,marginBottom:16}}>Your account has two-step authentication enabled. Enter the code from your {mfaLogin.factorType === "phone" ? "phone" : "authenticator app"} to continue.</div>
        {mfaLoginError&&<div style={{fontSize:11,color:"#F3A49A",marginBottom:10}}>{mfaLoginError}</div>}
        <input autoFocus value={mfaLoginCode} onChange={e=>setMfaLoginCode(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={e=>{if(e.key==="Enter")verifyMfaLogin();}} inputMode="numeric" type="text" placeholder="6-digit code" style={{width:"100%",boxSizing:"border-box",background:"#111",border:`1px solid ${A.border}`,borderRadius:12,padding:"13px",color:"#fff",fontFamily:FONT_HEAD,fontSize:16,textAlign:"center",letterSpacing:4}} />
        <button onClick={verifyMfaLogin} disabled={mfaLoginBusy} style={{width:"100%",marginTop:12,border:0,borderRadius:12,padding:"13px 0",background:A.gold,color:"#111",fontFamily:FONT_HEAD,fontWeight:900}}>{mfaLoginBusy?"Verifying…":"Verify & continue"}</button>
        <button onClick={async()=>{setMfaLogin(null);setMfaLoginCode("");setMfaLoginError("");await supabase.auth.signOut();}} style={{width:"100%",marginTop:8,border:`1px solid ${A.border}`,borderRadius:12,padding:"11px 0",background:"transparent",color:A.gray,fontFamily:FONT_HEAD,fontWeight:700}}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: A.bg, color: "#fff", fontFamily: FONT_BODY, display: "flex", flexDirection: "column", padding: "28px 22px", maxWidth: 480, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; } body { margin:0; }`}</style>

      <svg width="100%" height="92" viewBox="0 0 320 92" style={{ display: "block", marginBottom: 4 }}>
        <defs>
          <linearGradient id="authRibbon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F4D35E" />
            <stop offset="50%" stopColor="#F4D35E" />
            <stop offset="100%" stopColor="#F4D35E" />
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

        {mode === "signup" && (<>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, color:A.gray, fontWeight:600, letterSpacing:0.3 }}>First Name</label>
              <div style={{ display:"flex", alignItems:"center", marginTop:6, background:A.bg, border:`1px solid ${A.border}`, borderRadius:14, padding:"12px 14px" }}>
                <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First name" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#fff", fontFamily:FONT_BODY, fontSize:13 }} />
              </div>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, color:A.gray, fontWeight:600, letterSpacing:0.3 }}>Last Name</label>
              <div style={{ display:"flex", alignItems:"center", marginTop:6, background:A.bg, border:`1px solid ${A.border}`, borderRadius:14, padding:"12px 14px" }}>
                <input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last name" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#fff", fontFamily:FONT_BODY, fontSize:13 }} />
              </div>
            </div>
          </div>
          <label style={{ fontSize:11, color:A.gray, fontWeight:600, letterSpacing:0.3 }}>Username</label>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, marginBottom:14, background:A.bg, border:`1px solid ${A.border}`, borderRadius:14, padding:"12px 14px" }}>
            <span style={{ color:A.gray, fontSize:14 }}>@</span>
            <input value={username2} onChange={e=>setUsername2(e.target.value)} placeholder="yourhandle" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#fff", fontFamily:FONT_BODY, fontSize:13.5 }} />
          </div>
        </>)}

        <label style={{ fontSize: 11, color: A.gray, fontWeight: 600, letterSpacing: 0.3 }}>{mode === "signin" ? "Email or Username" : "Email"}</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 16, background: A.bg, border: `1px solid ${A.border}`, borderRadius: 14, padding: "12px 14px" }}>
          <Mail size={16} color={A.gray} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={mode === "signin" ? "Email or @username" : "you@email.com"} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: FONT_BODY, fontSize: 13.5 }} />
        </div>

        {mode === "signup" && (<>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, color:A.gray, fontWeight:600, letterSpacing:0.3 }}>Phone</label>
              <div style={{ display:"flex", alignItems:"center", marginTop:6, background:A.bg, border:`1px solid ${A.border}`, borderRadius:14, padding:"12px 14px" }}>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 000 0000" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#fff", fontFamily:FONT_BODY, fontSize:13 }} />
              </div>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, color:A.gray, fontWeight:600, letterSpacing:0.3 }}>Country</label>
              <div style={{ display:"flex", alignItems:"center", marginTop:6, background:A.bg, border:`1px solid ${A.border}`, borderRadius:14, padding:"12px 14px" }}>
                <input value={country} onChange={e=>setCountry(e.target.value)} placeholder="Country" style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#fff", fontFamily:FONT_BODY, fontSize:13 }} />
              </div>
            </div>
          </div>
        </>)}

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

        <button onClick={submit} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: A.goldGrad, color: "#0B0B0B", border: "none", borderRadius: 14, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1, boxShadow: "0 8px 20px rgba(244,211,94,0.25)" }}>
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
const PLAN_LABELS = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
const PLAN_TIER_RANK = { none: 0, weekly: 1, monthly: 2, yearly: 3 };
const PLAN_FEATURES = {
  weekly: { price: 150, blurb: "Long-term signals (15M/1H), Scalping, trade history, notifications, and Community all included.", scalping: true },
  monthly: { price: 500, blurb: "Everything in Weekly, with extended trade history and priority support.", scalping: true },
  yearly: { price: 6000, blurb: "Everything in Monthly, plus an automatic golden verified badge and priority 24/7 support.", scalping: true },
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
    price: "¢150.00",
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
    price: "¢500.00",
    period: "/ month",
    billing: "Billed every month",
    features: [
      { text: "Everything in Weekly" },
      { text: "Golden Verification Badge",       sub: "Exclusive premium tier recognition" },
      { text: "Scalping Setups",                 sub: "Advanced short-term trade setups" },
      { text: "Priority Signal Alerts",          sub: "In-app push notifications" },
      { text: "Exclusive Market Reports",        sub: "Weekly professional analysis reports" },
      { text: "Cancel Anytime",                  sub: "No long-term commitment. Cancel anytime." },
    ],
  },
  {
    key: "yearly",
    label: "Yearly",
    tag: "Best value",
    price: "¢6000.00",
    period: "/ year",
    billing: "Billed every year",
    features: [
      { text: "Everything in Monthly" },
      { text: "Yearly Premium Badge",            sub: "Highest verification tier on RainX" },
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
  const [planPrices, setPlanPrices] = useState({});

  useEffect(() => {
    supabase.from("payment_methods").select("*").eq("enabled", true).order("sort_order").then(({ data }) => setMethods(data || []));
    supabase.from("plan_prices").select("plan, price").then(({ data }) => {
      if (data) {
        const m = {};
        data.forEach((r) => { m[r.plan] = r.price; });
        setPlanPrices(m);
      }
    }).catch(() => {});
  }, []);

  // Merge static plan definitions with live prices from DB
  const plans = SUB_PLANS.map((p) => ({
    ...p,
    price: planPrices[p.key] != null ? `¢${Number(planPrices[p.key]).toFixed(2)}` : p.price,
  }));
  const plan = plans[activePlanIdx];

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
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `rgba(244,211,94,0.12)`, border: `2px solid ${T.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
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
        <button onClick={submitPayment} disabled={busy} style={{ width: "100%", background: T.goldGradient, color: T.ink, border: "none", borderRadius: 13, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
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
        {plans.map((p, i) => (
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
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: `rgba(244,211,94,0.15)`, border: `1px solid ${T.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
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
        <div style={{ margin: "0 16px 8px", background: T.goldGradient, borderRadius: 14, padding: "15px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          onClick={() => alert("No payment methods configured. Please contact support.")}>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15, color: T.ink }}>Subscribe Now</span>
          <span style={{ fontSize: 20, color: T.ink }}>→</span>
        </div>
      ) : methods.length === 1 ? (
        <button onClick={() => setSelectedMethod(methods[0])} style={{ margin: "0 16px 8px", width: "calc(100% - 32px)", background: T.goldGradient, color: T.ink, border: "none", borderRadius: 14, padding: "15px 20px", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Subscribe Now</span><span style={{ fontSize: 20 }}>→</span>
        </button>
      ) : (
        <div style={{ margin: "0 16px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {methods.map(m => (
            <button key={m.id} onClick={() => setSelectedMethod(m)} style={{ width: "100%", background: T.goldGradient, color: T.ink, border: "none", borderRadius: 14, padding: "13px 20px", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
  const readLockState = () => {
    try {
      const prefs = JSON.parse(localStorage.getItem("rainx-security-prefs") || "{}");
      return !!(prefs.appLock && prefs.pinEnabled && prefs.pinHash);
    } catch { return false; }
  };
  const [locked, setLocked] = useState(() => readLockState());
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const lockIfEnabled = () => { if (readLockState()) { setUnlockPin(""); setUnlockError(""); setLocked(true); } };
    const onVisibility = () => { if (document.visibilityState === "hidden") lockIfEnabled(); };
    document.addEventListener("visibilitychange", onVisibility);
    let appListener;
    CapacitorApp.addListener("appStateChange", ({ isActive }) => { if (!isActive) lockIfEnabled(); else if (readLockState()) setLocked(true); }).then(handle => { appListener = handle; }).catch(() => {});
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      appListener?.remove?.();
    };
  }, []);

  const unlock = async () => {
    setUnlockError("");
    if (!/^\d{4,6}$/.test(unlockPin)) { setUnlockError("Enter your 4–6 digit PIN."); return; }
    setUnlocking(true);
    try {
      const prefs = JSON.parse(localStorage.getItem("rainx-security-prefs") || "{}");
      const hash = await hashRainxPin(unlockPin);
      if (hash !== prefs.pinHash) { setUnlockError("Incorrect PIN."); setUnlockPin(""); return; }
      setLocked(false); setUnlockPin("");
    } catch { setUnlockError("Unable to unlock this device."); }
    finally { setUnlocking(false); }
  };

  return <>
    <MainAppContent account={account} onLogout={onLogout} />
    {locked && <div style={{position:"fixed",inset:0,zIndex:99999,background:"#F2F3F5",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:360,background:"#fff",border:"1px solid #E7E9EC",borderRadius:22,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.16)"}}>
        <div style={{width:56,height:56,borderRadius:18,background:"#F4D35E",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Lock size={26} color="#111418"/></div>
        <div style={{fontFamily:FONT_HEAD,fontWeight:900,fontSize:20,color:"#111418",textAlign:"center"}}>RainX is locked</div>
        <div style={{fontSize:12,color:"#737B85",textAlign:"center",marginTop:6,marginBottom:18}}>Enter your device PIN to continue.</div>
        <input autoFocus value={unlockPin} onChange={e=>setUnlockPin(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={e=>{if(e.key==="Enter")unlock();}} inputMode="numeric" type="password" placeholder="Enter PIN" style={{width:"100%",boxSizing:"border-box",border:"1px solid #D9DEE3",borderRadius:12,padding:"13px 14px",fontFamily:FONT_HEAD,fontSize:16,outline:"none",textAlign:"center",letterSpacing:4}} />
        {unlockError&&<div style={{fontSize:11,color:"#C0392B",textAlign:"center",marginTop:8}}>{unlockError}</div>}
        <button onClick={unlock} disabled={unlocking} style={{width:"100%",marginTop:12,border:0,borderRadius:12,padding:"13px 0",background:"#F4D35E",color:"#111418",fontFamily:FONT_HEAD,fontWeight:900,fontSize:13}}>{unlocking?"Checking…":"Unlock RainX"}</button>
      </div>
    </div>}
  </>;
}

class MoreTabErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: String(e) }; }
  componentDidCatch(e, info) { console.error("MoreTab crash:", e, info); }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 24, color: "#C0392B", background: "#fff8f8", fontSize: 13, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", border: "2px solid #C0392B", margin: 16, borderRadius: 8 }}>
        <strong>MoreTab crashed — screenshot this:</strong>{" "}{this.state.error}
      </div>
    );
    return this.props.children;
  }
}

class FullChartErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: String(e && e.message || e) }; }
  componentDidCatch(e, info) { console.error("FullChartView crash:", e, info); }
  render() {
    if (this.state.error) return (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff8f8", padding: 24 }}>
        <div style={{ color: "#C0392B", fontSize: 13, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", border: "2px solid #C0392B", padding: 16, borderRadius: 8, maxWidth: 320, textAlign: "center" }}>
          <strong>Full Chart crashed — screenshot this:</strong>{"\n"}{this.state.error}
        </div>
        <button onClick={this.props.onClose} style={{ marginTop: 16, background: "#C0392B", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>Close</button>
      </div>
    );
    return this.props.children;
  }
}

function CenterNavLogo({ active, onActivate }) {
  const [energized, setEnergized] = useState(false);
  const pulseTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
  }, []);

  const handleActivate = () => {
    setEnergized(true);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setEnergized(false), 920);
    onActivate();
  };

  return (
    <button
      type="button"
      aria-label="Open RainX centerpiece"
      onClick={handleActivate}
      className={`rx-center-nav-control${active ? " is-active" : ""}${energized ? " is-energized" : ""}`}
    >
      <span
        className="rx-center-nav-stage"
        aria-hidden="true"
        style={{ width: 84, height: 84, background: "transparent", transform: "translateY(5px)" }}
      >
        <span
          className="rx-center-nav-aura"
          style={{ opacity: 0.28, filter: "blur(9px)", boxShadow: "none" }}
        />
        <span
          className="rx-center-nav-core"
          style={{
            inset: 12,
            borderColor: "rgba(255,255,255,0.98)",
            boxShadow: "0 0 0 4px rgba(255,255,255,0.98), 0 0 12px 5px rgba(244,211,94,0.28), inset 0 1px 3px rgba(255,255,255,0.38), inset 0 0 10px rgba(180,130,30,0.12)",
          }}
        >
          <img src={rainxLogoTransparent} alt="" />
        </span>
        <span className="rx-center-nav-ripple rx-center-nav-ripple-one" />
        <span className="rx-center-nav-ripple rx-center-nav-ripple-two" />
      </span>
    </button>
  );
}

function formatNotificationCount(count) {
  if (!count) return null;
  return count > 99 ? "99+" : String(count);
}

function classifyNotification(notification) {
  const section = String(notification?.section || "").toLowerCase();
  const type = String(notification?.type || "").toLowerCase();
  const text = `${notification?.title || ""} ${notification?.body || ""}`.toLowerCase();
  const markets = ["signal", "market", "trade", "update", "warning", "news", "stop loss", "take profit", "entry", "cpi", "nfp", "fomc", "forex", "crypto", "gold", "trading alert"];
  const community = ["like", "likes", "comment", "comments", "reply", "replies", "mention", "mentions", "follow", "follows", "repost", "reposts", "community", "social"];
  const more = ["reward", "wallet", "monetiz", "subscription", "referral", "verif", "creator", "connection", "payout"];
  // Explicit community metadata always wins over keyword matching. A community
  // comment can legitimately mention trading/markets in its text, but it must
  // never be routed into the trading notification section.
  if (["home", "markets", "market", "community", "more"].includes(section)) return section === "market" ? "markets" : section;
  if (["community", "social", "like", "comment", "reply", "mention", "follow", "repost"].includes(type) || community.some((word) => text.includes(word))) return "community";
  if (["signal", "market", "trade", "update", "warning", "news"].includes(type) || markets.some((word) => text.includes(word))) return "markets";
  if (["reward", "wallet", "monetization", "subscription", "referral", "verification", "creator", "connection", "payout", "risk"].includes(type) || more.some((word) => text.includes(word))) return "more";
  return "home";
}

function PullToRefresh({ children }) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touch = useRef(null);
  const threshold = 28;

  const getScrollParent = (target) => {
    let node = target;
    while (node && node !== document.body) {
      if (node instanceof HTMLElement) {
        const style = window.getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
      }
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  };
  const excluded = (target) => target?.closest?.("button, input, textarea, select, [contenteditable='true'], canvas, svg, video, a");
  const onTouchStart = (event) => {
    if (refreshing || excluded(event.target)) return;
    const parent = getScrollParent(event.target);
    if (parent.scrollTop === 0) touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, parent, vertical: false };
  };
  const onTouchMove = (event) => {
    const active = touch.current;
    if (!active || refreshing) return;
    const dx = event.touches[0].clientX - active.x;
    const dy = event.touches[0].clientY - active.y;
    if (!active.vertical) {
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || dy < 2) {
        if (dy < 0 || Math.abs(dx) > 10) touch.current = null;
        return;
      }
      active.vertical = true;
    }
    if (active.parent.scrollTop > 0) { touch.current = null; setDistance(0); return; }
    event.preventDefault();
    setDistance(Math.min(88, dy * 0.9));
  };
  const onTouchEnd = () => {
    const active = touch.current;
    touch.current = null;
    if (!active?.vertical) { setDistance(0); return; }
    if (distance >= threshold && !sessionStorage.getItem("rainx-pull-refreshing")) {
      sessionStorage.setItem("rainx-pull-refreshing", "1");
      setRefreshing(true);
      setDistance(threshold);
      window.setTimeout(() => window.location.reload(), 220);
    } else setDistance(0);
  };
  useEffect(() => { sessionStorage.removeItem("rainx-pull-refreshing"); }, []);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      <div className={`rx-pull-refresh-indicator${refreshing ? " is-refreshing" : ""}`} style={{ opacity: Math.min(1, distance / threshold), transform: `translate(-50%, ${Math.max(-52, distance - 58)}px) scale(${Math.min(1, 0.65 + distance / (threshold * 3))})`, transition: distance > 0 && !refreshing ? "none" : undefined }} aria-hidden="true">
        <img src={rainxLogoTransparent} alt="" />
      </div>
      {children}
    </div>
  );
}

function WalletTab({ account }) {
  return (
    <div style={{ minHeight:"100%", background:T.ink, paddingBottom:20 }}>
      <div style={{ padding:"18px 16px 8px" }}>
        <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:24, color:T.paper }}>Wallet</div>
        <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>Your trader wallet, balance and transactions</div>
      </div>
      <CreatorWalletScreen account={account} />
    </div>
  );
}

function MainAppContent({ account, onLogout }) {
  const seriesMap = useMultiPriceSeries();
  const seriesMapRef = useRef(seriesMap);
  seriesMapRef.current = seriesMap;
  const entitlement = useEntitlement(account.id);
  // ── Route state: URL hash is the source of truth; localStorage is fallback ─
  const [morePage, setMorePage] = useState(() => {
    const { tab: rt, sub } = routeRead();
    // Only restore morePage from URL if the URL tab is "more" (or profileFromHeader overlay)
    if (rt === "more" && sub) return sub;
    if (rt && sub && rt !== "community") return sub; // e.g. #home/profile-menu/h
    return lsGet("rainx-morepage") || null;
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [tab, setTab] = useState(() => {
    const { tab: urlTab } = routeRead();
    if (urlTab && urlTab !== "space-coins") return urlTab === "markets" ? "wallet" : urlTab;
    const t = lsGet("rainx-tab");
    return t === "markets" ? "wallet" : (_ROUTE_TABS.includes(t) ? t : "home");
  });
  const [profileFromHeader, setProfileFromHeader] = useState(() => routeRead().flag === "h");
  const [communityProfileOpen, setCommunityProfileOpen] = useState(false);
  // Lazy keep-alive: set to true on first visit, stays true so the tab never unmounts again
  const [communityMounted, setCommunityMounted] = useState(false);
  const [spaceCoinsScreen, setSpaceCoinsScreen] = useState(() => {
    const { tab: urlTab, sub } = routeRead();
    return urlTab === "space-coins" && (sub === "intro" || sub === "dashboard") ? sub : null;
  });
  const [scalpingMounted,  setScalpingMounted]  = useState(false);
  useEffect(() => {
    if (tab === "community" && !communityMounted) setCommunityMounted(true);
    if (tab === "scalping"  && !scalpingMounted)  setScalpingMounted(true);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Telegram-style animated navigation ───────────────────────────────────
  const prevTabRef = useRef("home");
  const tabDirRef  = useRef(1);    // 1 = slide from right, −1 = from left
  const swipeRef   = useRef(null); // edge-swipe touch tracking

  const goTab = (key, forcedDir) => {
    const ORDER = { home: 0, wallet: 1, community: 2, more: 3, history: 3, scalping: 3, subscribe: 3 };
    tabDirRef.current  = forcedDir ?? ((ORDER[key] ?? 0) >= (ORDER[prevTabRef.current] ?? 0) ? 1 : -1);
    prevTabRef.current = key;
    setTab(key);
    routeWrite(key, null, null);
  };
  const [activeSymbol, setActiveSymbol] = useState(() => {
    const saved = lsGet("rainx-active-symbol");
    if (saved) { _activeSymbolRef.current = saved; return saved; }
    try {
      const markets = JSON.parse(lsGet("rainx-active-markets") || "[]");
      const s = markets[0] || "XAUUSD";
      _activeSymbolRef.current = s;
      return s;
    } catch { _activeSymbolRef.current = "XAUUSD"; return "XAUUSD"; }
  });
  // ─── Per-market sessions map (persisted to localStorage) ────────────────────
  // sessions = { [symbol]: { symbol, name, startTime, stepIndex, steps, activities, overlays, setup, state } }
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = JSON.parse(lsGet("rainx-sessions") || "{}");
      // Scrub stale signal overlays for any TF that has a stored HOLD setup.
      // These were written by the pre-fix code which kept old entry/SL/TP overlays
      // in overlaysByTf even when the signal turned to HOLD.
      Object.values(saved).forEach(sess => {
        if (!sess || typeof sess !== "object") return;
        if (sess.overlaysByTf && sess.setupByTf) {
          Object.entries(sess.setupByTf).forEach(([tfKey, setup]) => {
            if (setup?.bias === "HOLD") {
              sess.overlaysByTf[tfKey] = [];
              // Also remove _tf-tagged overlays for this TF from session.overlays
              if (Array.isArray(sess.overlays)) {
                sess.overlays = sess.overlays.filter(o => o._tf !== tfKey);
              }
            }
          });
        }
      });
      return saved;
    } catch { return {}; }
  });
  // Derive the active session (for display) from the currently viewed symbol
  const session = sessions[activeSymbol] || null;
  const activeInst = ALL_ASSETS.find(i => i.symbol === (session?.symbol || activeSymbol)) || ALL_ASSETS.find(i => i.symbol === "XAUUSD");
  const inst = activeInst;
  const marketOpen = isMarketOpen(inst.cls);

  const series = seriesMap[activeSymbol] || seriesMap["XAUUSD"] || [];
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
  const [communityUnreadCount, setCommunityUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [activeToastItems, setActiveToastItems] = useState([]);
  const notificationSeenStorageKey = `rainx-seen-notif-ids:${account?.id || "anonymous"}`;
  const notificationsHydratedRef = useRef(false);
  const pendingNotificationEntriesRef = useRef([]);
  const seenNotificationIdsRef = useRef((() => {
    try {
      const stored = JSON.parse(localStorage.getItem(notificationSeenStorageKey) || "[]");
      return new Set(stored);
    } catch { return new Set(); }
  })());
  const persistSeenNotificationIds = () => {
    try {
      localStorage.setItem(
        notificationSeenStorageKey,
        JSON.stringify([...seenNotificationIdsRef.current].slice(-300)),
      );
    } catch {}
  };
  const [autoScan, setAutoScan] = useState(true);
  const lastCandleTimeRef = useRef({}); // `${symbol}_${tfKey}` -> datetime string of the last candle we saw
  const notifiedKeysRef = useRef(new Set()); // tracks which symbol+timeframe combos have had their first real check this session — separate from lastCandleTimeRef, which gets pre-populated from the DB on load and was wrongly reused for this, causing old signals to instantly notify on every app open/refresh

  
  // ─── Active markets (max 3 the user explicitly monitors) ────────────────────
  const [activeMarkets, setActiveMarkets] = useState(() => {
    try { return JSON.parse(lsGet("rainx-active-markets") || "[]"); } catch { return []; }
  });
  const [lastMarketReset, setLastMarketReset] = useState(() => lsGet("rxMarketResetDate") || "");
  const MAX_ACTIVE_MARKETS = 3;
  const addActiveMarket = useCallback((symbol) => {
    setActiveMarkets(prev => {
      if (prev.includes(symbol)) return prev;
      if (prev.length >= MAX_ACTIVE_MARKETS) return prev; // Replace flow handled in AddMarketSheet
      const next = [...prev, symbol];
      lsSet("rainx-active-markets", JSON.stringify(next));
      return next;
    });
  }, []);
  const removeActiveMarket = useCallback((symbol) => {
    setActiveMarkets(prev => {
      const next = prev.filter(s => s !== symbol);
      lsSet("rainx-active-markets", JSON.stringify(next));
      return next;
    });
    // Also drop the session for this market so analysis doesn't run in background
    setSessions(prev => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
  }, []);
  const resetMarkets = useCallback(() => {
    const today = new Date().toDateString();
    if (lastMarketReset !== today) {
       if (window.confirm("This will reset your selections. You can only do this once today.")) {
         setActiveMarkets([]);
         lsSet("rainx-active-markets", JSON.stringify([]));
         setLastMarketReset(today);
         lsSet("rxMarketResetDate", today);
       }
    } else {
       alert("You have already reset your market selections today. Try again tomorrow.");
    }
  }, [lastMarketReset]);

  // Auto-restore removed: on page refresh, no market is auto-selected or auto-analyzed.
  // The user must manually select a market to begin analysis.

  // ─── Analysis session step progression engine (runs for ALL analyzing markets)
  // Key encodes symbol+stepIndex for every analyzing session so the effect re-fires
  // each time any session advances a step.
  const _analyzingKey = Object.entries(sessions)
    .filter(([, s]) => s.state === "analyzing" && s.stepIndex < STEP_DEFS.length)
    .map(([sym, s]) => `${sym}:${s.stepIndex}`)
    .join(",");
  useEffect(() => {
    if (!_analyzingKey) return;
    const timers = _analyzingKey.split(",").map(entry => {
      const [symbol, stepIdxStr] = entry.split(":");
      const stepIdx = Number(stepIdxStr);
      const delay = 2800 + Math.random() * 3200;
      return setTimeout(() => {
        setSessions(prev => {
          const sess = prev[symbol];
          if (!sess || sess.state !== "analyzing" || sess.stepIndex !== stepIdx) return prev;
          const ni = sess.stepIndex + 1;
          const steps = STEP_DEFS.map((s, i) => ({ ...s, status: i < ni ? "done" : i === ni ? "active" : "pending" }));
          const base = sess.overlays.filter(o => o._step !== sess.stepIndex);
          const inst2 = ALL_ASSETS.find(a => a.symbol === symbol) || ALL_ASSETS[0];
          const price = (seriesMapRef.current[symbol] || []).slice(-1)[0]?.price || inst2.base;
          const vol = inst2.vol;
          let newOverlays = [...base];
          if (stepIdx === 0) {
            newOverlays.push({ _step:0, type:"trendline",        price1: price - vol*6, price2: price - vol*1, label:"Uptrend Line" });
            newOverlays.push({ _step:0, type:"swing_high",       price: price + vol*4, idx: 8  });
            newOverlays.push({ _step:0, type:"swing_high",       price: price + vol*2.5, idx: 18 });
            newOverlays.push({ _step:0, type:"swing_low",        price: price - vol*5, idx: 12 });
            newOverlays.push({ _step:0, type:"swing_low",        price: price - vol*3, idx: 22 });
            newOverlays.push({ _step:0, type:"market_structure", price: price + vol*4, idx: 8,  label:"HH" });
            newOverlays.push({ _step:0, type:"market_structure", price: price - vol*5, idx: 12, label:"HL" });
          } else if (stepIdx === 1) {
            newOverlays.push({ _step:1, type:"resistance",    price: price + vol*2.5, label:"Resistance Zone" });
            newOverlays.push({ _step:1, type:"support_zone",  priceLow: price - vol*2.5, priceHigh: price - vol*1 });
            newOverlays.push({ _step:1, type:"liquidity",     priceLow: price + vol*2.2, priceHigh: price + vol*3.0 });
            newOverlays.push({ _step:1, type:"liquidity",     priceLow: price - vol*3.0, priceHigh: price - vol*2.2 });
          } else if (stepIdx === 2) {
            newOverlays.push({ _step:2, type:"channel",
              price1: price - vol*6, price2: price - vol*1,
              price3: price - vol*5, price4: price + vol*0.5,
            });
          } else if (stepIdx === 3) {
            newOverlays.push({ _step:3, type:"entry_zone", priceLow: price - vol*0.5, priceHigh: price + vol*0.5 });
            newOverlays.push({ _step:3, type:"breakout",   priceLow: price + vol*0.4, priceHigh: price + vol*1.2 });
          }
          // Step 4: no placeholder overlays — real signal comes from checkCandle
          newOverlays = newOverlays.filter(o => o.type !== "current_price");
          newOverlays.push({ type:"current_price", price });
          const actMsg = [
            "Market structure mapped — bullish higher highs forming.",
            `Support zone identified near ${(price - vol*1.5).toFixed(inst2.digits)}.`,
            "Trend direction confirmed — bullish bias maintained.",
            `Entry zone identified ${(price - vol*0.5).toFixed(inst2.digits)} – ${(price + vol*0.5).toFixed(inst2.digits)}. Monitoring price action.`,
            "Confirmation pending — watching for momentum shift.",
          ][stepIdx] || "Analysis progressing.";
          const activities = [{ time: new Date().toLocaleTimeString(), text: actMsg }, ...sess.activities].slice(0, 20);
          const state = ni >= STEP_DEFS.length ? "watching" : "analyzing";
          return { ...prev, [symbol]: { ...sess, stepIndex: ni, steps, overlays: newOverlays, activities, setup: sess.setup || null, state } };
        });
      }, delay);
    });
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_analyzingKey]);

  // Persist active symbol so it survives refresh
  useEffect(() => { lsSet("rainx-active-symbol", activeSymbol); _activeSymbolRef.current = activeSymbol; }, [activeSymbol]);

  // Persist all sessions to localStorage whenever they change
  useEffect(() => { lsSet("rainx-sessions", JSON.stringify(sessions)); }, [sessions]);

  // On mount: auto-start sessions for any active market that doesn't have one yet
  // (handles fresh installs or cleared localStorage while activeMarkets was already saved)
  useEffect(() => {
    setActiveMarkets(prev => {
      prev.forEach(symbol => {
        setSessions(s => {
          if (s[symbol]) return s; // session already exists — keep it
          const asset = ALL_ASSETS.find(a => a.symbol === symbol);
          if (!asset) return s;
          const now = Date.now();
          return {
            ...s,
            [symbol]: {
              symbol: asset.symbol, name: asset.name, startTime: now, stepIndex: 0,
              steps: STEP_DEFS.map((st, i) => ({ ...st, status: i === 0 ? "active" : "pending" })),
              activities: [{ time: new Date().toLocaleTimeString(), text: `Raina AI resuming analysis on ${asset.symbol}.` }],
              overlays: [], setup: null, state: "analyzing",
            },
          };
        });
      });
      return prev; // don't change activeMarkets — side-effect only
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Activity heartbeat during watching phase (runs for ALL watching markets)
  const _watchingKey = Object.keys(sessions).filter(sym => sessions[sym]?.state === "watching").join(",");
  useEffect(() => {
    if (!_watchingKey) return;
    const msgs = [
      "Price action remains constructive above support.",
      "Monitoring momentum indicators for confirmation.",
      "No significant structure changes detected.",
      "Resistance zone holding. Watching for breakout.",
      "Bullish structure intact. Setup still developing.",
      "Price consolidating near entry zone.",
    ];
    const id = setInterval(() => {
      setSessions(prev => {
        const next = { ...prev };
        let changed = false;
        _watchingKey.split(",").forEach(symbol => {
          const s = prev[symbol];
          if (!s || s.state !== "watching") return;
          const text = msgs[Math.floor(Math.random() * msgs.length)];
          next[symbol] = { ...s, activities: [{ time: new Date().toLocaleTimeString(), text }, ...s.activities].slice(0, 20) };
          changed = true;
        });
        return changed ? next : prev;
      });
    }, 30000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_watchingKey]);

  // Session countdown
  const [sessionSecsLeft] = useState(0); // Session runs continuously — no countdown

  const startAnalysisSession = useCallback((asset) => {
    const now = Date.now();
    setSessions(prev => ({
      ...prev,
      [asset.symbol]: {
        symbol: asset.symbol,
        name: asset.name,
        startTime: now,
        stepIndex: 0,
        steps: STEP_DEFS.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })),
        activities: [{ time: new Date().toLocaleTimeString(), text: `Raina AI starting analysis on ${asset.symbol}. Studying market structure…` }],
        overlays: [],
        setup: null,
        state: "analyzing",
      }
    }));
  }, []);

  // ─── Theme ─────────────────────────────────────────────────────────────────
  const [themeMode, setThemeMode] = useState(() => lsGet("rainx-theme") || "light");
  const [showSidebar, setShowSidebar] = useState(false);
  const isDark = themeMode === "dark" || (themeMode === "system" && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  // Mutate T in-place BEFORE children render — all 200+ T.xxx refs in child components pick up new values automatically
  Object.assign(T, isDark ? DARK_TOKENS : LIGHT_TOKENS);
  useEffect(() => { document.body.style.background = T.ink; }, [isDark]);
  useEffect(() => { lsSet("rainx-tab", tab); }, [tab]);
  useEffect(() => { if (morePage !== null) lsSet("rainx-morepage", morePage); else lsDelete("rainx-morepage"); }, [morePage]);
  // Keep URL hash in sync with current route state (replaceState — no new history entry)
  useEffect(() => {
    if (spaceCoinsScreen) {
      routeReplace("space-coins", spaceCoinsScreen, null);
    } else {
      routeReplace(tab, morePage, profileFromHeader ? "h" : null);
    }
  }, [tab, morePage, profileFromHeader, spaceCoinsScreen]);
  // Sync browser Back/Forward to React state
  useEffect(() => {
    const onPop = () => {
      const { tab: t, sub: mp, flag } = routeRead();
      if (t === "space-coins") {
        setSpaceCoinsScreen(mp === "dashboard" ? "dashboard" : "intro");
        return;
      }
      setSpaceCoinsScreen(null);
      if (t) { prevTabRef.current = t; setTab(t); }
      setMorePage(mp ?? null);
      setProfileFromHeader(flag === "h");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const unreadSections = notifications.reduce((counts, notification) => {
    if (!notification.read) counts[classifyNotification(notification)] += 1;
    return counts;
  }, { home: 0, markets: 0, community: 0, more: 0 });
  const navBadges = {
    home: formatNotificationCount(unreadSections.home),
    markets: formatNotificationCount(unreadSections.markets),
    community: formatNotificationCount(unreadSections.community + communityUnreadCount),
    more: formatNotificationCount(unreadSections.more),
  };
  const unreadCount = notifications.filter((n) => !n.read).length;

  const announceRainxPresence = useCallback((activeChatUserId = null) => {
    const presence = {
      type: "RAINX_PRESENCE",
      accountId: account?.id || null,
      visible: document.visibilityState === "visible",
      activeChatUserId,
      updatedAt: Date.now(),
    };
    try { localStorage.setItem("rainx_presence", JSON.stringify(presence)); } catch {}
    try {
      if ("serviceWorker" in navigator) {
        if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(presence);
        else navigator.serviceWorker.ready.then(reg => reg.active?.postMessage(presence)).catch(() => {});
      }
    } catch {}
  }, [account?.id]);

  // Announce that RainX is open. DMScreen overrides activeChatUserId while a
  // conversation is open.
  useEffect(() => {
    announceRainxPresence();
    const onVisibilityChange = () => announceRainxPresence();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onVisibilityChange);
    };
  }, [announceRainxPresence]);

  const enqueueInAppNotification = useCallback((entry) => {
    // Realtime can deliver the same row before the initial notification history
    // has finished loading. Hold it until hydration has claimed all persisted IDs
    // so an off-app push is not replayed as an in-app banner after launch.
    if (!notificationsHydratedRef.current) {
      pendingNotificationEntriesRef.current.push(entry);
      return false;
    }
    const key = entry?.id == null
      ? `${entry?.type || "notification"}:${entry?.title || ""}:${entry?.body || ""}`
      : String(entry.id);
    if (seenNotificationIdsRef.current.has(key)) return false;
    seenNotificationIdsRef.current.add(key);
    persistSeenNotificationIds();
    if (seenNotificationIdsRef.current.size > 300) {
      const oldest = seenNotificationIdsRef.current.values().next().value;
      if (oldest) seenNotificationIdsRef.current.delete(oldest);
    }
    setNotifications((list) => [entry, ...list.filter((n) => String(n.id) !== key)].slice(0, 50));
    // The service worker owns OS notifications when the app is not visible.
    // When RainX is open, this queue owns the single in-app banner instead.
    setToastQueue((queue) => [...queue, entry]);
    return true;
  }, [notificationSeenStorageKey]);

  const openNotificationTarget = useCallback((entry) => {
    const data = entry?.data || {};
    const target = data.targetKind ? data : entry;
    if (!target?.targetKind) return;
    const url = buildRainxNotificationUrl({
      kind: target.targetKind,
      userId: target.userId || target.senderId,
      conversationId: target.conversationId,
      postId: target.postId,
      symbol: target.symbol,
      timeframe: target.timeframe,
      notificationAction: "open",
    });
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
    if (target.targetKind === "signal") {
      const nextSymbol = target.symbol;
      if (nextSymbol) {
        lsSet("rainx-active-symbol", nextSymbol);
        _activeSymbolRef.current = nextSymbol;
        setActiveSymbol(nextSymbol);
      }
      setTab("home");
      return;
    }
    setTab(target.targetKind === "chat" || target.targetKind === "post" ? "community" : "home");
    lsSet("rainx-pending-notification", JSON.stringify({
      ...target,
      expiresAt: Date.now() + 60_000,
    }));
  }, []);

  const pushNotification = useCallback(async (n) => {
    // Subscribers do NOT receive trading signal / economic news push notifications
    // (signals are shown in-app on the chart; push notifications are sent for confirmed signals)
    const tradingKw = ["buy","sell","take profit","stop loss"," tp "," sl ","entry","cpi","nfp","fomc","reversal","signal"];
    const isTradingNotif = ["signal","update","warning","news"].includes(n.type) ||
      tradingKw.some(kw => (n.title||"").toLowerCase().includes(kw) || (n.body||"").toLowerCase().includes(kw));
    if (isTradingNotif && !hasAccess(entitlement?.tier, "weekly")) return; // only send trading notifs to subscribers
    let id = Date.now() + Math.random();
    if (account?.id) {
      const targetKind = n.targetKind || (n.type === "signal" || n.type === "update" || n.type === "warning" ? "signal" : undefined);
      const target = {
        targetKind,
        symbol: n.symbol,
        timeframe: n.timeframe,
        postId: n.postId,
        conversationId: n.conversationId,
        senderId: n.senderId,
      };
      // Persist with type/section/data so notifications survive reload and
      // market logos / buy-sell badges still resolve after closing the app.
      // Try the full insert first; fall back to title+body only if the extra
      // columns don't exist yet on the user_notifications table.
      let rowId = null;
      try {
        const fullInsert = {
          user_id: account.id,
          title: n.title,
          body: n.body,
          type: n.type || null,
          section: n.section || null,
          data: target,
        };
        const r = await supabase.from("user_notifications").insert(fullInsert).select("id").single();
        if (r?.data?.id) rowId = r.data.id;
        else if (r?.error) throw r.error;
      } catch (_) {
        // Fallback: the table may not have type/section/data columns yet.
        try {
          const r2 = await supabase.from("user_notifications").insert({ user_id: account.id, title: n.title, body: n.body }).select("id").single();
          if (r2?.data?.id) rowId = r2.data.id;
        } catch (__) {}
      }
      if (rowId) id = rowId;
    }
    const targetKind2 = n.targetKind || (n.type === "signal" || n.type === "update" || n.type === "warning" ? "signal" : undefined);
    const target = {
      targetKind: targetKind2,
      symbol: n.symbol,
      timeframe: n.timeframe,
      postId: n.postId,
      conversationId: n.conversationId,
      senderId: n.senderId,
    };
    const entry = { id, read: false, time: new Date().toLocaleTimeString(), created_at: new Date().toISOString(), ...n, data: target };
    enqueueInAppNotification(entry);
    const apiBase = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
    fetch(`https://rainx-webapp.vercel.app/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: account.id,
        title: n.title,
        body: n.body,
        data: {
          ...target,
          kind: n.type === "signal" || n.type === "update" || n.type === "warning" ? "signal" : (n.type || "default"),
          category: n.type === "warning" ? "sl" : (n.type === "update" ? "tp" : (n.type || "default")),
          notificationId: String(id),
          tag: n.type === "signal" || n.type === "update" || n.type === "warning"
            ? "rainx-signal"
            : `rainx-${n.type || "notification"}`,
          group: n.type === "signal" || n.type === "update" || n.type === "warning"
            ? "rainx-signals"
            : "rainx",
          url: targetKind ? buildRainxNotificationUrl(target) : "/",
        },
      }),
    }).catch(() => {});
  }, [account, entitlement?.tier, enqueueInAppNotification]);

  // Native Capacitor/FCM foreground delivery uses the same routing rules as
  // service-worker delivery. Android shows the system notification while the
  // app is backgrounded; when the app is open we surface it in-app here.
  useEffect(() => {
    if (!account?.id) return undefined;
    const handleNativePush = (event) => {
      const notification = event?.detail || {};
      const data = notification?.data || {};
      const kind = String(data.kind || data.category || "").toLowerCase();
      const category = String(data.category || "").toLowerCase();
      const isCommunity = kind === "community" || ["like", "comment", "comment_reply", "reply", "comment_like", "follow", "repost", "mention", "chat"].includes(kind) || category === "community" || category === "chat";
      if (isCommunity) {
        window.dispatchEvent(new CustomEvent("rainx:community-notification-received"));
        return;
      }
      if (document.visibilityState === "visible") {
        enqueueInAppNotification({
          id: data.notificationId || data.messageId || `${notification.title || "RainX"}::${notification.body || ""}`,
          title: notification.title || "RainX",
          body: notification.body || "",
          type: data.kind || data.category || "update",
          read: false,
          time: new Date().toLocaleTimeString(),
          created_at: new Date().toISOString(),
          data,
        });
      }
    };
    window.addEventListener("rainx:native-push-received", handleNativePush);
    return () => window.removeEventListener("rainx:native-push-received", handleNativePush);
  }, [account?.id, enqueueInAppNotification]);

  // ─── One account-scoped notification bridge for every RainX surface ────────
  useEffect(() => {
    if (!account?.id) return undefined;
    const handleMsg = (event) => {
      if (event.data?.type === "RAINX_PUSH_RECEIVED") {
        const payload = event.data.payload || {};
        const data = payload.data || {};
        const kind = String(data.kind || "").toLowerCase();
        const category = String(data.category || "").toLowerCase();
        // Community notifications have their own persistent source of truth
        // (`community_notifications`). Do not copy a community push into the
        // generic trading/home notification list: doing so made it appear in
        // the wrong area and then disappear after refresh because that list is
        // rehydrated from `user_notifications`.
        const COMMUNITY_KINDS = new Set(["chat", "like", "comment", "comment_reply", "reply", "comment_like", "follow", "repost", "mention"]);
        if (COMMUNITY_KINDS.has(kind) || category === "community") {
          window.dispatchEvent(new CustomEvent("rainx:community-notification-received"));
          return;
        }
        if (document.visibilityState === "visible") enqueueInAppNotification({
          id: data.notificationId || data.messageId || `${payload.title || ""}::${payload.body || ""}`,
          title: payload.title || "RainX",
          body: payload.body || "",
          type: kind === "chat" ? "community" : (data.kind || "update"),
          read: false,
          time: new Date().toLocaleTimeString(),
          data,
        });
        return;
      }
      if (event.data?.type === "RAINX_NOTIFICATION_ACTION") {
        const data = event.data.payload || {};
        if (data.url) window.location.assign(data.url);
        return;
      }
      if (event.data?.type !== "PLAY_SOUND" || !event.data.soundSrc) return;
      try {
        const audio = new Audio(event.data.soundSrc);
        audio.volume = 0.8;
        audio.play().catch(() => {}); // silently ignore autoplay policy rejections
      } catch {}
    };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", handleMsg);
    return () => {
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", handleMsg);
    };
  }, [account?.id, enqueueInAppNotification]);

  // Push is the background delivery path. These realtime channels are the
  // foreground fallback and deliberately do not suppress an open chat.
  useEffect(() => {
    if (!account?.id) return undefined;
    const channel = supabase.channel("rainx-in-app-notifications-" + account.id)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "community_notifications",
        filter: `user_id=eq.${account.id}`,
      }, ({ new: row }) => {
        // Community notifications are owned by CommunityTab and
        // `community_notifications`. Keep the shell badge in sync, but do not
        // inject the row into the generic notification history.
        setCommunityUnreadCount((count) => count + 1);
        try { window.dispatchEvent(new CustomEvent("rainx:community-notification-received")); } catch {}
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
        filter: `receiver_id=eq.${account.id}`,
      }, ({ new: message }) => {
        if (document.visibilityState === "visible") enqueueInAppNotification({
          id: message.id,
          title: "New Message",
          body: message.content || "",
          type: "community",
          read: false,
          time: new Date().toLocaleTimeString(),
          data: {
            targetKind: "chat",
            userId: message.sender_id,
            senderId: message.sender_id,
            conversationId: [account.id, message.sender_id].sort().join("_"),
          },
        });
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "user_notifications",
        filter: `user_id=eq.${account.id}`,
      }, ({ new: row }) => {
        if (document.visibilityState === "visible") enqueueInAppNotification({
          id: row.id,
          title: row.title || "RainX",
          body: row.body || "",
          type: row.type || "update",
          read: !!row.read,
          time: new Date().toLocaleTimeString(),
          data: row.data || {},
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [account?.id, enqueueInAppNotification]);

  // Native Capacitor/FCM is the only notification transport in the mobile app.

  useEffect(() => {
    if (!activeToast && toastQueue.length > 0) {
      setActiveToast({ ...toastQueue[0], count: toastQueue.length });
      setActiveToastItems(toastQueue);
      setToastQueue([]);
    }
  }, [toastQueue, activeToast]);

  // Load this account's past notifications (survives logout, new device, etc.)
  useEffect(() => {
    if (!account?.id) return;
    (async () => {
      try {
        const deliveredPushIds = await readDeliveredPushIds();
        deliveredPushIds.forEach((id) => seenNotificationIdsRef.current.add(id));
        const { data } = await supabase.from("user_notifications").select("*").eq("user_id", account.id).order("created_at", { ascending: false }).limit(50);
        const loaded = (data || []).map((row) => ({
            id: row.id, title: row.title, body: row.body,
            type: row.type || null, section: row.section || null,
            read: row.read, time: new Date(row.created_at).toLocaleTimeString(), created_at: row.created_at,
            // Reconstruct the data object (symbol etc.) so market logos resolve
            // after the app is closed and reopened.
            data: row.data || {},
            symbol: row.data?.symbol || row.symbol || null,
        }));
        loaded.forEach((row) => seenNotificationIdsRef.current.add(String(row.id)));
        persistSeenNotificationIds();
        setNotifications((current) => {
          const loadedIds = new Set(loaded.map((n) => String(n.id)));
          const localOnly = current.filter((n) => !loadedIds.has(String(n.id)));
          return [...localOnly, ...loaded].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 50);
        });
      } catch { /* keep starting empty if this fails */ }
      finally {
        notificationsHydratedRef.current = true;
        const pending = pendingNotificationEntriesRef.current;
        pendingNotificationEntriesRef.current = [];
        pending.forEach((entry) => enqueueInAppNotification(entry));
      }
    })();
  }, [account?.id, enqueueInAppNotification, notificationSeenStorageKey]);

  useEffect(() => {
    if (!account?.id) return;
    let cancelled = false;
    const loadCommunityUnreadCount = async () => {
      const { count } = await supabase
        .from("community_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", account.id)
        .eq("read", false);
      if (!cancelled) {
        // Never let a stale poll shrink the badge below a realtime increment
        // that the database may not have caught up to yet (replication lag).
        // This stops the community menu badge from flickering "on and off".
        const dbCount = count || 0;
        setCommunityUnreadCount((current) => Math.max(current, dbCount));
      }
    };
    loadCommunityUnreadCount();
    const interval = window.setInterval(loadCommunityUnreadCount, 30000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [account?.id]);

  // When the community notification sheet marks everything read, clear the
  // community menu-icon badge instantly instead of waiting for the next poll.
  useEffect(() => {
    const onRead = () => setCommunityUnreadCount(0);
    const onCommunityNotification = async () => {
      if (!account?.id) return;
      const { count } = await supabase
        .from("community_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", account.id)
        .eq("read", false);
      setCommunityUnreadCount(count || 0);
    };
    window.addEventListener("rainx:community-notifs-read", onRead);
    window.addEventListener("rainx:community-notification-received", onCommunityNotification);
    return () => {
      window.removeEventListener("rainx:community-notifs-read", onRead);
      window.removeEventListener("rainx:community-notification-received", onCommunityNotification);
    };
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
    // Throttle: skip until this timeframe's own candle window has actually
    // elapsed (15m holds ~15 min, 1h holds ~1h, 4h holds ~4h, etc.) instead
    // of a flat 4 minutes for every timeframe.
    if (lastCandleTimeRef.current[key] && now - lastCandleTimeRef.current[key] < stabilityWindowFor(tf.key)) return;
    try {
      const wasFirstLoad = !notifiedKeysRef.current.has(key);
      notifiedKeysRef.current.add(key);
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

      // ── Update this symbol's session with real signal data from backend ──
      if (result.bias === "hold" || result.entry != null) {
        setSessions(prev => {
          const sess = prev[inst.symbol];
          if (!sess || sess.state === "completed") return prev;
          const tfKey  = tf.key;
          const tfLbl  = tf.label; // e.g. "15 Minute" or "1 Hour"

          // HOLD: write real confidence into setupByTf and clear this TF's overlays
          if (result.bias === "hold") {
            const newSetup = {
              bias:       "HOLD",
              entry:      null,
              entryLow:   null,
              entryHigh:  null,
              stopLoss:   null,
              tp1:        null,
              tp2:        null,
              rr:         null,
              confidence: result.confidence,
              reason:     result.reason,
            };
            // Clear this TF's signal overlays so the chart doesn't show stale entry/SL/TP lines
            const overlaysByTf = { ...sess.overlaysByTf, [tfKey]: [] };
            // Rebuild session.overlays: keep structural + current_price, drop this TF's old overlays
            const keepTypes = new Set(["trendline","channel","support_zone","resistance","liquidity","swing_high","swing_low","market_structure","current_price"]);
            const baseOverlays = (sess.overlays || []).filter(o => keepTypes.has(o.type) || (!o._tf));
            const remainingTfOverlays = Object.entries(overlaysByTf)
              .filter(([k]) => k !== tfKey)
              .flatMap(([, v]) => v);
            return { ...prev, [inst.symbol]: {
              ...sess,
              overlays: [...baseOverlays, ...remainingTfOverlays],
              overlaysByTf,
              setupByTf: { ...sess.setupByTf, [tfKey]: newSetup },
            } };
          }

          const price  = result.entry;
          const slDist = result.stop_loss   ? Math.abs(price - result.stop_loss)   : inst.vol * 2.5;
          const tp1    = result.take_profit_1;
          const tp2    = result.take_profit_2;

          // Keep structural (non-signal) overlays across timeframe updates
          const keepTypes = new Set(["trendline","channel","support_zone","resistance","liquidity","swing_high","swing_low","market_structure"]);
          const baseStructural = (sess.overlays || []).filter(o => keepTypes.has(o.type));

          // Per-TF signal overlays — tagged with _tf so both 15m and 1h show on chart simultaneously
          const tfOverlays = [
            { type:"entry_zone", _tf: tfKey,
              priceLow:  Array.isArray(signal.entry_zone) ? signal.entry_zone[0] : price-inst.vol*0.5,
              priceHigh: Array.isArray(signal.entry_zone) ? signal.entry_zone[1] : price+inst.vol*0.5 },
            { type:"sl_level",   _tf: tfKey, price: result.stop_loss || price - slDist, label: "SL (" + tfLbl + ")" },
            ...(tp1 != null ? [{ type:"tp_level", _tf: tfKey, price: tp1, label: "TP1 (" + tfLbl + ")" }] : []),
            ...(tp2 != null ? [{ type:"tp_level", _tf: tfKey, price: tp2, label: "TP2 (" + tfLbl + ")" }] : []),
            { type:"direction_arrow", _tf: tfKey, from: price,
              target: tp1 || (result.bias === "sell" ? price - slDist * 1.5 : price + slDist * 1.5),
              bias: result.bias },
            ...(tp2 != null ? [{ type:"projection", _tf: tfKey, target: tp2, bias: result.bias }] : []),
            { type:"breakout", _tf: tfKey, priceLow: price + inst.vol*0.3, priceHigh: price + inst.vol*1.0 },
          ];

          // Accumulate overlays per-TF — keep all TFs stored; render only selected TF at chart site
          const overlaysByTf = { ...sess.overlaysByTf, [tfKey]: tfOverlays };
          const allTfOverlays = overlaysByTf[tfKey];

          // One current_price overlay (live price line — no TF tag)
          const currentPriceOverlay = { type: "current_price", price };

          const mergedOverlays = [
            ...baseStructural,
            currentPriceOverlay,
            ...allTfOverlays,
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
            reason:     result.reason,
          };

          return { ...prev, [inst.symbol]: {
            ...sess,
            overlays: mergedOverlays,
            overlaysByTf,
            setupByTf: { ...sess.setupByTf, [tfKey]: newSetup },
          } };
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
      }
    } catch { /* keep the existing signal if the fetch fails */ }
  }, [pushNotification]);

  const allCombos = [];
  INSTRUMENTS.forEach((inst) => {
    // Only scan markets the user has explicitly activated
    if (activeMarkets.includes(inst.symbol)) {
      TIMEFRAMES.forEach((tf) => allCombos.push({ inst, tf }));
    }
  });

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
              reason: row.reason, digits: inst.digits, name: inst.name, timeframe: row.timeframe,
              timeframeLabel: TIMEFRAMES.find((t) => t.key === row.timeframe)?.label || row.timeframe,
              generatedAt: new Date(row.generated_at).getTime(), status: row.status || "active", milestones: row.milestones || [],
            };
            // row.candle_time comes back from Supabase as an ISO string. The
            // throttle check does plain number subtraction (now - lastCandleTimeRef),
            // and `Date.now() - "2026-..."` evaluates to NaN in JS, which silently
            // disabled the stability window on every reload. Store it as epoch ms.
            const parsedCandleTime = row.candle_time ? new Date(row.candle_time).getTime() : Date.now();
            lastCandleTimeRef.current[`${row.symbol}_${row.timeframe}`] = Number.isFinite(parsedCandleTime) ? parsedCandleTime : Date.now();
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
                sideEffects.push(() => pushNotification({ type: "update", symbol: inst.symbol, title: `+${step} ${unitFor(inst)} — ${inst.name} (${tf.label})`, body: `Trade is now moving +${step} ${unitFor(inst)} in profit.` }));
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
              sideEffects.push(() => pushNotification({ type: "update", symbol: inst.symbol, title: `🎯 Take Profit Hit — ${inst.name} (${tf.label})`, body: `Take Profit reached! +${Math.round(tpDist)} ${unitFor(inst)}.` }));
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

  // When any session transitions to "watching", immediately fetch a real signal
  // from the backend for that market instead of waiting for the scan loop.
  useEffect(() => {
    if (!_watchingKey) return;
    _watchingKey.split(",").forEach(symbol => {
      const inst2 = ALL_ASSETS.find(a => a.symbol === symbol);
      if (!inst2) return;
      // Clear throttle so the first call always goes through
      delete lastCandleTimeRef.current[`${symbol}_15m`];
      delete lastCandleTimeRef.current[`${symbol}_1h`];
      delete lastCandleTimeRef.current[`${symbol}_4h`];
      checkCandle(inst2, { key: "15m", label: "15M" });
      checkCandle(inst2, { key: "1h",  label: "1H" });
      checkCandle(inst2, { key: "4h",  label: "4H" });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_watchingKey]);

  const activeSignal = signalsMap[activeSymbol]?.[selectedTf] || null;

  return (
    <PullToRefresh>
      <div style={{ minHeight: "100dvh", background: tab === "home" ? "#F8F9FA" : T.ink, color: T.paper, fontFamily: FONT_BODY, maxWidth: 480, margin: "0 auto", position: "relative", isolation: "isolate" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin:0; }
        @keyframes slideDown { from { transform: translateY(-30px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes priceFlash { 0% { opacity:0.4; } 100% { opacity:1; } }
        @keyframes rx-slide-in-right { from { transform:translateX(40px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes rx-slide-in-left  { from { transform:translateX(-40px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n        @keyframes rx-breathe { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.68; transform:scale(.985); } }
        .rx-slide-right { animation: rx-slide-in-right 0.22s cubic-bezier(0.25,0.46,0.45,0.94) backwards; }
        .rx-slide-left  { animation: rx-slide-in-left  0.22s cubic-bezier(0.25,0.46,0.45,0.94) backwards; }
        .hide-scroll::-webkit-scrollbar { display:none; }
        .hide-scroll { -ms-overflow-style:none; scrollbar-width:none; }
        .scroll-hint::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(244,211,94,0.5),transparent); opacity:0; transition:opacity 0.3s; pointer-events:none; }
        .scroll-hint.scrolling::after { opacity:1; }
      `}</style>

      <Toast
        toast={activeToast}
        onDone={() => setActiveToast(null)}
        onOpen={openNotificationTarget}
      />

      {tab === "home" && <div style={{ background: "transparent", borderBottom: "none", padding: "16px 18px 14px", minHeight: 82, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 20, boxShadow: "none" }}>
        {/* ── Profile avatar trigger ── */}
          <button onClick={() => { setProfileFromHeader(true); setMorePage("profile-menu"); routeWrite(tab, "profile-menu", "h"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              <HeaderAvatar account={account} morePage={morePage} T={T} />
            </button>
        <button onClick={() => {
          setShowNotifPanel(true);
          const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
          setNotifications((list) => list.map((n) => ({ ...n, read: true })));
          if (account?.id && unreadIds.length) {
            supabase.from("user_notifications").update({ read: true }).eq("user_id", account.id).in("id", unreadIds).then(() => {}, () => {});
          }
        }} style={{ position: "relative", background: "none", border: "none", color: "#0F0E0B", cursor: "pointer", padding: 4 }}>
          <Bell size={24} strokeWidth={1.8} fill="#0F0E0B" color="#0F0E0B" />
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: -6, right: -8, background: T.rust, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>}

      {/* Community — lazy keep-alive: mounts on first visit, never unmounts again */}
      {communityMounted && (
        <div style={{ display: tab === "community" ? "block" : "none", paddingBottom: 78 }}>
          <CommunityTab account={account} entitlement={entitlement} themeTokens={T} onViewingProfileChange={(uid) => setCommunityProfileOpen(!!uid)} />
        </div>
      )}
      {/* Scalping — lazy keep-alive: mounts on first visit, never unmounts again */}
      {scalpingMounted && (
        <div style={{ display: tab === "scalping" ? "block" : "none", paddingBottom: 78 }}>
          <ScalpingTab account={account} entitlement={entitlement} onSubscribe={() => goTab("subscribe")} />
        </div>
      )}

      {/* Animated tab container — key forces remount, triggering CSS slide per direction */}
      {tab !== "community" && tab !== "scalping" && (
      <div
        key={tab}
        className={tabDirRef.current >= 0 ? "rx-slide-right" : "rx-slide-left"}
        style={{ paddingBottom: 78 }}
        onTouchStart={(e) => {
          const x = e.touches[0].clientX;
          swipeRef.current = (x < 28 || x > window.innerWidth - 28)
            ? { x, y: e.touches[0].clientY } : null;
        }}
        onTouchEnd={(e) => {
          if (!swipeRef.current) return;
          const dx = e.changedTouches[0].clientX - swipeRef.current.x;
          const dy = Math.abs(e.changedTouches[0].clientY - swipeRef.current.y);
          swipeRef.current = null;
          if (Math.abs(dx) < 45 || dy > 100) return;
          const tabs = ["home", "wallet", "community", "more"];
          const ci = tabs.indexOf(tab);
          if (dx < 0 && ci < tabs.length - 1) goTab(tabs[ci + 1]);
          else if (dx > 0 && ci > 0)          goTab(tabs[ci - 1]);
        }}
      >
        {tab === "home" && <HomeTab account={account} inst={inst} marketOpen={marketOpen} last={last} changePct={changePct} series={series} activeSymbol={activeSymbol} setActiveSymbol={setActiveSymbol} entitlement={entitlement} onSubscribe={() => goTab("subscribe")} session={session} sessions={sessions} sessionSecsLeft={sessionSecsLeft} startAnalysisSession={startAnalysisSession} seriesMap={seriesMap} signalsMap={signalsMap} themeMode={themeMode} activeMarkets={activeMarkets} addActiveMarket={addActiveMarket} removeActiveMarket={removeActiveMarket} maxActiveMarkets={MAX_ACTIVE_MARKETS} resetMarkets={resetMarkets} lastMarketReset={lastMarketReset} />}
        {tab === "wallet" && <WalletTab account={account} />}
        {tab === "history" && <HistoryTab account={account} entitlement={entitlement} onSubscribe={() => goTab("subscribe")} />}
        {tab === "subscribe" && <SubscribeScreen account={account} entitlement={entitlement} onBack={() => goTab("more", -1)} />}
        {tab === "more" && <MoreTabErrorBoundary><MoreTab autoScan={autoScan} setAutoScan={setAutoScan} analysis={activeSignal} inst={inst} last={last} account={account} onLogout={onLogout} onLogoutConfirm={() => setShowLogoutConfirm(true)} setTab={goTab} entitlement={entitlement} themeMode={themeMode} setThemeMode={setThemeMode} morePage={morePage} setMorePage={setMorePage} setProfileFromHeader={setProfileFromHeader} activeMarkets={activeMarkets} /></MoreTabErrorBoundary>}
      </div>
      )}

      {/* ── Profile overlay — opens over any tab when accessed from header/sidebar ── */}
      {profileFromHeader && morePage && tab !== "more" && (
        <div style={{ position:"fixed", inset:0, zIndex:500, background:T.ink, overflowY:"auto" }}>
          <MoreTabErrorBoundary>
            <MoreTab autoScan={autoScan} setAutoScan={setAutoScan} analysis={activeSignal} inst={inst} last={last} account={account} onLogout={onLogout} onLogoutConfirm={() => setShowLogoutConfirm(true)} setTab={goTab} entitlement={entitlement} themeMode={themeMode} setThemeMode={setThemeMode} morePage={morePage} setMorePage={setMorePage} setProfileFromHeader={setProfileFromHeader} activeMarkets={activeMarkets} />
          </MoreTabErrorBoundary>
        </div>
      )}

      {/* ── Sidebar drawer (hamburger menu) ──────────────────────────────── */}
      {showSidebar && (
        <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex" }}>
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
              {/* Clickable Profile */}
              <button onClick={() => { setProfileFromHeader(true); setMorePage("profile-menu"); setShowSidebar(false); routeWrite(tab, "profile-menu", "h"); }} style={{ marginTop:18, width:"100%", display:"flex", alignItems:"center", gap:12, background:T.ink, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"12px 14px", cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.ink, flexShrink:0 }}>
                  {(account?.email || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper }}>Profile</div>
                  <div style={{ fontSize:10.5, color:T.muted, marginTop:2 }}>View &amp; edit your profile</div>
                </div>
                <ChevronRight size={15} color={T.muted} />
              </button>
            </div>

            {/* Nav items */}
            <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
              {[
                { icon:Users2,      label:"Profile",        action:() => { setMorePage("profile");  goTab("more"); setShowSidebar(false); } },
                { icon:Wallet,      label:"Creator Wallet", action:() => { setMorePage("wallet");   goTab("more"); setShowSidebar(false); } },
                { icon:ShieldCheck, label:"Security",       action:() => { setMorePage("security"); goTab("more"); setShowSidebar(false); } },
                { icon:Settings,    label:"Settings",       action:() => { setMorePage("settings"); goTab("more"); setShowSidebar(false); } },
                null,
                { icon:LogOut,      label:"Log out",        action:() => { setShowSidebar(false); setShowLogoutConfirm(true); }, danger:true },
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
        <div style={{ position: "fixed", inset: 0, background: T.ink, zIndex: 500, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Header */}
            <div style={{ padding: "16px 18px 10px", borderBottom: `1px solid ${T.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 17, color: T.paper, fontWeight: 700 }}>Notifications</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {notifications.length > 0 && (
                  <button onClick={() => setShowClearAllConfirm(true)} style={{ background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 7, padding: "4px 10px", fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: FONT_HEAD, fontWeight: 600 }}>Clear all</button>
                )}
                <button onClick={() => setShowNotifPanel(false)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={20} /></button>
              </div>
            </div>
            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 18px 18px" }}>
              <BlurGate unlocked={hasAccess(entitlement.tier, "weekly")} requiredLabel="Weekly" onSubscribe={() => { setShowNotifPanel(false); setTab("subscribe"); }} minHeight={140}>
                {notifications.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.muted, paddingTop: 8 }}>Nothing yet. You'll only be notified for strong setups and trade updates — not every tick.</div>
                ) : (() => {
                  const nowDate = new Date();
                  const todayStr = nowDate.toDateString();
                  const yestStr = new Date(nowDate - 86400000).toDateString();
                  const getGroup = (n) => {
                    const d = new Date(n.created_at || Date.now()).toDateString();
                    if (d === todayStr) return "Today";
                    if (d === yestStr) return "Yesterday";
                    return "Earlier";
                  };
                  const groups = ["Today", "Yesterday", "Earlier"].map(label => ({
                    label, items: notifications.filter(n => getGroup(n) === label)
                  })).filter(g => g.items.length > 0);
                  const allUngrouped = groups.length === 0;
                  const list = allUngrouped ? [{ label: null, items: notifications }] : groups;
                  return list.map(group => (
                    <div key={group.label || "all"}>
                      {group.label && <div style={{ fontSize: 10, color: T.muted, fontFamily: FONT_HEAD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "12px 0 6px" }}>{group.label}</div>}
                      {group.items.map((n) => {
                        const market = isMarketNotification(n);
                        return (
                        <div key={n.id} style={{ borderBottom: `1px solid ${T.cardBorder}`, padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                          {market && <MarketNotifAvatar n={n} size={40} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.gold, flexShrink: 0 }} />}
                              <div style={{ fontSize: 13, fontWeight: 700, color: T.paper, lineHeight: 1.35 }}>{n.title}</div>
                            </div>
                            <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2, fontWeight: 500, lineHeight: 1.45 }}>{n.body}</div>
                            <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{notifTimeAgo(n)}</div>
                          </div>
                          <button onClick={() => setNotifToDelete(n)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: "2px 4px", flexShrink: 0, alignSelf: "flex-start" }}><X size={13} /></button>
                        </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </BlurGate>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification delete confirmation modal ── */}
      {notifToDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }} onClick={() => setNotifToDelete(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:20, padding:24, maxWidth:360, width:"100%" }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper, marginBottom:10 }}>Delete notification?</div>
            <div style={{ fontSize:12.5, color:T.muted, lineHeight:1.7, marginBottom:20 }}>
              This notification will be permanently removed from your list. You won't be able to recover it after deleting.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setNotifToDelete(null)} style={{ flex:1, background:"none", border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper, cursor:"pointer" }}>Cancel</button>
              <button onClick={() => {
                const n = notifToDelete;
                setNotifToDelete(null);
                setNotifications(list => list.filter(x => x.id !== n.id));
                if (account?.id) supabase.from("user_notifications").delete().eq("id", n.id).then(() => {}, () => {});
              }} style={{ flex:1, background:"#E53935", border:"none", borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:"#fff", cursor:"pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear all notifications confirmation modal ── */}
      {showClearAllConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }} onClick={() => setShowClearAllConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:20, padding:24, maxWidth:360, width:"100%" }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper, marginBottom:10 }}>Clear all notifications?</div>
            <div style={{ fontSize:12.5, color:T.muted, lineHeight:1.7, marginBottom:20 }}>
              This will permanently remove all notifications from your list. This action cannot be undone.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowClearAllConfirm(false)} style={{ flex:1, background:"none", border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper, cursor:"pointer" }}>Cancel</button>
              <button onClick={() => {
                setShowClearAllConfirm(false);
                setNotifications([]);
                if (account?.id) supabase.from("user_notifications").delete().eq("user_id", account.id).then(() => {}, () => {});
              }} style={{ flex:1, background:"#E53935", border:"none", borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:"#fff", cursor:"pointer" }}>Clear all</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout confirmation modal ── */}
      {showLogoutConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }}>
          <div style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:20, padding:24, maxWidth:360, width:"100%" }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper, marginBottom:10 }}>Log Out of RainX?</div>
            <div style={{ fontSize:12.5, color:T.muted, lineHeight:1.8, marginBottom:20 }}>
              If you log out, you will stop receiving:<br/>
              <span style={{ color:T.paper }}>• Live trading signals &amp; Raina AI alerts</span><br/>
              <span style={{ color:T.paper }}>• TP / SL hit notifications</span><br/>
              <span style={{ color:T.paper }}>• CPI, NFP &amp; economic news updates</span><br/>
              <span style={{ color:T.paper }}>• Community mentions &amp; replies</span><br/><br/>
              You can log back in at any time.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex:1, background:"none", border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper, cursor:"pointer" }}>Cancel</button>
              <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} style={{ flex:1, background:"#E53935", border:"none", borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:"#fff", cursor:"pointer" }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {!communityProfileOpen && !spaceCoinsScreen && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", zIndex: 100, background: T.card, opacity: 1, borderTop: `1px solid ${T.cardBorder}`, boxShadow: "0 -8px 24px rgba(0,0,0,0.12)", display: "flex", justifyContent: "space-around", padding: "6px 0 calc(20px + env(safe-area-inset-bottom))", "--rx-logo-bg": isDark ? "#000" : "#fff" }}>
          {[
            { key: "home", label: "Home", icon: (active) => (
               <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "url(#rxNavGold)" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fillRule="evenodd">
                {/* House silhouette + door cutout so the door stays empty when filled */}
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z M9 21V12h6v9z"/>
              </svg>
            )},
            { key: "wallet", label: "Wallet", icon: (active) => (
              <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "url(#rxNavGold)" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12.5A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19H6a2.5 2.5 0 0 1-2.5-2.5z"/>
                <path d="M3.5 8h14.5a3 3 0 0 1 3 3v1.5h-5.5a2 2 0 0 0 0 4H21"/>
                <circle cx="16.5" cy="14.5" r="0.9" fill="currentColor"/>
              </svg>
            )},
            { key: "space-coins", center: true },
            { key: "community", label: "Community", icon: (active) => (
              <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "url(#rxNavGold)" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="3"/>
                <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                <circle cx="18" cy="8" r="2.2"/>
                <path d="M21 21v-1.5a3 3 0 0 0-2.2-2.9"/>
              </svg>
            )},
            { key: "more", label: "More", icon: (active) => (
              <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "url(#rxNavGold)" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="6" height="6" rx="1.2"/>
                <rect x="14" y="4" width="6" height="6" rx="1.2"/>
                <rect x="4" y="14" width="6" height="6" rx="1.2"/>
                <rect x="14" y="14" width="6" height="6" rx="1.2"/>
              </svg>
            )},
          ].map(({ key, label, icon, center }) => {
            // "More" only highlights on its landing menu (morePage === null).
            // Inside a More sub-page (profile/security/wallet/settings) nothing highlights.
            const insideMoreSub = tab === "more" && morePage;
            const active = !profileFromHeader && !insideMoreSub && tab === key;
            return (
              center ? (
                <CenterNavLogo
                  key={key}
                  active={active}
                  onActivate={() => { setProfileFromHeader(false); setSpaceCoinsScreen("intro"); }}
                />
              ) : (
                <button key={key} onClick={() => { if (key === "more") setMorePage(null); setProfileFromHeader(false); goTab(key); }} style={{ position: "relative", background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? T.gold : T.muted, cursor: "pointer", minWidth: 52, padding: "4px 2px", transition: "color 0.15s" }}>
                  {/* Shared deep-gold gradient used to fill active nav icons (fills the icon shape, not a box) */}
                  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
                    <defs>
                      <linearGradient id="rxNavGold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F4D35E"/>
                        <stop offset="50%" stopColor="#F4D35E"/>
                        <stop offset="100%" stopColor="#F4D35E"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  {icon(active)}
                  {navBadges[key] && <span className="rx-nav-badge">{navBadges[key]}</span>}
                  <span style={{ fontSize: 11, fontFamily: FONT_HEAD, fontWeight: active ? 700 : 500, letterSpacing: 0.1, color: active ? T.gold : T.muted }}>{label}</span>
                </button>
              )
            );
          })}
        </div>
      )}
      {spaceCoinsScreen === "intro" && (
        <SpaceCoinsIntro
          T={T}
          onExplore={() => {
            setSpaceCoinsScreen("dashboard");
            routeWrite("space-coins", "dashboard", null);
          }}
          onBack={() => {
            setSpaceCoinsScreen(null);
            setTab("home");
            routeWrite("home", null, null);
          }}
        />
      )}
      {spaceCoinsScreen === "dashboard" && (
        <SpaceCoinsDashboard
          T={T}
          onBack={() => {
            setSpaceCoinsScreen("intro");
            routeWrite("space-coins", "intro", null);
          }}
        />
      )}
      </div>
    </PullToRefresh>
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

      // Price range — use ONLY candle prices so SL/TP never compresses the candle area
      const allP = vis.flatMap(c => [c.high, c.low]);
      const rawMin = Math.min(...allP), rawMax = Math.max(...allP);
      // Taller candles: use 8% margin so candles fill the chart area
      const mg  = (rawMax - rawMin) * 0.08;
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
      const GOLD  = T.gold || "#F4D35E";

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
        ctx.fillStyle = "rgba(244,211,94,0.09)";
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

      // ── SL / TP labeled lines (always drawn, clipped to chart area) ──────
      overlays.forEach(o => {
        const drawHLine = (price, color, lbl) => {
          const rawY = pad.top + cH - ((price - minP) / pR) * cH;
          // Clamp to chart area with a small label band
          const y = Math.max(pad.top + 8, Math.min(H - pad.bottom - 8, rawY));
          const isClipped = rawY < pad.top + 8 || rawY > H - pad.bottom - 8;
          ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
          ctx.setLineDash(isClipped ? [2, 2] : [5, 3]);
          ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
          ctx.setLineDash([]);
          if (fits(y, 18)) {
            ctx.fillStyle = color;
            roundRect(ctx, W - pad.right + 2, y - 9, pad.right - 3, 18, 3); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 6.5px sans-serif"; ctx.textAlign = "center";
            ctx.fillText(lbl + " " + price.toFixed(Math.min(inst.digits || 2, 2)), W - pad.right / 2, y + 3);
            ctx.textAlign = "left"; grab(y, 18);
          }
        };
        if (o.type === "sl_level" && o.price) drawHLine(o.price, "#ef4444", "SL");
        if (o.type === "tp_level" && o.price) drawHLine(o.price, "#22c55e", "TP");
        if (o.type === "entry_zone" && o.priceLow) drawHLine(o.priceLow, GOLD, "Entry");
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
// Add Market bottom sheet — supports add, replace when full, and manage active
// ─────────────────────────────────────────────────────────────────────────────
function AddMarketSheet({ onClose, onSelect, activeSessions = [], activeMarkets = [], maxActiveMarkets = 3, onRemoveMarket }) {
  const [category, setCategory] = useState(null);
  // mode: null = category grid | "manage" = replace/delete active | "pick_replacement" = pick who to replace
  const [mode, setMode] = useState(null);
  const [managedAsset, setManagedAsset] = useState(null);   // asset being managed or new asset wanting a slot
  const atLimit = activeMarkets.length >= maxActiveMarkets;

  // ── Manage already-active market: Replace or Delete ─────────────────────
  if (mode === "manage" && managedAsset) {
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:500, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background:T.ink, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 40px" }}>
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div style={{ width:36, height:4, borderRadius:2, background:T.cardBorder }} /></div>
          <div style={{ padding:"0 20px 20px" }}>
            <button onClick={() => { setMode(null); setManagedAsset(null); }} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"flex", alignItems:"center", gap:4, marginBottom:14, padding:0 }}>
              <ChevronLeft size={16} /><span style={{ fontFamily:FONT_HEAD, fontSize:12, fontWeight:700 }}>Back</span>
            </button>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper, marginBottom:3 }}>{managedAsset.symbol}</div>
            <div style={{ fontSize:12, color:T.muted, marginBottom:22 }}>{managedAsset.name} · Currently active</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={() => { setMode("pick_category_for_replace"); setCategory(null); }} style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:"16px", textAlign:"left", cursor:"pointer" }}>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>Replace with another market</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>Swap {managedAsset.symbol} with a different market</div>
              </button>
              <button onClick={() => { onRemoveMarket(managedAsset.symbol); onClose(); }} style={{ background:`${T.rust}12`, border:`1px solid ${T.rust}44`, borderRadius:12, padding:"16px", textAlign:"left", cursor:"pointer" }}>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.rust }}>Remove market</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>Stop analyzing {managedAsset.symbol}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pick new replacement market (category → asset) ───────────────────────
  if (mode === "pick_category_for_replace" || mode === "pick_new_when_full") {
    const backMode = mode;
    if (!category) {
      return (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:500, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.ink, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 32px", maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div style={{ width:36, height:4, borderRadius:2, background:T.cardBorder }} /></div>
            <div style={{ padding:"0 20px 16px", display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={() => { setMode(backMode === "pick_category_for_replace" ? "manage" : null); }} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><ChevronLeft size={20} /></button>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper }}>
                  {backMode === "pick_category_for_replace" ? `Replace ${managedAsset?.symbol}` : "Select replacement market"}
                </div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>Choose a category</div>
              </div>
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
          </div>
        </div>
      );
    }
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:500, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background:T.ink, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 32px", maxHeight:"85vh", overflowY:"auto" }}>
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div style={{ width:36, height:4, borderRadius:2, background:T.cardBorder }} /></div>
          <div style={{ padding:"0 20px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => setCategory(null)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><ChevronLeft size={20} /></button>
            <div>
              <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper }}>{category.label}</div>
              <div style={{ fontSize:12, color:T.muted }}>
                {backMode === "pick_category_for_replace" ? `Replacing ${managedAsset?.symbol}` : "Pick market to add"}
              </div>
            </div>
          </div>
          <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:8 }}>
            {category.assets.map(asset => {
              const alreadyActive = activeMarkets.includes(asset.symbol);
              const isSelf = asset.symbol === managedAsset?.symbol;
              if (isSelf) return null;
              return (
                <button key={asset.symbol} disabled={alreadyActive} onClick={() => {
                  if (backMode === "pick_category_for_replace") {
                    onRemoveMarket(managedAsset.symbol);
                    onSelect(asset);
                  } else {
                    // pick_new_when_full: need to pick which to remove
                    setManagedAsset(asset); // new asset wanting a slot
                    setMode("pick_who_to_replace");
                    setCategory(null);
                  }
                }} style={{ background:T.card, border:`1px solid ${alreadyActive ? T.gold : T.cardBorder}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:alreadyActive ? "default" : "pointer", opacity:alreadyActive ? 0.45 : 1 }}>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>{asset.symbol}</div>
                    <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{asset.name}</div>
                  </div>
                  {alreadyActive
                    ? <div style={{ fontSize:10, color:T.gold, fontFamily:FONT_HEAD, fontWeight:700, background:`${T.gold}22`, borderRadius:6, padding:"3px 8px" }}>Active</div>
                    : <ChevronRight size={16} color={T.muted} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Pick which active market to evict (when 3 are full and user wants a 4th) ─
  if (mode === "pick_who_to_replace" && managedAsset) {
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:500, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background:T.ink, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 40px" }}>
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div style={{ width:36, height:4, borderRadius:2, background:T.cardBorder }} /></div>
          <div style={{ padding:"0 20px 20px" }}>
            <button onClick={() => setMode("pick_new_when_full")} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"flex", alignItems:"center", gap:4, marginBottom:14, padding:0 }}>
              <ChevronLeft size={16} /><span style={{ fontFamily:FONT_HEAD, fontSize:12, fontWeight:700 }}>Back</span>
            </button>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper, marginBottom:3 }}>Replace a Market</div>
            <div style={{ fontSize:12, color:T.muted, marginBottom:18 }}>Choose which market to replace with <strong style={{ color:T.paper }}>{managedAsset.symbol}</strong></div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {activeMarkets.map(sym => {
                const a = ALL_ASSETS.find(x => x.symbol === sym);
                if (!a) return null;
                return (
                  <button key={sym} onClick={() => { onRemoveMarket(sym); onSelect(managedAsset); }} style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>{a.symbol}</div>
                      <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{a.name}</div>
                    </div>
                    <div style={{ fontSize:10, color:T.rust, fontFamily:FONT_HEAD, fontWeight:700, background:`${T.rust}22`, borderRadius:6, padding:"3px 8px" }}>Replace</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default: category grid + asset list ─────────────────────────────────
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:500, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.ink, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 32px", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:T.cardBorder }} />
        </div>
        {!category ? (
          <>
            <div style={{ padding:"0 20px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper }}>Add Market</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>Choose a market · {activeMarkets.length}/{maxActiveMarkets} active</div>
              </div>
              <button onClick={onClose} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><X size={20} /></button>
            </div>
            {atLimit && (
              <div style={{ margin:"0 16px 14px", background:`${T.gold}11`, border:`1px solid ${T.gold}44`, borderRadius:10, padding:"10px 14px", fontSize:12, color:T.gold, fontFamily:FONT_HEAD, fontWeight:600 }}>
                3 markets active. Tap an active market below to replace or remove it.
              </div>
            )}
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
              {category.assets.map(asset => {
                const alreadyActive = activeMarkets.includes(asset.symbol);
                return (
                  <button key={asset.symbol} onClick={() => {
                    if (alreadyActive) {
                      setManagedAsset(asset);
                      setMode("manage");
                    } else if (atLimit) {
                      setManagedAsset(asset);
                      setMode("pick_who_to_replace");
                    } else {
                      onSelect(asset);
                    }
                  }} style={{ background:T.card, border:`1px solid ${alreadyActive ? T.gold : T.cardBorder}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>{asset.symbol}</div>
                      <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{asset.name}</div>
                    </div>
                    {alreadyActive
                      ? <div style={{ fontSize:10, color:T.gold, fontFamily:FONT_HEAD, fontWeight:700, background:`${T.gold}22`, borderRadius:6, padding:"3px 8px" }}>Active ›</div>
                      : (atLimit
                        ? <div style={{ fontSize:10, color:T.muted, fontFamily:FONT_HEAD, fontWeight:600, background:`${T.cardBorder}`, borderRadius:6, padding:"3px 8px" }}>Replace</div>
                        : <ChevronRight size={16} color={T.muted} />)}
                  </button>
                );
              })}
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
// DurationPicker retained for reference but no longer shown in the UI.
// Raina AI analyzes continuously — users do not select an analysis duration.
function DurationPicker({ asset, onSelect, onClose }) {
  return (
    <div style={{ display:"none" }}>
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
function GamesTab() {
  return null;
  /*
  const [activeCategory, setActiveCategory] = React.useState("All Games");
  const [activeRainaState, setActiveRainaState] = React.useState(0);
  const [pageReady, setPageReady] = React.useState(false);
  const categories = ["All Games", "Trending", "Strategy", "Duel", "Quick Play"];
  const games = [
    { title: "MoonJet", subtitle: "Fly high. Aim higher.", image: gamesMoonJet },
    { title: "Trader Duel", subtitle: "Battle traders in real-time", image: gamesTraderDuel },
    { title: "Bull vs Bear", subtitle: "Who controls the market?", image: gamesBullBear },
    { title: "Golden Vault", subtitle: "The richest vault in crypto", image: gamesGoldenVault },
    { title: "Raina AI Challenge", subtitle: "Can you outsmart the AI?", image: gamesRainaAI, wide: true },
  ];
  const players = [
    { name: "TradeMaster", avatar: gamesAvatar1, score: "214,500", trend: "up" },
    { name: "KwameX", avatar: gamesAvatar2, score: "189,200", trend: "up", isMe: true },
    { name: "LunaPlay", avatar: gamesAvatar3, score: "145,800", trend: "down" },
    { name: "Abena_G", avatar: gamesAvatar4, score: "112,400", trend: "up" },
  ];
  const rainaStates = ["Analyzing market...", "Calculating odds...", "Ready to play"];
  const visibleGames = games;

  React.useEffect(() => {
    const readyTimer = setTimeout(() => setPageReady(true), 40);
    const interval = setInterval(() => setActiveRainaState(prev => (prev + 1) % rainaStates.length), 2500);
    return () => { clearTimeout(readyTimer); clearInterval(interval); };
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", color: "#F2EDE0", fontFamily: FONT_BODY, overflow: "hidden" }}>
      <style>{`
        @keyframes games-fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes games-fade-in { from { opacity:0; } to { opacity:1; } }
        @keyframes games-scale-in { from { opacity:0; transform:scale(.82); } to { opacity:1; transform:scale(1); } }
        @keyframes games-pulse-ring {
          0% { transform:scale(.95); box-shadow:0 0 0 0 rgba(244,211,94,.7); }
          70% { transform:scale(1); box-shadow:0 0 0 10px rgba(244,211,94,0); }
          100% { transform:scale(.95); box-shadow:0 0 0 0 rgba(244,211,94,0); }
        }
        @keyframes games-shimmer { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .games-reveal { opacity:0; animation:games-fade-up .6s ease-out forwards; }
        .games-fade { opacity:0; animation:games-fade-in .7s ease-out forwards; }
        .games-scroll-hide::-webkit-scrollbar { display:none; }
        .games-scroll-hide { scrollbar-width:none; -ms-overflow-style:none; }
      `}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(5,5,5,.82)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(244,211,94,.2)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: T.gold, fontSize: 20 }}>✦</span>
          <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 18, color: "#F2EDE0" }}>RainX</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "#1C1913", border: `1px solid ${T.cardBorder}`, boxShadow: `0 0 15px ${T.gold}33` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#F2EDE0" }}>GHS 4,320.00</span>
          <span style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: `${T.gold}22`, color: T.goldBright, fontSize: 16, lineHeight: 1 }}>+</span>
        </div>
      </header>

      <section style={{ position: "relative", height: 400, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 20px 30px", overflow: "hidden", borderRadius: "0 0 32px 32px" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to top, #050505, rgba(5,5,5,.45) 58%, rgba(5,5,5,.3))" }} />
          <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to bottom, rgba(5,5,5,.45), transparent 35%)" }} />
          <img src={gamesHeroRocket} alt="Gold rocket launching" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
          <div style={{ position: "absolute", inset: 0, zIndex: 2, opacity: .25, background: "radial-gradient(circle at 50% 50%, rgba(244,211,94,.15), transparent 45%)", animation: "games-shimmer 15s linear infinite" }} />
        </div>
        <div className={pageReady ? "games-fade" : ""} style={{ position: "relative", zIndex: 3, textAlign: "center" }}>
          <h1 style={{ fontFamily: FONT_HEAD, fontSize: 38, lineHeight: 1.05, fontWeight: 800, color: "#F2EDE0", margin: "0 0 8px", textShadow: `0 0 14px ${T.gold}66` }}>Play Smart.<br />Win More.</h1>
          <p style={{ color: `${T.goldBright}CC`, fontSize: 13, fontWeight: 600, margin: "0 auto 22px", maxWidth: 280 }}>The premium gaming platform for serious players</p>
          <button onClick={() => document.getElementById("games-trending")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ border: "none", borderRadius: 999, padding: "14px 28px", background: T.goldGradient, color: "#050505", fontFamily: FONT_HEAD, fontSize: 12, fontWeight: 800, letterSpacing: 1, cursor: "pointer", boxShadow: `0 0 24px ${T.gold}55` }}>
            Enter Games <span style={{ marginLeft: 6 }}>▶</span>
          </button>
        </div>
      </section>

      <div className="games-scroll-hide" style={{ width: "100%", padding: "20px 16px 8px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
          {categories.map(category => {
            const active = activeCategory === category;
            return (
              <button key={category} onClick={() => setActiveCategory(category)} style={{ position: "relative", border: active ? "none" : `1px solid ${T.cardBorder}`, borderRadius: 999, padding: "8px 16px", background: active ? T.gold : "#1C1913", color: active ? "#050505" : "#9C947F", fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .25s", boxShadow: active ? `0 0 15px ${T.gold}55` : "none" }}>
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <section className="games-reveal" style={{ animationDelay: ".15s", padding: "12px 16px 4px" }}>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 18, color: "#F2EDE0", marginBottom: 12 }}>Featured</div>
        <div style={{ position: "relative", height: 200, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.cardBorder}`, cursor: "pointer" }}>
          <img src={gamesMoonJet} alt="MoonJet" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .7s" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,5,.94), rgba(5,5,5,.25) 65%, transparent)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-start", padding: 18 }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 28, color: "#fff" }}>MoonJet</div>
            <div style={{ color: T.goldBright, fontSize: 12, fontWeight: 600, margin: "3px 0 14px" }}>Fly high. Aim higher.</div>
            <button style={{ border: "none", borderRadius: 999, padding: "9px 18px", background: T.gold, color: "#050505", fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Play Now</button>
          </div>
        </div>
      </section>

      <section id="games-trending" style={{ padding: "18px 16px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 18, color: "#F2EDE0" }}>Trending Games</div>
          <span style={{ color: T.muted, fontSize: 11 }}>{visibleGames.length} games</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {visibleGames.map((game, index) => (
            <div key={game.title} className="games-reveal" style={{ animationDelay: `${.2 + index * .1}s`, position: "relative", gridColumn: game.wide ? "span 2" : undefined, aspectRatio: game.wide ? "2.5 / 1" : "4 / 5", borderRadius: 14, overflow: "hidden", border: `1px solid ${T.cardBorder}`, background: "#1C1913", cursor: "pointer", transition: "transform .25s, box-shadow .25s" }}>
              <img src={game.image} alt={game.title} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform .7s" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,5,.94), rgba(5,5,5,.1) 70%)" }} />
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: game.wide ? 16 : 13, color: "#fff" }}>{game.title}</div>
                <div style={{ color: `${T.goldBright}B3`, fontSize: 10, marginTop: 3 }}>{game.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ position: "relative", marginTop: 24, padding: "48px 20px 42px", borderTop: `1px solid ${T.gold}22`, borderBottom: `1px solid ${T.gold}22`, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundColor: "#0A0A0A", opacity: .94 }} />
        <div style={{ position: "absolute", inset: 0, opacity: .1, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23C9A84C'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E)" }} />
        <div style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: `${T.gold}18`, filter: "blur(80px)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="games-reveal" style={{ animationDelay: ".1s", textAlign: "center", marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
              <BrainCircuit size={20} color={T.gold} />
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 24, color: T.gold, textShadow: `0 0 10px ${T.gold}88` }}>Meet Raina AI</div>
            </div>
            <div style={{ color: T.muted, fontSize: 13 }}>Your smartest opponent yet</div>
          </div>
          <div className="games-reveal" style={{ animationDelay: ".25s", position: "relative", marginBottom: 30 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", animation: "games-pulse-ring 2s infinite" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", animation: "games-pulse-ring 2s infinite", animationDelay: "1s" }} />
            <div style={{ position: "relative", width: 132, height: 132, padding: 4, borderRadius: "50%", border: `2px solid ${T.gold}80`, background: "#0A0A0A", boxShadow: `0 0 30px ${T.gold}4D`, overflow: "hidden" }}>
              <img src={gamesRainaAI} alt="Raina AI" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            </div>
            <div style={{ position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "#1C1913", border: `1px solid ${T.gold}4D`, boxShadow: "0 4px 12px rgba(0,0,0,.5)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.gold, animation: "pulse 1.5s infinite" }} />
              <span style={{ color: "#F2EDE0", fontSize: 10, fontWeight: 600 }}>{rainaStates[activeRainaState]}</span>
            </div>
          </div>
          <div className="games-reveal" style={{ animationDelay: ".4s", position: "relative", maxWidth: 280, marginBottom: 22, padding: 16, borderRadius: 18, background: "rgba(28,25,19,.82)", border: `1px solid ${T.cardBorder}`, backdropFilter: "blur(8px)" }}>
            <div style={{ position: "absolute", top: -8, left: "50%", width: 16, height: 16, background: "#1C1913", borderTop: `1px solid ${T.cardBorder}`, borderLeft: `1px solid ${T.cardBorder}`, transform: "translateX(-50%) rotate(45deg)" }} />
            <div style={{ position: "relative", color: "#F2EDE0", textAlign: "center", fontSize: 14, lineHeight: 1.45, fontWeight: 600, fontStyle: "italic" }}>"I've studied 2.4M trades. Your move, human."</div>
          </div>
          <div className="games-reveal" style={{ animationDelay: ".55s", width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: 12, borderRadius: 12, background: "rgba(15,14,11,.55)", border: `1px solid ${T.cardBorder}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: T.muted, fontSize: 12, fontWeight: 700 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Cpu size={13} /> Win Rate</span>
                <span style={{ color: T.goldBright }}>68.4%</span>
              </div>
              <div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: "#332C1F" }}><div style={{ height: "100%", width: pageReady ? "68.4%" : "0%", background: T.gold, transition: "width 1.5s .8s ease-out" }} /></div>
            </div>
            <button style={{ width: "100%", padding: "14px 20px", borderRadius: 12, background: "#1C1913", border: `1px solid ${T.gold}80`, color: T.goldBright, fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: `0 0 15px ${T.gold}26` }}>Challenge Raina</button>
          </div>
        </div>
      </section>

      <section style={{ padding: "28px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 20, color: "#F2EDE0" }}>Live Leaderboard</div>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E05252", animation: "pulse 1.5s infinite" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {players.map((player, index) => {
            const rank = index + 1;
            return (
              <div key={player.name} className="games-reveal" style={{ animationDelay: `${.1 + index * .1}s`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 16, border: `1px solid ${player.isMe ? `${T.gold}4D` : T.cardBorder}`, background: player.isMe ? `${T.gold}0D` : "#1C1913" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: rank === 1 ? T.gold : "#1C1913", border: rank > 1 ? `1px solid ${T.cardBorder}` : "none", color: rank === 1 ? "#050505" : T.muted, fontSize: 12, fontWeight: 800 }}>{rank}</div>
                  <img src={player.avatar} alt={player.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `1px solid ${T.cardBorder}` }} />
                  <div><div style={{ color: "#F2EDE0", fontSize: 13, fontWeight: 700 }}>{player.name}{player.isMe && <span style={{ marginLeft: 6, padding: "2px 5px", borderRadius: 4, background: T.gold, color: "#050505", fontSize: 8, fontWeight: 800 }}>YOU</span>}</div><div style={{ color: T.muted, fontSize: 10, marginTop: 3 }}>Level {25 - rank * 2}</div></div>
                </div>
                <div style={{ textAlign: "right" }}><div style={{ color: T.goldBright, fontFamily: "monospace", fontSize: 12, fontWeight: 800 }}><span style={{ color: T.muted, fontSize: 9, marginRight: 4 }}>GHS</span>{player.score}</div><div style={{ color: player.trend === "up" ? "#34D399" : "#F87171", fontSize: 10, marginTop: 4, fontWeight: 700 }}>{player.trend === "up" ? "↗ +2.4%" : "↘ -1.2%"}</div></div>
              </div>
            );
          })}
        </div>
        <button style={{ width: "100%", marginTop: 16, padding: 12, border: "none", background: "none", color: T.gold, fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>View Full Rankings <ChevronRight size={15} style={{ verticalAlign: "middle" }} /></button>
      </section>
    </div>
  );
}
*/
}

// Homepage is maintained in ./HomeTab.jsx. Keep a single source of truth so the legacy inline HomeTab cannot reappear.
function Row({ label, value, color }) {
  return <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0" }}><span style={{ color:T.muted, fontWeight:500 }}>{label}</span><span style={{ color:color||T.paper, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{value}</span></div>;
}


// ---------- Mini sparkline (Binance-style) ----------
function MiniSparkline({ data = [], width = 72, height = 30 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const prices = data.map(d => d.price).filter(p => isFinite(p));
  if (prices.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || max * 0.001 || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? "#1D6FE8" : "#B0604A";
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Markets tab ----------
function MarketsTab({ seriesMap, signalsMap, activeSymbol, onSelect, themeMode }) {
  const [fullChartInst, setFullChartInst] = useState(null);
  const [marketCandles, setMarketCandles] = useState({});

  // Markets previews use the same broker candle feed as Home and Full Chart.
  // Do not render the seeded tick series here: it can drift from the real OHLC.
  // Poll every 10s — was fetching once on mount only ([] deps), so these
  // mini charts never updated after first load and looked permanently static.
  useEffect(() => {
    let cancelled = false;
    const loadAll = () => {
      Promise.all(INSTRUMENTS.map(async (inst) => {
        try {
          const res = await fetch(`/api/candles?symbol=${encodeURIComponent(inst.symbol)}&interval=15m&limit=24`);
          if (!res.ok) return null;
          const data = await res.json();
          const values = (data.values || []).slice().reverse().map(c => ({
            t: new Date(c.datetime || c.time || 0).getTime(),
            open: +c.open, high: +c.high, low: +c.low, close: +c.close,
          })).filter(c => c.t > 0 && isFinite(c.open));
          return [inst.symbol, values];
        } catch {
          return null;
        }
      })).then(entries => {
        if (cancelled) return;
        setMarketCandles(Object.fromEntries(entries.filter(Boolean)));
      });
    };
    loadAll();
    const id = setInterval(loadAll, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      {/* Full-screen chart overlay for a specific instrument */}
      {fullChartInst && (
        <FullChartErrorBoundary onClose={() => setFullChartInst(null)}>
          <FullChartView
            inst={fullChartInst}
            session={null}
            signalsMap={signalsMap}
            themeMode={themeMode || "dark"}
            onClose={() => setFullChartInst(null)}
          />
        </FullChartErrorBoundary>
      )}
      <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: T.paper, fontWeight: 800, marginBottom: 12 }}>Market</div>
      {INSTRUMENTS.map((i) => {
        const arr = seriesMap[i.symbol] || [];
        const price = arr.length ? arr[arr.length - 1].price : 0;
        const prevPrice = arr.length > 1 ? arr[0].price : price;
        const changePct = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
        const isUp = changePct >= 0;
        const open = isMarketOpen(i.cls);
        const combo = signalsMap[i.symbol] || {};
        return (
          <div key={i.symbol} style={{ background: T.card, border: `1px solid ${i.symbol === activeSymbol ? "#F4D35E" : T.cardBorder}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, color: T.paper, boxShadow: i.symbol === activeSymbol ? "0 0 0 1px #F4D35E, 0 0 12px rgba(244,211,94,0.25)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Left: name + symbol + signals — tap to go to home */}
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onSelect(i.symbol)}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.paper }}>{i.name}</div>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>{i.symbol}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  {TIMEFRAMES.map((tf) => {
                    const sig = combo[tf.key];
                    if (!sig || sig.bias === "hold" || sig.status !== "active") return null;
                    return (
                      <div key={tf.key} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: T.muted }}>
                        <span>{tf.label}:</span><BiasChip bias={sig.bias} />
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Center: same lightweight-charts renderer as Home */}
              <div style={{ flexShrink: 0, width: 88, height: 42, overflow: "hidden", pointerEvents: "none", borderRadius: 6, background: T.card }}>
                <LightweightChart
                  candles={marketCandles[i.symbol] || []}
                  inst={i}
                  containerHeight={42}
                  compact
                  isDark={T.ink === "#0F0E0B"}
                  bgColor={T.card}
                />
              </div>
              {/* Right: price, change, status, full chart button */}
              <div style={{ textAlign: "right", flexShrink: 0, minWidth: 80 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: T.paper }}>{price ? price.toFixed(Math.min(i.digits, 5)) : "—"}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: isUp ? T.sage : T.rust }}>
                  {isUp ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                </div>
                <div style={{ fontSize: 10, color: open ? T.sage : T.rust, fontWeight: 500, marginTop: 1 }}>{open ? "Open" : "Closed"}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFullChartInst(i); }}
                  style={{ marginTop: 5, background: "transparent", border: `1px solid ${T.paper}55`, borderRadius: 6, padding: "3px 9px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 9.5, color: T.paper, cursor: "pointer" }}
                >
                  Full Chart ↗
                </button>
              </div>
            </div>
          </div>
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
      <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: T.paper, fontWeight: 800, marginBottom: 12 }}>Trade History</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["Closed trades", rows.length], ["Wins", wins], ["Losses", losses], ["Net points", netPoints]].map(([l, v]) => (
          <div key={l} style={{ flex: 1, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 8, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: T.muted }}>{l}</div>
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
    // Frontend for the existing Raina AI scalping engine (Python/FastAPI on Railway). No engine logic duplicated.
    // No signal-generation, lot-sizing, or trade-execution logic lives here.
    // User identity: stable integer derived from Supabase UUID used as telegram_id.
    function webUserId(supabaseId) {
    const hex = (supabaseId || "").replace(/-/g, "").slice(0, 9);
    return Math.abs(parseInt(hex, 16) % 1_000_000_000) || 1;
    }

const SCALP_SYMBOLS = [
  { group: "Forex",       symbols: ["EURUSD","GBPUSD","USDJPY","XAUUSD","USDCHF","AUDUSD","USDCAD","NZDUSD"] },
  { group: "Crypto",      symbols: ["BTCUSDT","ETHUSDT","DOGEUSD","SOLUSD","XRPUSDT"] },
  { group: "Commodities", symbols: ["USOIL","SILVER","COPPER"] },
];
    function ScalpingTab({ account, entitlement, onSubscribe }) {
      const unlocked = hasAccess(entitlement.tier, "weekly");

      const [mt5, setMt5] = useState(null);
      const [rSettings, setRSettings] = useState(null);
      // Initialize phase synchronously from localStorage so the UI never blocks on a network call
      const [phase, setPhase] = useState(() => lsGet("rainx-mt5-uid") ? "loading" : "setup");
      const [apiKey, setApiKey] = useState(null);
      const [mode, setMode] = useState("demo");
      const [scalpMode, setScalpMode] = useState("smart");
      const [signals, setSignals] = useState([]);
      const [holdSignal, setHoldSignal] = useState(null); // HOLD state: market not ready
      const [trades, setTrades] = useState([]);
      const [perf, setPerf] = useState(null);
      const [busy, setBusy] = useState(false);
      const [balanceSyncing, setBalanceSyncing] = useState(false);
      const [err, setErr] = useState("");
      const [saved, setSaved] = useState(false);
      const [showKey, setShowKey] = useState(false);
      const [sigLoading, setSigLoading] = useState(false);
      const [smartAlert, setSmartAlert] = useState(null);
      const [riskOpen, setRiskOpen] = useState(false);
      const [localS, setLocalS] = useState({ risk_percent: 1.0, max_open_trades: 3, min_confidence: 70.0, daily_loss_limit: 5.0 });
      const [connectMethod, setConnectMethod] = useState("metaapi");
      const [mt5Login, setMt5Login] = useState("");
      const [mt5Password, setMt5Password] = useState("");
      const [mt5Server, setMt5Server] = useState("");
      const [mt5UserId, setMt5UserId] = useState(() => lsGet("rainx-mt5-uid") || "");
      const [selectedSymbol, setSelectedSymbol] = useState(() => lsGet("rainx-scalp-sym") || "XAUUSD");
      const [symbolSearch, setSymbolSearch] = useState("");
      const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
      const [pendingScalpMode, setPendingScalpMode] = useState(null);
      const lastFiredSignalRef = useRef("");
      const lastSmartSignalRef = useRef("");

      const signalConfidence = (sig) => Math.round(Number(sig?.confidence) || 0);
      const signalKey = (sig) => [sig?.asset, sig?.direction, sig?.confidence, sig?.entry_zone?.[0], sig?.stop_loss, sig?.take_profit?.[0]].join("|");
      const money = (value) => {
        const number = Number(value) || 0;
        return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      const price = (value) => {
        if (value == null || value === "") return "—";
        const number = Number(value);
        if (!Number.isFinite(number)) return String(value);
        return number >= 100 ? number.toFixed(2) : number.toFixed(5);
      };
      const getTopSignal = (items) => items.reduce((top, item) => signalConfidence(item) > signalConfidence(top) ? item : top, null);

      const loadTrades = useCallback(async (uid) => {
        const id = uid || mt5UserId;
        if (!id) return;
        try {
          const r = await fetch(`/api/mt5/trades/${id}`);
          if (r.ok) {
            const d = await r.json();
            setTrades(Array.isArray(d) ? d : (d.trades || []));
          }
        } catch {}
      }, [mt5UserId]);

      const loadPerf = useCallback(async (uid) => {
        const id = uid || mt5UserId;
        if (!id) return;
        try {
          const r = await fetch(`/api/mt5/performance/${id}`);
          if (r.ok) setPerf(await r.json());
        } catch {}
      }, [mt5UserId]);

      const loadSignals = useCallback(async (sym) => {
        const target = sym || selectedSymbol;
        if (!target) return;
        setSigLoading(true);
        try {
          // Quick Scalp uses the velocity/momentum endpoint — always returns BUY or SELL.
          // Smart Scalp uses the setup-based endpoint — may return HOLD.
          const url = scalpMode === "quick"
            ? `/api/signals/quick/${target}`
            : `/api/signals/scalp/${target}?timeframe=5m`;
          const r = await fetch(url);
          if (!r.ok) throw new Error(`Signal service returned ${r.status}`);
          const d = await r.json();
          const raw = Array.isArray(d) ? d : Array.isArray(d?.signals) ? d.signals : d?.signal ? [d.signal] : d && typeof d === "object" ? [d] : [];
          const actionable = raw
            .filter((s) => s && s.direction && s.direction !== "HOLD")
            .sort((a, b) => signalConfidence(b) - signalConfidence(a))
            .slice(0, 6);
          // Capture HOLD signal so Smart Scalp can explain why it's waiting
          const hold = raw.find((s) => s && (s.direction === "HOLD" || !s.direction));
          setSignals(actionable);
          setHoldSignal(actionable.length === 0 && scalpMode !== "quick" ? (hold || null) : null);
          setErr("");
        } catch (e) {
          setSignals([]);
          setHoldSignal(null);
          setErr(e.message || "Unable to load signals right now.");
        } finally {
          setSigLoading(false);
        }
      }, [selectedSymbol, scalpMode]);

      const handleSyncBalance = useCallback(async () => {
        if (!mt5UserId || balanceSyncing) return;
        setBalanceSyncing(true);
        try {
          await fetch(`/api/mt5/balance/refresh/${mt5UserId}`, { method: "POST" });
          // Poll every 15 s for up to 3 minutes to detect when balance arrives
          let attempts = 0;
          const poll = setInterval(async () => {
            attempts++;
            await loadAccount(mt5UserId);
            if (attempts >= 12) clearInterval(poll);
          }, 15000);
          setTimeout(() => setBalanceSyncing(false), 180000);
        } catch {
          setBalanceSyncing(false);
        }
      }, [mt5UserId, balanceSyncing]);

      const loadAccount = useCallback(async (uid) => {
        const id = uid || mt5UserId;
        if (!id) return;
        try {
          // Fetch account + settings in parallel to cut load time in half
          const [r, sr] = await Promise.all([
            fetch(`/api/mt5/account/${id}`),
            fetch(`/api/mt5/settings/${id}`),
          ]);
          if (r.status === 404) { setPhase("setup"); setMt5(null); return; }
          if (!r.ok) { setPhase("setup"); return; }
          const data = await r.json();
          const accountData = data?.account || data?.data || data;
          // Normalise balance field — MetaAPI can return it at different paths
          const balance = accountData?.balance ?? accountData?.account_balance ?? accountData?.free_margin ?? 0;
          setMt5({ ...accountData, balance });
          if (accountData?.api_key) setApiKey(accountData.api_key);
          let settings = null;
          if (sr.ok) {
            const settingsData = await sr.json();
            settings = settingsData?.settings || settingsData;
            setRSettings(settings);
            setLocalS({
              risk_percent: settings?.risk_percent ?? 1.0,
              max_open_trades: settings?.max_open_trades ?? 3,
              min_confidence: settings?.min_confidence ?? 70.0,
              daily_loss_limit: settings?.daily_loss_limit ?? 5.0,
            });
          }
          if (settings?.scalping_enabled) {
            setPhase("active");
            loadTrades(id);
            loadPerf(id);
          } else {
            setPhase("connected");
          }
        } catch {
          setPhase("setup");
        }
      }, [mt5UserId, loadTrades, loadPerf]);

      useEffect(() => {
        if (!unlocked) { setPhase("setup"); return; }
        if (!mt5UserId) { setPhase("setup"); return; }
        loadAccount();
        const accountPoll = setInterval(loadAccount, 30_000);
        return () => clearInterval(accountPoll);
      }, [unlocked, mt5UserId, loadAccount]);

      useEffect(() => {
        if (phase !== "active" || !selectedSymbol || !mt5UserId) return;
        loadSignals(selectedSymbol);
        const interval = scalpMode === "quick" ? 30_000 : 60_000;
        const signalPoll = setInterval(() => loadSignals(selectedSymbol), interval);
        return () => clearInterval(signalPoll);
      }, [phase, selectedSymbol, mt5UserId, scalpMode, loadSignals]);

      useEffect(() => {
        if (phase !== "active" || scalpMode !== "quick" || !mt5UserId) return;
        const top = getTopSignal(signals);
        if (!top || signalConfidence(top) < 50) return;
        const key = signalKey(top);
        if (!key || key === lastFiredSignalRef.current) return;
        lastFiredSignalRef.current = key;
        fetch("/api/mt5/scalping/execute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ user_id: mt5UserId, symbol: top.asset, direction: top.direction, confidence: signalConfidence(top), mode: "quick", stop_loss: top.stop_loss ?? null, take_profit: Array.isArray(top.take_profit) ? (top.take_profit[0] ?? null) : (top.take_profit ?? null) }),
        }).then(async (r) => {
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.detail || `Quick Scalp failed (${r.status})`);
          }
          loadTrades();
          loadPerf();
        }).catch((e) => {
          lastFiredSignalRef.current = "";
          setErr(e.message || "Quick Scalp could not execute the signal.");
        });
      }, [signals, phase, scalpMode, mt5UserId, loadTrades, loadPerf]);

      useEffect(() => {
        if (phase !== "active" || scalpMode !== "smart") return;
        const top = getTopSignal(signals);
        if (!top || signalConfidence(top) < 60) return;
        const key = signalKey(top);
        if (!key || key === lastSmartSignalRef.current) return;
        lastSmartSignalRef.current = key;
        setSmartAlert(top);
      }, [signals, phase, scalpMode]);

      const handleConnect = async () => {
        setBusy(true); setErr("");
        const uid = mt5Login.trim();
        if (connectMethod === "metaapi") {
          if (!uid) { setErr("MT5 login number is required"); setBusy(false); return; }
          if (!mt5Password.trim()) { setErr("MT5 password is required"); setBusy(false); return; }
          if (!mt5Server.trim()) { setErr("Broker server is required — find it in MT5 Help → About"); setBusy(false); return; }
          setMt5UserId(uid);
          lsSet("rainx-mt5-uid", uid);
          try {
            const r = await fetch("/api/mt5/connect/metaapi", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ mt5_login: uid, mt5_password: mt5Password.trim(), mt5_server: mt5Server.trim(), account_mode: mode, name: "RainX User" }),
            });
            const raw = await r.text();
            let d = {};
            try { d = JSON.parse(raw); } catch {}
            if (d.api_key) setApiKey(d.api_key);
            if (!r.ok) {
              const existing = await fetch(`/api/mt5/account/${uid}`);
              if (existing.ok) { await loadAccount(uid); setBusy(false); return; }
              throw new Error(d.detail || d.error || (raw.length < 200 ? raw : `Server error ${r.status}`));
            }
          } catch (e) {
            try {
              const existing = await fetch(`/api/mt5/account/${uid}`);
              if (existing.ok) { await loadAccount(uid); setBusy(false); return; }
            } catch {}
            setErr(e.message || "Unable to connect MT5"); setBusy(false); return;
          }
          await loadAccount(uid);
        } else {
          // EA Desktop mode — create account record, return api_key for EA installation
          try {
            const r = await fetch("/api/mt5/connect/ea", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ mt5_login: uid || "", account_mode: mode }),
            });
            if (!r.ok) throw new Error(`Error ${r.status}`);
            const d = await r.json();
            setApiKey(d.api_key);
            const resolvedUid = d.user_id || uid;
            if (resolvedUid) { setMt5UserId(resolvedUid); lsSet("rainx-mt5-uid", resolvedUid); }
            setPhase("pending");
          } catch (e) { setErr(e.message || "Unable to create EA connection"); }
        }
        setBusy(false);
      };

      const handleSaveSettings = async () => {
        setBusy(true); setErr("");
        try {
          const r = await fetch("/api/mt5/settings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ user_id: mt5UserId, ...localS, scalping_enabled: rSettings?.scalping_enabled ?? false }),
          });
          if (!r.ok) throw new Error(`Error ${r.status}`);
          setSaved(true);
          setTimeout(() => setSaved(false), 2200);
          await loadAccount();
        } catch (e) { setErr(e.message || "Unable to save settings"); }
        setBusy(false);
      };

      const handleToggle = async () => {
        setBusy(true); setErr("");
        try {
          const r = await fetch("/api/mt5/scalping/toggle", {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user_id: mt5UserId }),
          });
          if (!r.ok) throw new Error(`Error ${r.status}`);
          await loadAccount();
        } catch (e) { setErr(e.message || "Unable to update scalping"); }
        setBusy(false);
      };

      const handleExecuteSignal = async (sig) => {
        if (!sig || !mt5UserId) return;
        setBusy(true); setErr("");
        try {
          const r = await fetch("/api/mt5/scalping/execute", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ user_id: mt5UserId, symbol: sig.asset, direction: sig.direction, confidence: signalConfidence(sig), stop_loss: sig.stop_loss ?? null, take_profit: Array.isArray(sig.take_profit) ? (sig.take_profit[0] ?? null) : (sig.take_profit ?? null) }),
          });
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.detail || `Smart Scalp failed (${r.status})`);
          }
          setSmartAlert(null);
          lastSmartSignalRef.current = signalKey(sig);
          await Promise.all([loadTrades(), loadPerf()]);
        } catch (e) { setErr(e.message || "Smart Scalp could not execute the signal."); }
        setBusy(false);
      };

      const disconnect = () => {
        lsSet("rainx-mt5-uid", "");
        lsSet("rainx-scalp-sym", "");
        setMt5UserId("");
        setSelectedSymbol("");
        setMt5(null); setRSettings(null); setSignals([]); setTrades([]); setPerf(null); setSmartAlert(null); setApiKey(null);
        lastFiredSignalRef.current = "";
        lastSmartSignalRef.current = "";
        setPhase("setup");
      };

      const Disclaimer = () => (
        <div style={{ padding: "12px 14px", background: `${T.rust}15`, border: `1px solid ${T.rust}33`, borderRadius: 14, marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: T.muted, lineHeight: 1.7 }}>
            <ShieldCheck size={16} color={T.rust} style={{ flexShrink: 0, marginTop: 2 }} />
            <span><strong style={{ color: T.rust }}>Risk Disclaimer</strong> — Automated scalping involves significant risk of loss. Short-timeframe trading amplifies exposure. Only use a dedicated account with capital you can afford to lose. Past performance does not guarantee future results.</span>
          </div>
        </div>
      );

      const RiskForm = () => (
        <div>
          {[
            { key: "risk_percent", label: "Risk per trade (%)", min: 0.1, max: 5, step: 0.1 },
            { key: "max_open_trades", label: "Max simultaneous trades", min: 1, max: 10, step: 1 },
            { key: "min_confidence", label: "Min confidence (%)", min: 50, max: 95, step: 1 },
            { key: "daily_loss_limit", label: "Daily loss limit (%)", min: 1, max: 20, step: 0.5 },
          ].map(({ key, label, min, max, step }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, color: T.muted }}>{label}</span>
                <span style={{ fontSize: 13.5, color: T.paper, fontFamily: FONT_HEAD, fontWeight: 700 }}>{localS[key]}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={localS[key]} onChange={e => setLocalS(p => ({ ...p, [key]: parseFloat(e.target.value) }))} style={{ width: "100%", accentColor: T.gold }} />
            </div>
          ))}
          {err && <div style={{ fontSize: 13.5, color: T.rust, marginBottom: 8, lineHeight: 1.5 }}>{err}</div>}
          <button onClick={handleSaveSettings} disabled={busy} style={{ width: "100%", background: saved ? T.sage : T.goldGradient, color: T.ink, border: "none", borderRadius: 12, padding: "11px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15, cursor: busy ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
            {saved ? "Saved" : busy ? "Saving…" : "Save Settings"}
          </button>
        </div>
      );

      const RiskSettings = () => (
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>
          <button onClick={() => setRiskOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", color: T.paper, padding: "14px 16px", cursor: "pointer", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14.5, transition: "all 0.2s" }}>
            <span>Risk Settings</span>
            <ChevronRight size={18} color={T.muted} style={{ transform: riskOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </button>
          {riskOpen && <div style={{ borderTop: `1px solid ${T.cardBorder}`, padding: "14px 16px 16px" }}>{RiskForm()}</div>}
        </div>
      );

      const SignalCard = ({ sig }) => {
        const confidence = signalConfidence(sig);
        const isBuy = sig.direction === "BUY";
        const DirectionIcon = isBuy ? TrendingUp : TrendingDown;
        return (
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: `${T.gold}18`, color: T.paper, flexShrink: 0 }}><DirectionIcon size={18} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15.5, color: T.paper }}>{sig.asset || "—"}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{sig.timeframe || "5m"} timeframe</div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12.5, color: T.paper, border: `1px solid ${T.cardBorder}`, borderRadius: 6, padding: "3px 7px" }}>{sig.direction}</div>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13, color: T.paper, marginTop: 5 }}>{confidence}%</div>
              </div>
            </div>
            <div style={{ height: 4, background: `${T.muted}25`, borderRadius: 99, overflow: "hidden", margin: "13px 0 14px" }}><div style={{ width: `${Math.min(100, Math.max(0, confidence))}%`, height: "100%", background: confidence >= 70 ? T.goldBright : T.gold, borderRadius: 99, transition: "all 0.2s" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8 }}>
              <div><div style={{ fontSize: 11.5, color: T.muted, marginBottom: 3 }}>Entry</div><div style={{ fontSize: 13, color: T.paper, fontWeight: 600 }}>{sig.entry_zone ? `${price(sig.entry_zone[0])}–${price(sig.entry_zone[1])}` : price(sig.entry)}</div></div>
              <div><div style={{ fontSize: 11.5, color: T.muted, marginBottom: 3 }}>SL</div><div style={{ fontSize: 13, color: T.paper, fontWeight: 600 }}>{price(sig.stop_loss)}</div></div>
              <div><div style={{ fontSize: 11.5, color: T.muted, marginBottom: 3 }}>TP1</div><div style={{ fontSize: 13, color: T.paper, fontWeight: 600 }}>{price(sig.take_profit?.[0] ?? sig.take_profit)}</div></div>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 13, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}`, fontSize: 12, color: T.muted }}>
              <span>RR {sig.risk_reward_ratio != null ? `${sig.risk_reward_ratio}:1` : "—"}</span>
              <span>Risk {sig.risk_level || "—"}</span>
            </div>
          </div>
        );
      };

      const SymbolPicker = () => {
        const allSyms = SCALP_SYMBOLS.flatMap(g => g.symbols.map(s => ({ s, g: g.group })));
        const filtered = symbolSearch ? allSyms.filter(({ s }) => s.includes(symbolSearch.toUpperCase())) : null;
        const choose = (symbol) => { setSelectedSymbol(symbol); lsSet("rainx-scalp-sym", symbol); setSymbolSearch(""); };
        return (
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14.5, color: T.paper, marginBottom: 10 }}>Select Market</div>
            <input type="text" placeholder="Search symbol" value={symbolSearch} onChange={e => setSymbolSearch(e.target.value)} style={{ width: "100%", background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 9, color: T.paper, fontSize: 14, padding: "9px 12px", fontFamily: FONT_BODY, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
            {filtered ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{filtered.map(({ s }) => <button key={s} onClick={() => choose(s)} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 13, fontFamily: FONT_HEAD, fontWeight: 700, cursor: "pointer", background: selectedSymbol === s ? T.gold : T.ink, color: selectedSymbol === s ? T.ink : T.muted, border: `1px solid ${selectedSymbol === s ? T.gold : T.cardBorder}`, transition: "all 0.2s" }}>{s}</button>)}{filtered.length === 0 && <div style={{ fontSize: 13, color: T.muted }}>No symbols match.</div>}</div>
            ) : SCALP_SYMBOLS.map(({ group, symbols }) => (
              <div key={group} style={{ marginBottom: 10 }}><div style={{ fontSize: 11.5, color: T.muted, fontFamily: FONT_HEAD, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{group}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{symbols.map(sym => <button key={sym} onClick={() => choose(sym)} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 13, fontFamily: FONT_HEAD, fontWeight: 700, cursor: "pointer", background: selectedSymbol === sym ? T.gold : T.ink, color: selectedSymbol === sym ? T.ink : T.muted, border: `1px solid ${selectedSymbol === sym ? T.gold : T.cardBorder}`, transition: "all 0.2s" }}>{sym}</button>)}</div></div>
            ))}
            {selectedSymbol && <div style={{ marginTop: 5, fontSize: 12.5, color: T.paper, fontFamily: FONT_HEAD, fontWeight: 700 }}>{selectedSymbol} selected</div>}
          </div>
        );
      };

      const ModeToggle = () => (
        <>
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 16 }}>
            {[{ key: "quick", label: "Quick Scalp", hint: "Enters immediately", Icon: Zap }, { key: "smart", label: "Smart Scalp", hint: "Waits for setup", Icon: Activity }].map(({ key, label, hint, Icon }) => (
              <button key={key} onClick={() => {
                if (scalpMode === key) return;
                if (phase === "active") {
                  // Require confirmation before switching while scalping is live
                  setPendingScalpMode(key);
                } else {
                  setScalpMode(key); setSmartAlert(null);
                }
              }} style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "left", background: scalpMode === key ? `${T.gold}20` : "transparent", color: scalpMode === key ? T.goldBright : T.muted, border: scalpMode === key ? `1px solid ${T.gold}66` : "1px solid transparent", borderRadius: 10, padding: "10px 9px", cursor: "pointer", transition: "all 0.2s" }}>
                <Icon size={17} />
                <span><span style={{ display: "block", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12.5 }}>{label}</span><span style={{ display: "block", fontSize: 10.5, marginTop: 2, color: T.muted }}>{hint}</span></span>
              </button>
            ))}
          </div>
          {/* Mode-switch confirmation (shown only when scalping is active) */}
          {pendingScalpMode && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: "24px 20px", maxWidth: 340, width: "100%" }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 17, color: T.paper, marginBottom: 8 }}>Switch to {pendingScalpMode === "quick" ? "Quick" : "Smart"} Scalp?</div>
                <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
                  {pendingScalpMode === "quick"
                    ? "Quick Scalp enters trades automatically as soon as a signal fires. Switching now will change how new signals are handled — existing open trades are not affected."
                    : "Smart Scalp alerts you before each trade so you can approve or dismiss it. Switching now will stop automatic entries — you must confirm each signal manually."}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setPendingScalpMode(null)} style={{ flex: 1, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, color: T.paper, cursor: "pointer" }}>Cancel</button>
                  <button onClick={() => { setScalpMode(pendingScalpMode); setSmartAlert(null); setPendingScalpMode(null); }} style={{ flex: 1, background: T.goldGradient, border: "none", borderRadius: 12, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13.5, color: T.ink, cursor: "pointer" }}>Switch</button>
                </div>
              </div>
            </div>
          )}
        </>
      );

      // ── SparkLine: decorative direction-aware SVG chart ──
      const SparkLine = ({ direction = "HOLD", width = 120, height = 44 }) => {
        const pts = direction === "BUY"
          ? [0.78, 0.72, 0.68, 0.60, 0.55, 0.42, 0.38, 0.28, 0.20, 0.12]
          : direction === "SELL"
          ? [0.18, 0.22, 0.28, 0.24, 0.38, 0.42, 0.36, 0.52, 0.62, 0.76]
          : [0.52, 0.45, 0.55, 0.48, 0.52, 0.46, 0.54, 0.50, 0.46, 0.52];
        const col = direction === "BUY" ? T.sage : direction === "SELL" ? T.rust : T.muted;
        const step = width / (pts.length - 1);
        const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(p * height).toFixed(1)}`).join(" ");
        const fillPath = linePath + ` L${width},${height} L0,${height} Z`;
        const uid = `sp-${direction}-${width}`;
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity="0.25" />
                <stop offset="100%" stopColor={col} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={fillPath} fill={`url(#${uid})`} />
            <path d={linePath} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      };

      // ── HeroCard: large top card ──
      const HeroCard = ({ active }) => {
        const topSig = signals.length > 0 ? getTopSignal(signals) : null;
        const direction = topSig?.direction || null;
        const confidence = topSig ? signalConfidence(topSig) : 0;
        const bal = mt5?.balance ?? mt5?.account_balance ?? mt5?.equity ?? 0;
        const currency = mt5?.currency || rSettings?.account_currency || "USD";
        const pnl = Number(perf?.total_profit) || 0;
        const pnlPositive = pnl >= 0;
        const balanceZero = !bal || Number(bal) === 0;
        const isBuy = direction === "BUY";
        const isSell = direction === "SELL";
        const dirCol = isBuy ? T.sage : isSell ? T.rust : T.muted;
        return (
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 22, padding: "16px 16px 14px", marginBottom: 12, overflow: "hidden" }}>
            {/* Status + broker row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? T.sage : T.muted, display: "inline-block", boxShadow: active ? `0 0 6px ${T.sage}88` : "none" }} />
                <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, color: active ? T.sage : T.paper }}>{active ? "Scalping Active" : "MT5 Connected"}</span>
              </div>
              <button onClick={() => setShowDisconnectConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <Activity size={13} color={T.paper} />
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, color: T.paper }}>{mt5?.broker_name || "Broker"}</div>
                  <div style={{ fontSize: 10.5, color: T.muted }}>{(mt5?.account_mode || "demo").toUpperCase()} · #{mt5?.account_number || "—"}</div>
                </div>
              </button>
            </div>

            {/* Main row: left (symbol + direction + chart) | divider | right (balance + P&L) */}
            <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
              {/* Left */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <span style={{ fontFamily: FONT_HEAD, fontWeight: 900, fontSize: 22, color: T.paper, letterSpacing: -0.5 }}>{selectedSymbol || "—"}</span>
                  <span style={{ color: T.paper, fontSize: 15 }}>★</span>
                </div>
                {direction ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ background: `${dirCol}22`, border: `1px solid ${dirCol}66`, borderRadius: 8, padding: "4px 10px", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13, color: dirCol }}>
                      {direction}{isBuy ? " ↗" : isSell ? " ↘" : ""}
                    </span>
                    <div>
                      <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: T.paper }}>{confidence}%</span>
                      <span style={{ fontSize: 10.5, color: T.muted, marginLeft: 3 }}>Confidence</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{active ? "Monitoring markets…" : "Start scalping to see signals"}</div>
                )}
                <div style={{ borderRadius: 10, overflow: "hidden", marginTop: 6 }}>
                  <SparkLine direction={direction || "HOLD"} width={130} height={46} />
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: 1, background: T.cardBorder, alignSelf: "stretch", flexShrink: 0 }} />

              {/* Right: balance + P&L */}
              <div style={{ flexShrink: 0, minWidth: 110, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 2 }}>Balance</div>
                  <div style={{ fontFamily: FONT_HEAD, fontWeight: 900, fontSize: 20, color: T.paper, lineHeight: 1 }}>{money(bal)}</div>
                  <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{currency}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 2 }}>P&amp;L Today</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <div>
                      <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: pnlPositive ? T.sage : T.rust }}>
                        {pnlPositive ? "+" : ""}{money(pnl)}
                      </div>
                      <div style={{ fontSize: 10.5, color: T.muted }}>{currency}</div>
                    </div>
                    <button onClick={handleSyncBalance} disabled={balanceSyncing} title="Sync balance" style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.cardBorder}`, background: balanceSyncing ? `${T.gold}22` : "transparent", color: balanceSyncing ? T.gold : T.muted, display: "grid", placeItems: "center", cursor: balanceSyncing ? "not-allowed" : "pointer", flexShrink: 0, transition: "all 0.2s" }}>
                      <Activity size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance warning strip */}
            {balanceZero && (
              <div style={{ marginTop: 12, background: `${T.gold}12`, border: `1px solid ${T.gold}33`, borderRadius: 9, padding: "7px 11px", fontSize: 12, color: T.muted, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{balanceSyncing ? "⏳ Syncing from MetaAPI…" : "Balance not yet synced."}</span>
                {!balanceSyncing && (
                  <button onClick={handleSyncBalance} style={{ background: "none", border: "none", color: T.gold, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}>Sync now</button>
                )}
              </div>
            )}
          </div>
        );
      };

      // ── ScalpModeCards: Quick + Smart side-by-side ──
      const ScalpModeCards = () => (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { key: "quick", label: "Quick Scalping", hint: "Enters immediately", Icon: Zap },
            { key: "smart", label: "Smart Scalping", hint: "Waits for better setup", Icon: Activity },
          ].map(({ key, label, hint, Icon }) => {
            const isActive = scalpMode === key;
            return (
              <button key={key} onClick={() => {
                if (scalpMode === key) return;
                if (phase === "active") { setPendingScalpMode(key); }
                else { setScalpMode(key); setSmartAlert(null); }
              }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left", background: T.card, border: `1.5px solid ${isActive ? T.gold : T.cardBorder}`, borderRadius: 18, padding: "13px 11px 13px 12px", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: `${T.gold}20`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon size={18} color={T.paper} />
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12.5, color: T.paper, lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: 10.5, color: T.muted, marginTop: 3, lineHeight: 1.3 }}>{hint}</div>
                  </div>
                </div>
                <ChevronRight size={15} color={isActive ? T.gold : T.muted} style={{ flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      );

      // ── HotMarkets: horizontal scrollable signal cards ──
      const HotMarkets = ({ onSeeAll }) => {
        const defaultSyms = SCALP_SYMBOLS.flatMap(g => g.symbols).slice(0, 6);
        const items = signals.length > 0
          ? signals.slice(0, 6).map(sig => ({ sym: sig.asset, sig }))
          : defaultSyms.map(sym => ({ sym, sig: null }));
        const TAGS = ["Hot", "Strong", "Rising", "Active", "Watch", "Trending"];
        const tagColor = (t) => t === "Hot" ? T.rust : t === "Strong" ? T.sage : T.gold;
        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>🔥</span>
                <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15, color: T.paper }}>Hot Markets</span>
              </div>
              <button onClick={onSeeAll} style={{ display: "flex", alignItems: "center", gap: 2, background: "none", border: "none", color: T.gold, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                See all <ChevronRight size={14} color={T.gold} />
              </button>
            </div>

            {/* Horizontal scroll container */}
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
              {items.map(({ sym, sig }, i) => {
                const dir = sig?.direction || null;
                const conf = sig ? signalConfidence(sig) : 0;
                const isBuy = dir === "BUY";
                const isSell = dir === "SELL";
                const dirCol = isBuy ? T.sage : isSell ? T.rust : T.muted;
                const dirLabel = isBuy ? "BUY" : isSell ? "SELL" : "WAIT";
                const tag = TAGS[i % TAGS.length];
                const tagCol = tagColor(tag);
                const SEG = 8;
                const filled = Math.round((conf / 100) * SEG);
                return (
                  <div key={sym} style={{ flexShrink: 0, width: 172, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 18, padding: "13px 12px 12px", scrollSnapAlign: "start" }}>
                    {/* Symbol + tag */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${T.gold}22`, border: `1.5px solid ${T.gold}55`, display: "grid", placeItems: "center", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12, color: T.paper, flexShrink: 0 }}>
                          {sym.charAt(0)}
                        </div>
                        <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12, color: T.paper }}>{sym}</span>
                      </div>
                      {sig && <span style={{ fontSize: 10, fontWeight: 700, color: tagCol, background: `${tagCol}22`, borderRadius: 6, padding: "2px 7px", fontFamily: FONT_HEAD, flexShrink: 0 }}>{tag}</span>}
                    </div>

                    {/* Sparkline */}
                    <div style={{ borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
                      <SparkLine direction={dir || "HOLD"} width={148} height={48} />
                    </div>

                    {/* Direction + confidence */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontFamily: FONT_HEAD, fontWeight: 900, fontSize: 15, color: dirCol }}>{dirLabel}</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13.5, color: T.paper }}>{conf || "—"}%</span>
                        <div style={{ fontSize: 9.5, color: T.muted, lineHeight: 1 }}>Confidence</div>
                      </div>
                    </div>

                    {/* Segmented confidence bar */}
                    <div style={{ display: "flex", gap: 2.5, marginBottom: 10 }}>
                      {Array.from({ length: SEG }).map((_, j) => (
                        <div key={j} style={{ flex: 1, height: 4, borderRadius: 99, background: j < filled ? dirCol : `${T.muted}33`, transition: "all 0.2s" }} />
                      ))}
                    </div>

                    {/* Scalp Now */}
                    <button
                      onClick={() => {
                        if (sig) { handleExecuteSignal(sig); }
                        else { setSelectedSymbol(sym); lsSet("rainx-scalp-sym", sym); }
                      }}
                      disabled={busy}
                      style={{ width: "100%", background: T.goldGradient, color: T.ink, border: "none", borderRadius: 10, padding: "9px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "opacity 0.2s" }}
                    >
                      Scalp Now <ArrowRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Scroll indicator dots */}
            {items.length > 2 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
                {Array.from({ length: Math.min(3, Math.ceil(items.length / 2)) }).map((_, i) => (
                  <div key={i} style={{ width: i === 0 ? 18 : 6, height: 6, borderRadius: 99, background: i === 0 ? T.paper : `${T.muted}44` }} />
                ))}
              </div>
            )}
          </div>
        );
      };

      // ── [kept] AccountHeader alias used by PhaseSetup error path ──
      const AccountHeader = ({ active = false }) => <HeroCard active={active} />;

      const SmartAlert = () => {
        if (!smartAlert || scalpMode !== "smart") return null;
        return (
          <div style={{ background: `${T.gold}16`, border: `1px solid ${T.gold}66`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.paper, fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14 }}>
                <Bell size={16} /> Setup ready
              </div>
              <button onClick={() => setSmartAlert(null)} aria-label="Dismiss signal" style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 13.5, color: T.paper, lineHeight: 1.5 }}>
              <strong>{smartAlert.asset}</strong> is showing a {smartAlert.direction} setup at {signalConfidence(smartAlert)}% confidence.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => handleExecuteSignal(smartAlert)} disabled={busy} style={{ flex: 1, background: T.gold, color: T.ink, border: "none", borderRadius: 9, padding: "9px 12px", fontFamily: FONT_HEAD, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                Execute
              </button>
              <button onClick={() => setSmartAlert(null)} style={{ flex: 1, background: "transparent", color: T.muted, border: `1px solid ${T.cardBorder}`, borderRadius: 9, padding: "9px 12px", fontFamily: FONT_HEAD, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                Dismiss
              </button>
            </div>
          </div>
        );
      };

      const BROKER_SERVERS = ["ICMarkets-Live", "ICMarkets-Demo", "Exness-Real", "Exness-MT5Trial", "FTMO-Server", "XM.COM-Real 3", "XM.COM-Demo", "HFMarkets-Live Server", "Pepperstone-Edge-Live", "Pepperstone-MT5-Live", "OctaFX-Real", "FBS-Real", "Tickmill-Live", "Vantage-Real", "GO Markets Group-Live", "Axiory-Real", "EasyMarkets-MT5 Real", "ThinkMarkets-Live"];

      const PhaseSetup = () => (
        <div>
          <div style={{ background: `${T.sage}14`, border: `1px solid ${T.sage}44`, borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}><div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: T.sage, fontWeight: 700, marginBottom: 3 }}><ShieldCheck size={16} /> Start with a Demo account</div><div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>Open a free demo account on any MT5 broker and test Raina AI scalping with virtual funds before going live.</div></div>
          <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13.5, color: T.muted, fontFamily: FONT_HEAD, fontWeight: 700, marginBottom: 8 }}>Connection Method</div><div style={{ display: "flex", gap: 8 }}>{[["metaapi", "MetaAPI (Cloud)"], ["ea", "EA Desktop"]].map(([m, label]) => <button key={m} onClick={() => { setConnectMethod(m); setErr(""); }} style={{ flex: 1, background: connectMethod === m ? T.gold : T.card, color: connectMethod === m ? T.ink : T.muted, border: `1px solid ${connectMethod === m ? T.gold : T.cardBorder}`, borderRadius: 10, padding: "10px 6px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>{label}</button>)}</div><div style={{ fontSize: 12.5, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>{connectMethod === "metaapi" ? "Recommended — no PC or VPS needed. Raina AI stays connected to your broker through MetaAPI cloud." : "Install an Expert Advisor in your local MetaTrader 5. MT5 must stay open on a PC or VPS."}</div></div>
          <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13.5, color: T.muted, fontFamily: FONT_HEAD, fontWeight: 700, marginBottom: 8 }}>Account Mode</div><div style={{ display: "flex", gap: 8 }}>{["demo", "live"].map(m => <button key={m} onClick={() => setMode(m)} style={{ flex: 1, background: mode === m ? T.gold : T.card, color: mode === m ? T.ink : T.muted, border: `1px solid ${mode === m ? T.gold : T.cardBorder}`, borderRadius: 10, padding: "10px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14.5, cursor: "pointer", textTransform: "capitalize", transition: "all 0.2s" }}>{m}</button>)}</div></div>
          {connectMethod === "metaapi" ? <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14.5, color: T.paper, marginBottom: 4 }}><Key size={16} /> MT5 Credentials</div><div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14, lineHeight: 1.6 }}>Your credentials are encrypted in transit and used only to connect your trading account.</div><div style={{ marginBottom: 14 }}><div style={{ fontSize: 13, color: T.muted, fontWeight: 700, marginBottom: 4 }}>MT5 Login Number</div><input type="text" value={mt5Login} onChange={e => setMt5Login(e.target.value)} placeholder="e.g. 12345678" style={{ width: "100%", background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 9, color: T.paper, fontSize: 15, padding: "10px 12px", fontFamily: FONT_BODY, outline: "none", boxSizing: "border-box" }} /></div><div style={{ marginBottom: 14 }}><div style={{ fontSize: 13, color: T.muted, fontWeight: 700, marginBottom: 4 }}>MT5 Password</div><input type="password" value={mt5Password} onChange={e => setMt5Password(e.target.value)} placeholder="Master or Investor password" style={{ width: "100%", background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 9, color: T.paper, fontSize: 15, padding: "10px 12px", fontFamily: FONT_BODY, outline: "none", boxSizing: "border-box" }} /></div><div><div style={{ fontSize: 13, color: T.muted, fontWeight: 700, marginBottom: 4 }}>Broker Server</div><input type="text" value={mt5Server} onChange={e => setMt5Server(e.target.value)} placeholder="e.g. ICMarkets-Demo" list="broker-servers" style={{ width: "100%", background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 9, color: T.paper, fontSize: 15, padding: "10px 12px", fontFamily: FONT_BODY, outline: "none", boxSizing: "border-box" }} /><datalist id="broker-servers">{BROKER_SERVERS.map(s => <option key={s} value={s} />)}</datalist></div></div> : <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14.5, color: T.paper, marginBottom: 4 }}><Key size={16} /> EA Desktop Mode</div><div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>Generate an API key, install the Raina AI Expert Advisor in MetaTrader 5, and keep MT5 open on a PC or VPS.</div></div>}
          {err && <div style={{ fontSize: 13.5, color: T.rust, marginBottom: 10, padding: "10px 12px", background: `${T.rust}15`, borderRadius: 9, lineHeight: 1.5 }}>{err}</div>}
          <button onClick={handleConnect} disabled={busy} style={{ width: "100%", background: T.goldGradient, color: T.ink, border: "none", borderRadius: 12, padding: "13px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, cursor: busy ? "not-allowed" : "pointer", transition: "all 0.2s" }}>{busy ? "Connecting…" : connectMethod === "metaapi" ? "Connect via MetaAPI" : "Generate API Key & Connect"}</button>
          {Disclaimer()}
        </div>
      );

      const PhasePending = () => (
        <div>
          <div style={{ background: `${T.gold}14`, border: `1px solid ${T.gold}55`, borderRadius: 14, padding: "14px 16px", marginBottom: 16, textAlign: "center" }}>
            <Activity size={20} color={T.paper} />
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: T.paper, margin: "6px 0 4px" }}>Waiting for MT5 connection</div>
            <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6 }}>Install the Expert Advisor in MetaTrader 5 to complete setup. This page checks automatically every 30 seconds.</div>
          </div>

          {apiKey && (
            <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper, marginBottom: 10 }}>Your API Key</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.ink, borderRadius: 9, padding: "10px 12px", marginBottom: 12 }}>
                <div style={{ flex: 1, fontFamily: "monospace", fontSize: 13, color: T.paper, wordBreak: "break-all" }}>{showKey ? apiKey : "●".repeat(Math.min(apiKey.length, 36))}</div>
                <button onClick={() => setShowKey(v => !v)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                <button onClick={() => navigator.clipboard?.writeText(apiKey)} style={{ background: "none", border: "none", color: T.gold, cursor: "pointer", fontSize: 12.5, fontFamily: FONT_BODY }}>Copy</button>
              </div>
              {mt5UserId && (
                <a
                  href={`/api/mt5/ea/download/${mt5UserId}`}
                  download={`RainX_Scalper.mq5`}
                  style={{ display: "block", width: "100%", background: T.goldGradient, color: T.ink, border: "none", borderRadius: 10, padding: "11px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14.5, cursor: "pointer", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}
                >
                  ⬇ Download EA File (.mq5)
                </a>
              )}
            </div>
          )}

          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper, marginBottom: 10 }}>EA Installation Steps</div>
            {[
              "Download the EA file above (it has your API key pre-filled)",
              "In MT5 → File → Open Data Folder → MQL5 → Experts",
              "Copy RainX_Scalper.mq5 into the Experts folder",
              "Restart MT5 — the EA appears in your Navigator panel",
              "Drag it onto any chart (currency pair doesn't matter)",
              "MT5 → Tools → Options → Expert Advisors → tick 'Allow WebRequests' → add: raina-ai-production-b247.up.railway.app",
              "Click ▶ Auto Trading and keep MT5 open (PC or VPS)",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13, color: T.paper, minWidth: 18 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: T.paper, lineHeight: 1.65 }}>{step}</span>
              </div>
            ))}
          </div>
          {Disclaimer()}
        </div>
      );

      const PhaseConnected = () => (
        <div>
          <HeroCard active={false} />
          <ScalpModeCards />
          {SymbolPicker()}
          {RiskSettings()}
          {err && <div style={{ fontSize: 13.5, color: T.rust, marginBottom: 10, padding: "10px 12px", background: `${T.rust}15`, borderRadius: 9, lineHeight: 1.5 }}>{err}</div>}
          <button onClick={handleToggle} disabled={busy || !selectedSymbol} style={{ width: "100%", background: selectedSymbol ? T.goldGradient : T.card, color: selectedSymbol ? T.ink : T.muted, border: selectedSymbol ? "none" : `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, cursor: busy || !selectedSymbol ? "not-allowed" : "pointer", marginBottom: 14, transition: "all 0.2s" }}>
            {busy ? "Please wait…" : selectedSymbol ? `Start ${scalpMode === "quick" ? "Quick" : "Smart"} Scalp` : "Select a market to start scalping"}
          </button>
          {Disclaimer()}
        </div>
      );

      const PhaseActive = () => {
        const pnl = Number(perf?.total_profit) || 0;
        return (
          <div>
            {/* 1 — Hero card */}
            <HeroCard active />

            {/* 2 — Mode selector cards */}
            <ScalpModeCards />

            {/* 3 — Hot Markets horizontal scroll */}
            <HotMarkets onSeeAll={() => {}} />

            {/* 4 — Smart alert */}
            {SmartAlert()}

            {/* 5 — Performance stats */}
            {perf && (
              <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 18, padding: "14px 14px 12px", marginBottom: 12 }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, color: T.paper, marginBottom: 12 }}>Performance</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Win Rate", val: `${perf.win_rate ?? 0}%`, col: T.paper },
                    { label: "Trades", val: perf.total_trades ?? 0, col: T.paper },
                    { label: "P&L", val: `${pnl >= 0 ? "+" : ""}${money(pnl)}`, col: pnl >= 0 ? T.sage : T.rust },
                  ].map(({ label, val, col }) => (
                    <div key={label} style={{ background: `${T.ink}88`, borderRadius: 12, padding: "11px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15, color: col }}>{val}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6 — Open trades */}
            {trades.length > 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 18, padding: "14px", marginBottom: 12 }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, color: T.paper, marginBottom: 12 }}>
                  Open Trades <span style={{ color: T.muted, fontWeight: 500 }}>({trades.length})</span>
                </div>
                {trades.map((trade, i) => {
                  const TradeIcon = trade.direction === "SELL" ? TrendingDown : TrendingUp;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < trades.length - 1 ? `1px solid ${T.cardBorder}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.gold}18`, display: "grid", placeItems: "center" }}>
                          <TradeIcon size={16} color={T.paper} />
                        </div>
                        <div>
                          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper }}>{trade.asset || "—"}</div>
                          <div style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }}>{trade.direction || "—"}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: T.muted }}>Lot {trade.lot_size ?? "—"}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 7 — Live Signals detail */}
            <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 18, padding: "14px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, color: T.paper }}>
                  <Activity size={15} color={T.paper} /> Live Signals
                </div>
                {sigLoading && <div style={{ width: 18, height: 18, border: `2px solid ${T.cardBorder}`, borderTopColor: T.paper, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
              </div>
              {sigLoading && signals.length === 0 && <div style={{ textAlign: "center", color: T.muted, fontSize: 13.5, padding: "14px 0" }}>Loading signals…</div>}
              {signals.map((sig, i) => <SignalCard key={`${signalKey(sig)}-${i}`} sig={sig} />)}
              {!sigLoading && signals.length === 0 && (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <Activity size={20} color={T.muted} />
                  <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper, marginTop: 8 }}>No trade setup yet</div>
                  {holdSignal ? (
                    <>
                      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 8, lineHeight: 1.65, textAlign: "left", background: `${T.ink}99`, borderRadius: 9, padding: "9px 11px" }}>
                        {holdSignal.explanation || "Market is in a consolidation zone — waiting for a clear directional move."}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, padding: "7px 11px", background: `${T.gold}12`, borderRadius: 9 }}>
                        <div style={{ fontSize: 12, color: T.muted }}>Current confidence</div>
                        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13.5, color: Math.round(holdSignal.confidence || 0) >= 40 ? T.paper : T.muted }}>
                          {Math.round(holdSignal.confidence || 0)}% <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>/ 55% needed</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12.5, color: T.muted, marginTop: 5 }}>Raina AI is monitoring. Signals appear when conditions align.</div>
                  )}
                </div>
              )}
            </div>

            {/* 8 — Risk settings (collapsible) */}
            {RiskSettings()}

            {/* 9 — Error */}
            {err && <div style={{ fontSize: 13.5, color: T.rust, marginBottom: 10, padding: "10px 12px", background: `${T.rust}15`, borderRadius: 9, lineHeight: 1.5 }}>{err}</div>}

            {/* 10 — Pause button */}
            <button onClick={handleToggle} disabled={busy} style={{ width: "100%", background: `${T.rust}18`, color: T.rust, border: `1px solid ${T.rust}55`, borderRadius: 14, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, cursor: busy ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
              {busy ? "Please wait…" : "Pause Scalping"}
            </button>
          </div>
        );
      };

      return (
        <div style={{ padding: "0 0 90px" }}>
          {/* ── Page header ── */}
          <div style={{ padding: "18px 16px 12px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <Zap size={18} color={T.paper} />
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 900, fontSize: 22, color: T.paper }}>RainX</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: FONT_HEAD, fontWeight: 600, letterSpacing: 0.3 }}>Scalping Engine</div>
          </div>

          {/* ── Content ── */}
          <div style={{ padding: "0 14px" }}>
            <BlurGate unlocked={unlocked} requiredLabel="Weekly" onSubscribe={onSubscribe} minHeight={440}>
              {phase === "loading"
                ? (
                  <div>
                    {/* Skeleton — page renders immediately; data loads in background */}
                    <div style={{ borderRadius: 16, background: T.card, border: `1px solid ${T.cardBorder}`, padding: 18, marginBottom: 12, animation: "pulse 1.4s ease-in-out infinite" }}>
                      <div style={{ height: 12, borderRadius: 6, background: T.cardBorder, width: "55%", marginBottom: 10 }} />
                      <div style={{ height: 10, borderRadius: 6, background: T.cardBorder, width: "35%", marginBottom: 18 }} />
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1, height: 48, borderRadius: 10, background: T.cardBorder }} />
                        <div style={{ flex: 1, height: 48, borderRadius: 10, background: T.cardBorder }} />
                      </div>
                    </div>
                    <div style={{ borderRadius: 16, background: T.card, border: `1px solid ${T.cardBorder}`, padding: 18, marginBottom: 12, animation: "pulse 1.4s ease-in-out infinite" }}>
                      <div style={{ height: 10, borderRadius: 6, background: T.cardBorder, width: "45%", marginBottom: 10 }} />
                      <div style={{ height: 10, borderRadius: 6, background: T.cardBorder, width: "65%", marginBottom: 10 }} />
                      <div style={{ height: 10, borderRadius: 6, background: T.cardBorder, width: "30%" }} />
                    </div>
                    <div style={{ borderRadius: 16, background: T.card, border: `1px solid ${T.cardBorder}`, padding: 18, animation: "pulse 1.4s ease-in-out infinite" }}>
                      <div style={{ height: 10, borderRadius: 6, background: T.cardBorder, width: "70%", marginBottom: 10 }} />
                      <div style={{ height: 10, borderRadius: 6, background: T.cardBorder, width: "50%" }} />
                    </div>
                  </div>
                )
                : phase === "setup"    ? PhaseSetup()
                : phase === "pending"  ? PhasePending()
                : phase === "connected"? PhaseConnected()
                : phase === "active"   ? PhaseActive()
                : PhaseSetup()}
            </BlurGate>
          </div>

          {/* ── Mode-switch confirmation modal ── */}
          {pendingScalpMode && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: "24px 20px", maxWidth: 340, width: "100%" }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 17, color: T.paper, marginBottom: 8 }}>Switch to {pendingScalpMode === "quick" ? "Quick" : "Smart"} Scalp?</div>
                <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
                  {pendingScalpMode === "quick"
                    ? "Quick Scalp enters trades automatically as soon as a signal fires. Switching now will change how new signals are handled — existing open trades are not affected."
                    : "Smart Scalp alerts you before each trade so you can approve or dismiss it. Switching now will stop automatic entries — you must confirm each signal manually."}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setPendingScalpMode(null)} style={{ flex: 1, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, color: T.paper, cursor: "pointer" }}>Cancel</button>
                  <button onClick={() => { setScalpMode(pendingScalpMode); setSmartAlert(null); setPendingScalpMode(null); }} style={{ flex: 1, background: T.goldGradient, border: "none", borderRadius: 12, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13.5, color: T.ink, cursor: "pointer" }}>Switch</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Disconnect confirmation modal ── */}
          {showDisconnectConfirm && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: "24px 20px", maxWidth: 340, width: "100%" }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 17, color: T.paper, marginBottom: 8 }}>Disconnect MT5?</div>
                <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>This will stop scalping and remove your MT5 connection from this device. Open trades on your broker are not affected.</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowDisconnectConfirm(false)} style={{ flex: 1, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, color: T.paper, cursor: "pointer" }}>Cancel</button>
                  <button onClick={() => { setShowDisconnectConfirm(false); disconnect(); }} style={{ flex: 1, background: "#E53935", border: "none", borderRadius: 12, padding: "12px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13.5, color: "#fff", cursor: "pointer" }}>Disconnect</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }


// ---------- More Tab helpers ----------

const DEFAULT_BENEFITS = [
  { id: "verification", icon: "shield", title: "Verification & Badge", status: null },
  { id: "rewards",      icon: "trophy", title: "Trader Rewards Programme", status: null },
];

function BenefitIcon({ type }) {
  const s = { width: 36, height: 36, borderRadius: 10, background: "rgba(140,140,140,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  if (type === "trophy") return <div style={s}><Trophy size={18} color={T.muted} /></div>;
  if (type === "shield") return <div style={s}><ShieldCheck size={18} color={T.muted} /></div>;
  return <div style={s}><ShieldCheck size={18} color={T.muted} /></div>;
}

function MoreRow({ icon: Icon, iconType, title, subtitle, badge, badgeColor, onPress }) {
  return (
    <button onClick={onPress} style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: "none", padding: "13px 14px", cursor: "pointer", gap: 12 }}>
      {iconType ? <BenefitIcon type={iconType} /> : (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(140,140,140,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={18} color={T.muted} />
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
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(244,211,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={19} color={T.paper} />
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

// ── Notification Settings Screen ──────────────────────────────────────────
// ── Push sound map (mirrors sw.js CATEGORY_SOUNDS — keep in sync) ──────────
    const PUSH_SOUND_MAP = {
    trading:   "/sounds/Trade%20Entry%20notification%20sound%20.mp3",
    tp:        "/sounds/take%20profit%20notification%20sound%20.mp3",
    sl:        "/sounds/Stop%20Loss%20notification%20sound%20.mp3",
    community: "/sounds/community%20notification.mp3",
    news:      "/sounds/market%20news%20notification%20sound%20.mp3",
    risk:      "/sounds/money%20received%20notification.mp3",
    default:   "/sounds/analysis%20complete%20notification%20.mp3",
    };

    // ── Sound preview rows for the picker UI ─────────────────────────────────────
    const SOUND_PREVIEW_ROWS = [
    { category: "trading",   label: "Trade Signal",      sub: "New BUY / SELL entry",           src: "/sounds/Trade%20Entry%20notification%20sound%20.mp3" },
    { category: "tp",        label: "Take Profit Hit",   sub: "TP level reached",               src: "/sounds/take%20profit%20notification%20sound%20.mp3" },
    { category: "sl",        label: "Stop Loss Hit",     sub: "SL level reached",               src: "/sounds/Stop%20Loss%20notification%20sound%20.mp3" },
    { category: "news",      label: "Market News",       sub: "CPI, NFP, FOMC, rate decisions", src: "/sounds/market%20news%20notification%20sound%20.mp3" },
    { category: "community", label: "Community",         sub: "Replies, mentions & posts",      src: "/sounds/community%20notification.mp3" },
    { category: "risk",      label: "Risk & Wallet",     sub: "Risk warnings, wallet events",   src: "/sounds/money%20received%20notification.mp3" },
    { category: "default",   label: "Analysis Complete", sub: "Analysis done alerts",           src: "/sounds/analysis%20complete%20notification%20.mp3" },
    ];

    function SoundPickerCard() {
    const [playing, setPlaying] = React.useState(null);
    const audioRef = React.useRef(null);
    const preview = (row) => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (playing === row.category) { setPlaying(null); return; }
      try {
        const a = new Audio(row.src);
        a.volume = 0.9;
        a.play().catch(() => {});
        a.onended = () => setPlaying(null);
        audioRef.current = a;
        setPlaying(row.category);
      } catch { setPlaying(null); }
    };
    return (
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginTop: 16 }}>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper, marginBottom: 3 }}>Notification Sounds</div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 14, lineHeight: 1.5 }}>Tap Preview to hear each alert sound before it arrives.</div>
        {SOUND_PREVIEW_ROWS.map((row, i) => (
          <div key={row.category} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingTop: i === 0 ? 0 : 11, paddingBottom: i < SOUND_PREVIEW_ROWS.length - 1 ? 11 : 0,
            borderBottom: i < SOUND_PREVIEW_ROWS.length - 1 ? `1px solid ${T.cardBorder}` : "none",
          }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 12.5, color: T.paper }}>{row.label}</div>
              <div style={{ fontSize: 10.5, color: T.muted, marginTop: 1 }}>{row.sub}</div>
            </div>
            <button onClick={() => preview(row)} style={{
              background: playing === row.category ? T.sage : "transparent",
              color: playing === row.category ? T.ink : T.gold,
              border: `1.5px solid ${playing === row.category ? T.sage : T.gold}`,
              borderRadius: 8, padding: "5px 13px",
              fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11,
              cursor: "pointer", flexShrink: 0, transition: "all 0.18s",
            }}>
              {playing === row.category ? "Playing…" : "Preview"}
            </button>
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 10.5, color: T.muted, lineHeight: 1.6 }}>
          Each alert type has its own unique sound — plays automatically even when RainX is closed.
        </div>
      </div>
    );
    }

    const NOTIF_CATEGORIES = [
  { key: "trading",   label: "Trading & Raina AI",  desc: "Signals, entries, TP/SL alerts" },
  { key: "news",      label: "Market News",          desc: "CPI, NFP, FOMC, rate decisions" },
  { key: "community", label: "Community",            desc: "Likes, comments, follows, mentions" },
  { key: "money",     label: "Money & Rewards",      desc: "Transfers, rewards, wallet updates" },
  { key: "system",    label: "System",               desc: "Security, account, announcements" },
];
function NotificationSettingsScreen({ account, activeMarkets = [], settingsPrefs = {}, persistSettings }) {
  const prefs = settingsPrefs;
  const masterOn = prefs.master !== false;
  const toggle = (key) => {
    const next = key === "master"
      ? { master: !masterOn }
      : { [key]: prefs[key] === false ? true : false };
    if (persistSettings) persistSettings(next);
  };
  const bg = "#F2F3F5", card = "#FFFFFF", border = "#E7E9EC", text = "#111418", muted = "#737B85", yellow = T.gold;
  const SwitchToggle = ({ on, onChange }) => (
    <button type="button" aria-pressed={on} onClick={e=>{e.stopPropagation();onChange();}} style={{ width:44,height:25,padding:0,border:0,borderRadius:13,background:on?yellow:"#D7DBE0",position:"relative",cursor:"pointer",transition:"background .18s",flexShrink:0 }}>
      <span style={{position:"absolute",top:3,left:on?22:3,width:19,height:19,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.18)",transition:"left .18s"}} />
    </button>
  );
  return (
    <div style={{ background:bg, padding:"16px 16px 28px", minHeight:"100%" }}>
      <div style={{ background:card, border:`1px solid ${border}`, borderRadius:17, padding:"15px 16px", marginBottom:16, boxShadow:"0 1px 2px rgba(15,20,25,.03)" }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div><div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:14,color:text}}>All Notifications</div><div style={{fontSize:11.2,color:muted,marginTop:3}}>Master control for all alerts</div></div>
          <SwitchToggle on={masterOn} onChange={()=>toggle("master")} />
        </div>
      </div>
      <div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:12.5,color:muted,margin:"0 0 8px 4px",textTransform:"uppercase"}}>Categories</div>
      <div style={{ background:card,border:`1px solid ${border}`,borderRadius:17,overflow:"hidden",boxShadow:"0 1px 2px rgba(15,20,25,.03)" }}>
        {NOTIF_CATEGORIES.map((cat,i)=>{
          const catOn = masterOn && prefs[cat.key] !== false;
          return <React.Fragment key={cat.key}>
            {i>0&&<div style={{height:1,background:border,marginLeft:16}}/>}
            <div onClick={()=>masterOn&&toggle(cat.key)} style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,opacity:masterOn?1:.5,cursor:masterOn?"pointer":"default"}}>
              <div style={{flex:1,minWidth:0}}><div style={{fontFamily:FONT_HEAD,fontWeight:700,fontSize:13,color:text}}>{cat.label}</div><div style={{fontSize:11,color:muted,marginTop:3,lineHeight:1.35}}>{cat.desc}</div></div>
              <SwitchToggle on={catOn} onChange={()=>toggle(cat.key)} />
            </div>
          </React.Fragment>;
        })}
      </div>
      <SoundPickerCard />
    </div>
  );
}

function MoreSection({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper, marginBottom: 8, paddingLeft: 2 }}>{title}</div>
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
        <linearGradient id="bf1" x1="10" y1="0" x2="10" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#F4D35E"/><stop offset="1" stopColor="#F4D35E"/></linearGradient>
        <linearGradient id="bs1" x1="82" y1="0" x2="92" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#F4D35E"/><stop offset="1" stopColor="#F4D35E"/></linearGradient>
        <linearGradient id="bt1" x1="10" y1="0" x2="92" y2="9" gradientUnits="userSpaceOnUse"><stop stopColor="#F4D35E"/><stop offset="0.5" stopColor="#F4D35E"/><stop offset="1" stopColor="#F4D35E"/></linearGradient>
        <linearGradient id="bf2" x1="10" y1="0" x2="10" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#F4D35E"/><stop offset="1" stopColor="#F4D35E"/></linearGradient>
        <linearGradient id="bs2" x1="82" y1="0" x2="92" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#F4D35E"/><stop offset="1" stopColor="#F4D35E"/></linearGradient>
        <linearGradient id="bt2" x1="10" y1="0" x2="92" y2="9" gradientUnits="userSpaceOnUse"><stop stopColor="#F4D35E"/><stop offset="0.5" stopColor="#F4D35E"/><stop offset="1" stopColor="#F4D35E"/></linearGradient>
        <linearGradient id="bf3" x1="10" y1="0" x2="10" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#F4D35E"/><stop offset="1" stopColor="#F4D35E"/></linearGradient>
        <linearGradient id="bs3" x1="82" y1="0" x2="92" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#AA8828"/><stop offset="1" stopColor="#5F4010"/></linearGradient>
        <linearGradient id="bt3" x1="10" y1="0" x2="92" y2="9" gradientUnits="userSpaceOnUse"><stop stopColor="#F4D35E"/><stop offset="0.5" stopColor="#F4D35E"/><stop offset="1" stopColor="#F4D35E"/></linearGradient>
      </defs>
    </svg>
  );
}

function StableLightSheet({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(15,20,25,.20)", backdropFilter:"blur(7px)", WebkitBackdropFilter:"blur(7px)", zIndex:100, display:"flex", alignItems:"flex-end" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:480, margin:"0 auto", background:"#FFFFFF", border:"1px solid #E7E9EC", borderBottom:0, borderRadius:"22px 22px 0 0", padding:"11px 18px 28px", boxShadow:"0 -10px 35px rgba(15,20,25,.12)", transform:"translateY(0)", willChange:"transform", animation:"rxLightSheetUp .26s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ width:42, height:5, borderRadius:3, background:"#D9DDE1", margin:"0 auto 18px" }} />
        {children}
      </div>
    </div>
  );
}

function MoreSubScreen({ onBack, title, subtitle, rightElement, children }) {
  const lightPrefScreen = title === "Settings" || title === "Security" || title === "Notifications";
  const prefBg = "#F2F3F5";
  const prefText = "#111418";
  const prefBorder = "#E7E9EC";
  return (
    <div style={{ minHeight: "100%", animation: "slideInRight 0.2s ease", background: lightPrefScreen ? prefBg : T.card }}>
      <style>{"@keyframes slideInRight { from { transform: translateX(24px); opacity:0; } to { transform: translateX(0); opacity:1; } } @keyframes rxLightSheetUp { from { transform:translateY(100%); opacity:.7 } to { transform:translateY(0); opacity:1 } }"}</style>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px 10px", borderBottom: `1px solid ${lightPrefScreen ? prefBorder : T.cardBorder}`, background: lightPrefScreen ? prefBg : T.card }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: lightPrefScreen ? prefText : T.paper, cursor: "pointer", display: "flex", alignItems: "center", padding: "4px", borderRadius: 8, flexShrink: 0 }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          {title && <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: lightPrefScreen ? prefText : T.paper, lineHeight: 1.2 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 11, color: lightPrefScreen ? "#737B85" : T.muted, marginTop: 2 }}>{subtitle}</div>}
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
  const [hideBalances, setHideBalances] = useState(() => getStoredRainxSetting("hideBalances", false));
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
    hideBalances ? "••••••" : `GHS ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  useEffect(() => { const sync=()=>setHideBalances(getStoredRainxSetting("hideBalances", false)); window.addEventListener("focus",sync); document.addEventListener("visibilitychange",sync); return ()=>{window.removeEventListener("focus",sync);document.removeEventListener("visibilitychange",sync)}; }, []);

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
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(244,211,94,0.12)", border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
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
          <div style={{ position: "absolute", inset: 0, borderRadius: 18, background: "linear-gradient(135deg, rgba(244,211,94,0.07) 0%, transparent 60%)", pointerEvents: "none" }} />
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
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `rgba(244,211,94,0.12)`, border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
  const [hideBalances, setHideBalances] = useState(() => getStoredRainxSetting("hideBalances", false));
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
  const fmtGHS  = (n) => hideBalances ? "••••••" : `GHS ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  useEffect(() => { const sync=()=>setHideBalances(getStoredRainxSetting("hideBalances", false)); window.addEventListener("focus",sync); document.addEventListener("visibilitychange",sync); return ()=>{window.removeEventListener("focus",sync);document.removeEventListener("visibilitychange",sync)}; }, []);
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
    if (walletPage === "withdraw" && getStoredRainxSecuritySetting("withdrawConfirmations", true) !== false) {
      const ok = window.confirm(`Confirm withdrawal of GHS ${Number(amount).toLocaleString("en-GH", {minimumFractionDigits:2, maximumFractionDigits:2})} via ${payStep?.label || "selected method"}?`);
      if (!ok) return;
    }
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
          <button onClick={handleSubmit} disabled={busy} style={{ width: "100%", background: T.goldGradient, color: T.ink, border: "none", borderRadius: 13, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
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
          background: T.goldGradient,
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
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `rgba(244,211,94,0.12)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: isPos ? `rgba(244,211,94,0.12)` : `rgba(176,96,74,0.12)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

function HeaderAvatar({ account, morePage, T }) {
  const [url, setUrl] = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const fn = (t) => setTick(t);
    _avatarRefreshListeners.add(fn);
    return () => _avatarRefreshListeners.delete(fn);
  }, []);
  React.useEffect(() => {
    if (!account?.id) return;
    supabase.from("public_profiles").select("avatar_url").eq("id", account.id).single()
      .then(({ data }) => { if (data?.avatar_url) setUrl(data.avatar_url); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  }, [account?.id, tick]);
  // Show neutral circle while fetching — no email-derived initial during load
  if (!loaded) return <div style={{ width:42, height:42, borderRadius:"50%", background:T.cardBorder }} />;
  const initial = (account?.email || "?")[0].toUpperCase();
  return url
    ? <img src={url} alt="me" style={{ width:42, height:42, borderRadius:"50%", objectFit:"cover", border:`2px solid ${T.gold}` }} />
    : <div style={{ width:42, height:42, borderRadius:"50%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.ink }}>{initial}</div>;
}

function MoreTab({ autoScan, setAutoScan, analysis, inst, last, account, onLogout, onLogoutConfirm, setTab, entitlement, themeMode, setThemeMode, morePage, setMorePage, setProfileFromHeader, activeMarkets = [] }) {
  // morePage/setMorePage lifted to MainAppContent so sidebar can deep-link
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [benefits, setBenefits] = useState(DEFAULT_BENEFITS);
  const [verification, setVerification] = useState(null);
  const [showLegal, setShowLegal] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  // Security + Settings preferences are intentionally local to this app shell so
  // these controls can be added without changing the existing community, signal,
  // wallet, creator-space or home implementations.
  const [securityPrefs, setSecurityPrefs] = useState(() => {
    try { return JSON.parse(lsGet("rainx-security-prefs") || "{}"); } catch { return {}; }
  });
  const [securitySheet, setSecuritySheet] = useState(null);
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current:"", next:"", confirm:"" });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [mfaFactors, setMfaFactors] = useState({ totp:[], phone:[] });
  const [mfaEnrollment, setMfaEnrollment] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [recoveryStep, setRecoveryStep] = useState("phone");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [settingsPrefs, setSettingsPrefs] = useState(() => {
    try { return JSON.parse(lsGet("rainx-settings-prefs") || "{}"); } catch { return {}; }
  });
  const [settingsSheet, setSettingsSheet] = useState(null);
  const [accountSettingsLoaded, setAccountSettingsLoaded] = useState(false);
  const [securitySessions, setSecuritySessions] = useState([]);
  const [securitySessionsLoading, setSecuritySessionsLoading] = useState(false);
  const [loginHistoryRows, setLoginHistoryRows] = useState([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const loadBlockedAndMuted = useCallback(async () => {
    if (!account?.id) return;
    setBlockedLoading(true);
    try {
      const [{ data: blocked }, { data: muted }] = await Promise.all([
        supabase.from("user_blocks").select("blocked_id,created_at").eq("blocker_id", account.id).order("created_at", { ascending:false }),
        supabase.from("user_mutes").select("muted_id,created_at").eq("muter_id", account.id).order("created_at", { ascending:false }),
      ]);
      const blockedIds = (blocked || []).map(r => r.blocked_id).filter(Boolean);
      const mutedIds = (muted || []).map(r => r.muted_id).filter(Boolean);
      const ids = [...new Set([...blockedIds, ...mutedIds])];
      let profileMap = {};
      if (ids.length) {
        const { data: pub } = await supabase.from("public_profiles").select("id,display_name,full_name,username,avatar_url,badge,is_admin").in("id", ids);
        (pub || []).forEach(p => { profileMap[p.id] = p; });
        const missing = ids.filter(id => !profileMap[id]);
        if (missing.length) {
          const { data: priv } = await supabase.from("profiles").select("id,display_name,full_name,username,avatar_url,badge,is_admin").in("id", missing);
          (priv || []).forEach(p => { profileMap[p.id] = p; });
        }
      }
      setBlockedUsers(blockedIds.map(id => ({ id, profile: profileMap[id] || null })));
      setMutedUsers(mutedIds.map(id => ({ id, profile: profileMap[id] || null })));
    } finally { setBlockedLoading(false); }
  }, [account?.id]);
  useEffect(() => { if (settingsSheet === "blockedUsers") loadBlockedAndMuted(); }, [settingsSheet, loadBlockedAndMuted]);
  const [postVisibility, setPostVisibility] = useState(() => lsGet("rainx-post-visibility") || "public");

  const persistSecurity = async (patch) => {
    const previous = securityPrefs;
    const next = { ...previous, ...patch };
    setSecurityPrefs(next);
    try { lsSet("rainx-security-prefs", JSON.stringify(next)); } catch {}
    if (!account?.id) return true;
    const backendSafe = { ...next };
    delete backendSafe.pinHash;
    delete backendSafe.biometricCredentialId;
    const { error } = await supabase.from("account_settings").upsert({ user_id: account.id, security_prefs: backendSafe, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      setSecurityPrefs(previous);
      try { lsSet("rainx-security-prefs", JSON.stringify(previous)); } catch {}
      alert("Could not save this security setting. Nothing was changed.");
      return false;
    }
    return true;
  };
  const persistSettings = async (patch) => {
    const previous = settingsPrefs;
    const next = { ...previous, ...patch };
    setSettingsPrefs(next);
    try { lsSet("rainx-settings-prefs", JSON.stringify(next)); } catch {}
    if (!account?.id) return true;
    const { error } = await supabase.from("account_settings").upsert({ user_id: account.id, settings: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      setSettingsPrefs(previous);
      try { lsSet("rainx-settings-prefs", JSON.stringify(previous)); } catch {}
      alert("Could not save this setting. Nothing was changed.");
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!account?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("account_settings").select("settings,security_prefs").eq("user_id", account.id).maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        if (data.settings && typeof data.settings === "object") {
          setSettingsPrefs(prev => ({ ...prev, ...data.settings }));
          lsSet("rainx-settings-prefs", JSON.stringify({ ...settingsPrefs, ...data.settings }));
        }
        if (data.security_prefs && typeof data.security_prefs === "object") {
          setSecurityPrefs(prev => ({ ...prev, ...data.security_prefs }));
          lsSet("rainx-security-prefs", JSON.stringify({ ...securityPrefs, ...data.security_prefs }));
        }
      }
      setAccountSettingsLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [account?.id]);

  const loadSecuritySessions = useCallback(async () => {
    if (!account?.id) return;
    setSecuritySessionsLoading(true);
    try {
      const [{ data: sessionData }, { data: activityData }] = await Promise.all([
        supabase.rpc("get_my_auth_sessions"),
        supabase.from("activity_logs").select("id,action,meta,created_at").eq("user_id", account.id).in("action", ["login","signup"]).order("created_at", { ascending:false }).limit(30),
      ]);
      setSecuritySessions(sessionData || []);
      setLoginHistoryRows(activityData || []);
    } finally { setSecuritySessionsLoading(false); }
  }, [account?.id]);

  useEffect(() => {
    if (settingsSheet !== "sessions" && settingsSheet !== "loginHistory") return;
    setLoginHistoryLoading(true);
    loadSecuritySessions().finally(() => setLoginHistoryLoading(false));
  }, [settingsSheet, loadSecuritySessions]);

  const hashPin = hashRainxPin;
  const setupPin = async () => {
    setPinError("");
    if (!/^\d{4,6}$/.test(pinValue)) { setPinError("Enter a 4–6 digit PIN."); return; }
    if (pinValue !== pinConfirm) { setPinError("PINs do not match."); return; }
    try {
      if (securityPrefs.pinEnabled) {
        if (!/^\d{4,6}$/.test(pinCurrent) || await hashPin(pinCurrent) !== securityPrefs.pinHash) { setPinError("Current PIN is incorrect."); return; }
      }
      const hash = await hashPin(pinValue);
      persistSecurity({ pinEnabled: true, pinHash: hash });
      setPinCurrent(""); setPinValue(""); setPinConfirm(""); setSecuritySheet(null);
    } catch { setPinError("Unable to save PIN on this device."); }
  };
  const loadMfaFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setMfaError(error.message); return; }
    setMfaFactors({ totp: data?.totp || [], phone: data?.phone || [] });
    const enabled = [...(data?.totp || []), ...(data?.phone || [])].some(f => f.status === "verified");
    if (securityPrefs.twoFactorEnabled !== enabled) await persistSecurity({ twoFactorEnabled: enabled });
  }, [securityPrefs.twoFactorEnabled]);

  const beginTotpEnrollment = async () => {
    setMfaError(""); setMfaBusy(true); setMfaEnrollment(null); setMfaCode("");
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const existing = (factors?.totp || []).find(f => f.status === "unverified" && f.friendly_name === "RainX Authenticator");
      if (existing) await supabase.auth.mfa.unenroll({ factorId: existing.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType:"totp", friendlyName:"RainX Authenticator" });
      if (error) throw error;
      setMfaEnrollment(data);
    } catch (e) { setMfaError(e?.message || "Unable to start authenticator setup."); }
    finally { setMfaBusy(false); }
  };

  const verifyTotpEnrollment = async () => {
    if (!mfaEnrollment?.id || !/^\d{6}$/.test(mfaCode)) { setMfaError("Enter the 6-digit code from your authenticator app."); return; }
    setMfaBusy(true); setMfaError("");
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId:mfaEnrollment.id });
      if (challengeError) throw challengeError;
      const { error } = await supabase.auth.mfa.verify({ factorId:mfaEnrollment.id, challengeId:challenge.id, code:mfaCode });
      if (error) throw error;
      setMfaEnrollment(null); setMfaCode("");
      await loadMfaFactors();
      await persistSecurity({ twoFactorEnabled:true });
    } catch (e) { setMfaError(e?.message || "The code is incorrect or expired."); }
    finally { setMfaBusy(false); }
  };

  const disableMfaFactor = async (factorId) => {
    setMfaBusy(true); setMfaError("");
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await supabase.auth.refreshSession();
      await loadMfaFactors();
      const { data } = await supabase.auth.mfa.listFactors();
      await persistSecurity({ twoFactorEnabled:(data?.totp || []).some(f=>f.status === "verified") || (data?.phone || []).some(f=>f.status === "verified") });
    } catch (e) { setMfaError(e?.message || "Unable to remove this factor."); }
    finally { setMfaBusy(false); }
  };

  const changePassword = async () => {
    setMfaError("");
    if (!passwordForm.current || passwordForm.next.length < 8 || passwordForm.next !== passwordForm.confirm) { setMfaError("Enter your current password and a matching new password of at least 8 characters."); return; }
    setPasswordBusy(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email:account?.email || "", password:passwordForm.current });
      if (reauthError) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password:passwordForm.next });
      if (error) throw error;
      await recordActivity(account.id, "password_changed", { source:"security_settings" });
      setPasswordForm({current:"",next:"",confirm:""}); setSettingsSheet(null); setSecuritySheet(null);
      alert("Your password was changed successfully.");
    } catch (e) { setMfaError(e?.message || "Unable to change your password."); }
    finally { setPasswordBusy(false); }
  };

  const sendRecoveryPhone = async () => {
    setRecoveryError("");
    if (!/^\+?[1-9]\d{7,14}$/.test(recoveryPhone.replace(/\s+/g,""))) { setRecoveryError("Enter a valid phone number with country code."); return; }
    setRecoveryBusy(true);
    try {
      const phone = recoveryPhone.replace(/\s+/g,"");
      const { error } = await supabase.auth.updateUser({ phone });
      if (error) throw error;
      setRecoveryStep("otp");
    } catch (e) { setRecoveryError(e?.message || "Unable to send the verification code. Check that SMS verification is enabled."); }
    finally { setRecoveryBusy(false); }
  };

  const verifyRecoveryPhone = async () => {
    if (!/^\d{6}$/.test(recoveryOtp)) { setRecoveryError("Enter the 6-digit verification code."); return; }
    setRecoveryBusy(true); setRecoveryError("");
    try {
      const { error } = await supabase.auth.verifyOtp({ phone:recoveryPhone.replace(/\s+/g,""), token:recoveryOtp, type:"phone_change" });
      if (error) throw error;
      setRecoveryStep("phone"); setRecoveryOtp(""); setRecoveryError("");
      alert("Recovery phone verified successfully.");
    } catch (e) { setRecoveryError(e?.message || "The verification code is invalid or expired."); }
    finally { setRecoveryBusy(false); }
  };

  useEffect(() => {
    if (!securityPrefs.biometricEnabled) return;
    (async () => {
      try {
        const supported = "PublicKeyCredential" in window && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
          ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false)
          : false;
        if (!supported) await persistSecurity({ biometricEnabled:false, biometricCredentialId:null });
      } catch {}
    })();
  }, [securityPrefs.biometricEnabled]);

  useEffect(() => {
    if (securitySheet === "twoFactor") loadMfaFactors();
    if (securitySheet === "recovery") {
      supabase.auth.getUser().then(({data}) => setRecoveryPhone(data?.user?.phone || ""));
      setRecoveryStep("phone"); setRecoveryOtp(""); setRecoveryError("");
    }
  }, [securitySheet, loadMfaFactors]);

  const setupPasskey = async () => {
    try {
      if (!("PublicKeyCredential" in window) || !navigator.credentials?.create) {
        alert("Face ID / device passkeys are not supported on this device or browser.");
        return;
      }
      const platformReady = typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
        ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false)
        : true;
      if (platformReady === false) {
        alert("A device biometric authenticator is not available. You can use a PIN instead.");
        return;
      }
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));
      const credential = await navigator.credentials.create({ publicKey: {
        challenge,
        rp: { name: "RainX" },
        user: { id: userId, name: account?.email || "rainx-user", displayName: fullName || username || "RainX User" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 60000,
        attestation: "none",
      }});
      if (credential?.rawId) {
        const id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        persistSecurity({ biometricEnabled: true, biometricCredentialId: id });
      }
    } catch (e) {
      if (e?.name !== "NotAllowedError") alert("Face ID / passkey setup could not be completed.");
    }
  };
  useEffect(() => {
    if (morePage !== "profile-menu") setAppearanceOpen(false);
  }, [morePage]);
  // PWA install — deferred prompt + installed flag
  const [installPrompt, setInstallPrompt] = useState(null);
  const [appInstalled, setAppInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
  useEffect(() => {
    if (appInstalled) return;
    const _bip = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const _ai  = () => { setAppInstalled(true); setInstallPrompt(null); };
    window.addEventListener('beforeinstallprompt', _bip);
    window.addEventListener('appinstalled', _ai);
    return () => { window.removeEventListener('beforeinstallprompt', _bip); window.removeEventListener('appinstalled', _ai); };
  }, [appInstalled]);
  // Trader Rewards progress counters — declared here (Rules of Hooks: no hooks after early returns)
  const [followerCount, setFollowerCount] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [impressionCount, setImpressionCount] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  useEffect(() => {
    if (!account?.id) return;
    supabase.from("follows").select("*",{count:"exact",head:true}).eq("followed_id",account.id)
      .then(({count})=>setFollowerCount(count||0)).catch(()=>{});
    supabase.from("referrals").select("*",{count:"exact",head:true}).eq("referrer_id",account.id).eq("status","qualified")
      .then(({count})=>setReferralCount(count||0)).catch(()=>{});
    supabase.from("community_posts").select("views").eq("user_id",account.id)
      .then(({data})=>setImpressionCount((data||[]).reduce((s,p)=>s+(p.views||0),0))).catch(()=>{});
  }, [account?.id]);

  // Map subscription tier → verification badge (single source of truth)
  const tierToVerif = (t) => {
    if (t === "yearly") return "golden";
    if (t === "monthly" || t === "weekly") return "blue";
    return null;
  };

  useEffect(() => {
    if (!account?.id) return;
    supabase.from("profiles").select("username, full_name, bio, avatar_url, referral_code").eq("id", account.id).single().then(({ data }) => {
      if (data) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || null);
        setReferralCode(data.referral_code || "");
      }
      setProfileLoaded(true);
    }).catch(() => { setProfileLoaded(true); });
    supabase.from("site_content").select("value").eq("key", "more_benefits").single().then(({ data }) => {
      if (data?.value) { try { setBenefits(JSON.parse(data.value)); } catch { /* use defaults */ } }
    });
  }, [account?.id]);

  // Derive verification from live entitlement and keep DB in sync
  useEffect(() => {
    if (!account?.id || entitlement.tier === "loading") return;
    supabase.from("profiles").select("is_official").eq("id", account.id).single().then(({ data: prof }) => {
      if (prof?.is_official) {
        // Official accounts (RainX, Raina AI, etc.) always stay official-badged — never derived from subscription status
        setVerification("official");
        supabase.from("profiles").update({ badge: "official" }).eq("id", account.id).then(() => {});
        return;
      }
      const expected = tierToVerif(entitlement.tier);
      setVerification(expected);
      supabase.from("profiles").update({ badge: expected || "none" }).eq("id", account.id).then(() => {});
    });
  }, [account?.id, entitlement.tier]);

  const compressImage = (file, maxDim = 400, quality = 0.82) => new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else        { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(src);
      // Prefer WebP; fall back to JPEG if browser returns null blob
      canvas.toBlob((blob) => {
        if (blob) { resolve(blob); return; }
        canvas.toBlob((jpegBlob) => resolve(jpegBlob || file), "image/jpeg", quality);
      }, "image/webp", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("Image load failed")); };
    img.src = src;
  });

  // Helper: detect the actual MIME type from a Blob (WebP or JPEG)
  const blobMime = (blob) => blob?.type || "image/jpeg";

  const uploadAvatar = async (file) => {
    setUploadingAvatar(true);
    try {
      const blob = await compressImage(file, 400, 0.82);
      if (!blob) throw new Error("Image compression returned empty result");
      const mime = blobMime(blob);
      const ext = mime === "image/webp" ? "webp" : "jpg";
      const path = `${account.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: mime });
      if (upErr) throw new Error("Storage upload failed: " + upErr.message);
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      if (!urlData?.publicUrl) throw new Error("Could not get public URL after upload");
      const versionedUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: versionedUrl }).eq("id", account.id);
      if (dbErr) throw new Error("Failed to save photo: " + dbErr.message);
      setAvatarUrl(versionedUrl);
      notifyAvatarRefresh();
      setProfileMsg("Photo updated. ✓");
    } catch (err) { setProfileMsg("Photo upload failed: " + (err?.message || "unknown")); }
    setUploadingAvatar(false);
  };

  const uploadCover = async (file) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const blob = await compressImage(file, 1280, 0.82);
      if (!blob) throw new Error("Image compression returned empty result");
      const mime = blobMime(blob);
      const ext = mime === "image/webp" ? "webp" : "jpg";
      const path = `${account.id}/cover.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: mime });
      if (upErr) throw new Error("Storage upload failed: " + upErr.message);
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      if (!urlData?.publicUrl) throw new Error("Could not get public URL after upload");
      const versionedUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase.from("profiles").update({ cover_url: versionedUrl }).eq("id", account.id);
      if (dbErr) throw new Error("Cover save failed: " + dbErr.message);
      // Re-read to confirm persistence
      const { data: confirmed } = await supabase.from("profiles").select("cover_url").eq("id", account.id).single();
      setCoverUrl(confirmed?.cover_url || versionedUrl);
    } catch (err) { setProfileMsg("Cover upload failed: " + (err?.message || "unknown")); }
    setUploadingCover(false);
  };


  const uploadCoverBlob = async (blob) => {
    if (!blob) return;
    setUploadingCover(true);
    try {
      const path = `${account.id}/cover.jpg`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (upErr && upErr.statusCode !== '200' && upErr.statusCode !== '409') throw upErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const versionedUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase.from('profiles').update({ cover_url: versionedUrl }).eq('id', account.id);
      if (dbErr) throw new Error('Cover save failed: ' + dbErr.message);
      // Re-read to confirm persistence
      const { data: confirmed } = await supabase.from('profiles').select('cover_url').eq('id', account.id).single();
      setCoverUrl(confirmed?.cover_url || versionedUrl);
    } catch (err) { setProfileMsg('Cover upload failed: ' + (err?.message || 'unknown')); }
    setUploadingCover(false);
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
    entitlement.tier === "yearly"   ? "Yearly Rewards"    : "Loading…";

  const verificationLabel =
    verification === "golden" ? "Golden Verified" :
    verification === "blue"   ? "Blue Verified"   :
    verification === "verified" || verification === "basic" ? "Verified" :
    "Not Verified";

  const BLUE = "#5B9CF6";
  const verificationColor =
    verification === "golden" ? T.goldBright :
    verification === "blue"   ? BLUE         : T.muted;

  // Don't expose email as initial before profile loads — show neutral "?" until username resolves
  const profileInitial = (username || (profileLoaded ? account?.email : null) || "?")[0]?.toUpperCase();

  // ---- Sub-screens ----
  // Extended profile state (load on open)
  const [location, setLocation] = useState("");
  const [dob, setDob] = useState("");
  const [profileFollowers, setProfileFollowers] = useState(0);
  const [profileFollowing, setProfileFollowing] = useState(0);
  const [showFollowListOwn, setShowFollowListOwn] = useState(null); // "followers" | "following" | null
  const [dobPrivacy, setDobPrivacy] = useState(() => lsGet("rainx-dob-privacy") || "daymonth");
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [coverUrl, setCoverUrl] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [profilePosts, setProfilePosts] = useState([]);
  const [profileTab, setProfileTab] = useState("posts");
  const [profilePostsLoading, setProfilePostsLoading] = useState(false);
  const [profileComposerText, setProfileComposerText] = useState("");
  const [profileComposerPosting, setProfileComposerPosting] = useState(false);
  const [showProfileFabModal, setShowProfileFabModal] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  useEffect(() => {
    if (!account?.id || morePage !== "profile") return;
    supabase.from("profiles").select("full_name,location,date_of_birth,cover_url").eq("id",account.id).single().then(({data})=>{
      if(data){ setFullName(data.full_name||""); setLocation(data.location||""); setDob(data.date_of_birth||""); if(data.cover_url) setCoverUrl(data.cover_url); }
    }).catch(()=>{});
    setProfilePostsLoading(true);
    (async () => {
      try {
        const { data } = await supabase.from("community_posts").select("*").eq("user_id",account.id).order("created_at",{ascending:false});
        const rows = data || [];
        setProfilePosts(rows);
        setProfilePostsLoading(false);
      } catch { setProfilePostsLoading(false); }
    })();

    supabase.from("follows").select("*",{count:"exact",head:true}).eq("followed_id",account.id).then(({count})=>setProfileFollowers(count||0), ()=>{});
    supabase.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",account.id).then(({count})=>setProfileFollowing(count||0), ()=>{});

    // Mutual followers: people who follow me AND whom I follow
    supabase.from("follows").select("follower_id").eq("followed_id", account.id).then(({ data: theyFollowMe }) => {
      const theirIds = (theyFollowMe || []).map(r => r.follower_id);
      if (!theirIds.length) { setMutualFollowers([]); return; }
      supabase.from("follows").select("followed_id").eq("follower_id", account.id).then(({ data: iFollow }) => {
        const iFollowIds = new Set((iFollow || []).map(r => r.followed_id));
        const mutualIds = theirIds.filter(id => iFollowIds.has(id));
        if (!mutualIds.length) { setMutualFollowers([]); return; }
        supabase.from("profiles").select("id,username,avatar_url,email").in("id", mutualIds.slice(0, 5))
          .then(({ data }) => setMutualFollowers(data || [])).catch(() => {});
      }).catch(() => {});
    }).catch(() => {});
  },[account?.id, morePage]);


  // ── last_seen heartbeat ──────────────────────────────────────────────────
  useEffect(() => {
    if (!account?.id) return;
    const bump = async () => { try { await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", account.id); } catch(e) {} };
    bump(); // immediate on mount
    const iv = setInterval(bump, 60_000);
    return () => clearInterval(iv);
  }, [account?.id]);
  const saveProfileExtended = async () => {
    setSavingProfile(true); setProfileMsg("");
    const clean = username.trim().replace(/[^a-zA-Z0-9_.@-]/g,"").slice(0,30)||null;

    // Single consolidated update — all fields at once to avoid partial saves
    const payload = {
      username: clean,
      bio: bio.trim(),
      display_name: clean || fullName.trim() || null,
    };
    payload.full_name     = fullName.trim() || null;
    payload.location      = location.trim() || null;
    payload.date_of_birth = dob || null;

    const { error: saveErr } = await supabase.from("profiles").update(payload).eq("id", account.id);

    if (saveErr) {
      setSavingProfile(false);
      setProfileMsg(saveErr.code === "23505" ? "That username is taken." : "Save failed: " + saveErr.message);
      return;
    }

    // Re-read ALL fields from DB to confirm the save and refresh UI
    const { data: fresh, error: reReadErr } = await supabase.from("profiles")
      .select("username, bio, avatar_url, full_name, location, date_of_birth, cover_url")
      .eq("id", account.id).single();
    if (fresh && !reReadErr) {
      if (fresh.username   !== undefined) setUsername(fresh.username || "");
      if (fresh.bio        !== undefined) setBio(fresh.bio || "");
      if (fresh.avatar_url)               setAvatarUrl(fresh.avatar_url);
      if (fresh.full_name  !== undefined) setFullName(fresh.full_name || "");
      if (fresh.location      !== undefined) setLocation(fresh.location || "");
      if (fresh.date_of_birth !== undefined) setDob(fresh.date_of_birth || "");
      if (fresh.cover_url)               setCoverUrl(fresh.cover_url);
      setSavingProfile(false);
      setProfileMsg("Saved. ✓");
      notifyAvatarRefresh();
    } else {
      setSavingProfile(false);
      setProfileMsg(reReadErr ? "Saved but couldn't confirm — please refresh." : "Saved. ✓");
      notifyAvatarRefresh();
    }
  };

  if (cropFile) return <CoverCropModal file={cropFile} onConfirm={blob => { setCropFile(null); uploadCoverBlob(blob); }} onCancel={() => { setCropFile(null); }} T={T} FONT_HEAD={FONT_HEAD} />;

  if (morePage === "profile-menu") return (
    <div style={{ minHeight:"100%", background:T.ink, animation:"slideInRight 0.2s ease" }}>
      <style>{"@keyframes slideInRight { from { transform: translateX(24px); opacity:0; } to { transform: translateX(0); opacity:1; } }"}</style>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 8px" }}>
        <button onClick={() => { setMorePage(null); if (setProfileFromHeader) setProfileFromHeader(false); }} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, padding:4 }}>
          <X size={22} />
        </button>
      </div>
      {/* Menu cards */}
      <div style={{ padding:"8px 16px 0", display:"grid", gridTemplateColumns:"repeat(2, minmax(0, 1fr))", gap:12 }}>
        {/* Profile + Security row */}
        {[
          { label:"Profile", icon:Users2, page:"profile", wide:true },
          { label:"Security", icon:ShieldCheck, page:"security" },
        ].map(item => (
          <button key={item.label} onClick={() => setMorePage(item.page)}
            style={{ width:"100%", minHeight:item.wide ? 88 : 98, gridColumn:item.wide ? "1 / -1" : "auto", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:18, padding:item.wide ? "13px" : "13px 12px", textAlign:"left", cursor:"pointer", display:"flex", flexDirection:"column", gap:5, position:"relative" }}>
            <ChevronRight size={13} color={T.muted} style={{ position:"absolute", top:14, right:14 }} />
            <div style={{ width:36, height:36, borderRadius:"50%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <item.icon size={17} color={T.ink} />
            </div>
            <div style={{ width:26, height:3, borderRadius:2, background:T.gold, marginTop:4 }} />
            <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>{item.label}</div>
          </button>
        ))}

        {/* Appearance — standalone, before Settings */}
        <button onClick={() => setAppearanceOpen(true)}
          style={{ width:"100%", minHeight:98, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:18, padding:"13px 12px", textAlign:"left", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:5, position:"relative" }}>
          <ChevronRight size={13} color={T.muted} style={{ position:"absolute", top:14, right:14 }} />
          <div style={{ width:36, height:36, borderRadius:"50%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Palette size={17} color={T.ink} />
          </div>
          <div style={{ width:26, height:3, borderRadius:2, background:T.gold, marginTop:4 }} />
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>Appearance</div>
        </button>

        {/* Settings */}
        <button onClick={() => setMorePage("settings")}
          style={{ width:"100%", minHeight:98, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:18, padding:"13px 12px", textAlign:"left", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:5, position:"relative" }}>
          <ChevronRight size={13} color={T.muted} style={{ position:"absolute", top:14, right:14 }} />
          <div style={{ width:36, height:36, borderRadius:"50%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Settings size={17} color={T.ink} />
          </div>
          <div style={{ width:26, height:3, borderRadius:2, background:T.gold, marginTop:4 }} />
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>Settings</div>
        </button>

        {/* Account activity & history */}
        <button onClick={() => setMorePage("history")}
          style={{ width:"100%", minHeight:98, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:18, padding:"13px 12px", textAlign:"left", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:5, position:"relative" }}>
          <ChevronRight size={13} color={T.muted} style={{ position:"absolute", top:14, right:14 }} />
          <div style={{ width:36, height:36, borderRadius:"50%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Activity size={17} color={T.ink} />
          </div>
          <div style={{ width:26, height:3, borderRadius:2, background:T.gold, marginTop:4 }} />
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>Activity & History</div>
        </button>

        {/* Privacy & data center */}
        <button onClick={() => setMorePage("privacy-center")}
          style={{ width:"100%", minHeight:98, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:18, padding:"13px 12px", textAlign:"left", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:5, position:"relative" }}>
          <ChevronRight size={13} color={T.muted} style={{ position:"absolute", top:14, right:14 }} />
          <div style={{ width:36, height:36, borderRadius:"50%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Eye size={17} color={T.ink} />
          </div>
          <div style={{ width:26, height:3, borderRadius:2, background:T.gold, marginTop:4 }} />
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>Privacy & Data</div>
        </button>

        {/* Creator & token safety */}
        <button onClick={() => setMorePage("creator-safety")}
          style={{ width:"100%", minHeight:98, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:18, padding:"13px 12px", textAlign:"left", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:5, position:"relative" }}>
          <ChevronRight size={13} color={T.muted} style={{ position:"absolute", top:14, right:14 }} />
          <div style={{ width:36, height:36, borderRadius:"50%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <ShieldCheck size={17} color={T.ink} />
          </div>
          <div style={{ width:26, height:3, borderRadius:2, background:T.gold, marginTop:4 }} />
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>Creator & Token Safety</div>
        </button>

        {/* Logout */}
        <button onClick={() => onLogoutConfirm && onLogoutConfirm()}
          style={{ width:"100%", minHeight:88, gridColumn:"1 / -1", background:"rgba(176,96,74,0.08)", border:"1px solid rgba(176,96,74,0.25)", borderRadius:18, padding:"13px", textAlign:"left", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:5, position:"relative" }}>
          <ChevronRight size={13} color={T.rust} style={{ position:"absolute", top:14, right:14 }} />
          <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(176,96,74,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <LogOut size={17} color={T.rust} />
          </div>
          <div style={{ width:26, height:3, borderRadius:2, background:T.rust, marginTop:4 }} />
          <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.rust }}>Logout</div>
        </button>
      </div>
      <div style={{ padding:"24px 20px 0", textAlign:"center" }}>
        <div style={{ fontSize:10.5, color:T.muted, lineHeight:1.7 }}>RainX is an analysis tool, not a broker.<br/>AI analysis is not financial advice.</div>
      </div>

      {appearanceOpen && (
        <div onClick={() => setAppearanceOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.16)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", zIndex:60, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <style>{"@keyframes rxSheetUp { from { transform:translateY(100%) } to { transform:translateY(0) } }"}</style>
          <div onClick={(e) => e.stopPropagation()} style={{ background:"#ffffff", borderRadius:24, padding:"14px 14px 28px", animation:"rxSheetUp 0.28s cubic-bezier(0.22,1,0.36,1)" }}>
            <div style={{ width:42, height:5, borderRadius:3, background:"#e2e2e2", margin:"0 auto 18px" }} />
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:20, color:"#2d2d2d", textAlign:"center", marginBottom:22 }}>Choose appearance</div>
            <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
              {[["light","Always light"],["dark","Always dark"],["system","Device settings"]].map(([val,label]) => {
                const selected = themeMode === val;
                const mode = val === "system" ? "split" : val;
                return (
                  <button key={val} onClick={() => { lsSet("rainx-theme", val); setThemeMode(val); }} style={{ flex:1, background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                    {renderAppearancePhone(mode)}
                    <div style={{ width:22, height:22, borderRadius:"50%", border: "2px solid " + (selected ? "#4a6d7c" : "#cfcfcf"), display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {selected && <div style={{ width:12, height:12, borderRadius:"50%", background:"#4a6d7c" }} />}
                    </div>
                    <div style={{ fontFamily:FONT_HEAD, fontWeight:600, fontSize:12, color:"#2d2d2d" }}>{label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (morePage === "profile") {
    const joinedRaw = account?.joinedAt || account?.created_at;
    const joinedLabel = joinedRaw ? (() => {
      const d = new Date(joinedRaw);
      if (isNaN(d)) return null;
      return `Joined ${d.toLocaleString("default", { month: "long" })}, ${d.getFullYear()}`;
    })() : null;
    const dobDisplay = (() => {
      if (!dob) return null;
      const d = new Date(dob);
      if (isNaN(d)) return null;
      const month = d.toLocaleString("default", { month: "long" });
      const day = d.getDate();
      const year = d.getFullYear();
      if (dobPrivacy === "everyone") return `${month} ${day}, ${year}`;
      if (dobPrivacy === "daymonth" || dobPrivacy === "friends") return `${month} ${day}`;
      return null;
    })();
    const CamIcon = () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
      </svg>
    );
    return (
      <div style={{ minHeight:"100%", background:T.ink, overflowY:"auto" }}>
        <style>{"@keyframes slideInRight { from { transform:translateX(24px); opacity:0 } to { transform:translateX(0); opacity:1 } } @keyframes sheetUp { from { transform:translateY(100%) } to { transform:translateY(0) } }"}</style>

        {/* ── Bug 2 fix: Followers/Following modal for own profile ── */}
        {showFollowListOwn && (
          <FollowListModal
            userId={account.id}
            type={showFollowListOwn}
            viewerId={account.id}
            onClose={() => setShowFollowListOwn(null)}
            onOpenProfile={(uid) => { setShowFollowListOwn(null); setTab("community"); }}
          />
        )}

        {/* ── Share bottom sheet ── */}
        {showShareSheet && (
          <div onClick={() => setShowShareSheet(false)} style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.55)" }}>
            <div onClick={e => e.stopPropagation()}
              style={{ position:"absolute", bottom:0, left:0, right:0, background:T.card, borderRadius:"20px 20px 0 0", padding:"16px 20px 40px", animation:"sheetUp 0.28s ease" }}>
              <div style={{ width:40, height:4, borderRadius:2, background:T.cardBorder, margin:"0 auto 18px" }} />
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22, padding:"0 4px" }}>
                {avatarUrl
                  ? <img src={avatarUrl} style={{ width:46, height:46, borderRadius:"50%", objectFit:"cover", border:`2px solid ${T.gold}` }} alt="" />
                  : <div style={{ width:46, height:46, borderRadius:"50%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.ink, flexShrink:0 }}>{profileInitial}</div>
                }
                <div>
                  <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper }}>{fullName || username || account?.email?.split("@")[0]}</div>
                  {username && <div style={{ fontSize:12, color:T.muted }}>@{username}</div>}
                </div>
              </div>
              {[
                { emoji:"🔗", label:"Copy profile link", action: () => { try { navigator.clipboard?.writeText(window.location.href); } catch(e) {} setShowShareSheet(false); } },
                { emoji:"📤", label:"Share via…",        action: () => { try { navigator.share?.({ title: username || "My RainX Profile", url: window.location.href }); } catch(e) {} setShowShareSheet(false); } },
              ].map(({ emoji, label, action }) => (
                <button key={label} onClick={action}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 8px", background:"none", border:"none", borderBottom:`1px solid ${T.cardBorder}`, cursor:"pointer" }}>
                  <span style={{ fontSize:20 }}>{emoji}</span>
                  <span style={{ fontFamily:FONT_HEAD, fontWeight:600, fontSize:14, color:T.paper }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Sticky minimal header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", position:"sticky", top:0, zIndex:10, background:"rgba(15,14,11,0.94)", backdropFilter:"blur(8px)", borderBottom:`1px solid ${T.cardBorder}` }}>
          <button onClick={() => setMorePage("profile-menu")} style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.07)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <ChevronLeft size={20} color={T.paper} />
          </button>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper }}>Profile</div>
          <div style={{ width:36 }} />
        </div>

        {/* ── Banner (tappable to change cover) + Avatar + action buttons ── */}
        <div style={{ position:"relative", animation:"slideInRight 0.2s ease" }}>
          {/* Banner — click to upload cover */}
          <label style={{ display:"block", cursor:"pointer", position:"relative" }}>
            <input type="file" accept="image/*" onChange={e => e.target.files[0] && setCropFile(e.target.files[0])} style={{ display:"none" }} disabled={uploadingCover} />
            {coverUrl
              ? <img src={coverUrl} style={{ width:"100%", height:110, objectFit:"cover", display:"block" }} alt="" />
              : <div style={{ width:"100%", height:110, background:`linear-gradient(135deg,#1a160d 0%,#231d10 55%,${T.gold}28 100%)` }} />
            }
            {/* Camera badge — small corner icon, does not cover the photo */}
            <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.55)", borderRadius:"50%", padding:7, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
              <CamIcon />
            </div>
          </label>

          {/* Avatar overlapping banner — tappable for avatar upload */}
          <label style={{ position:"absolute", bottom:-48, left:14, cursor:"pointer" }}>
            <input type="file" accept="image/*" onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} style={{ display:"none" }} disabled={uploadingAvatar} />
            <div style={{ width:92, height:92, borderRadius:"50%", border:`3px solid ${T.gold}`, boxShadow:`0 0 0 3px ${T.ink}`, overflow:"hidden", position:"relative" }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ width:"100%", height:"100%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", color:T.ink, fontWeight:800, fontFamily:FONT_HEAD, fontSize:32 }}>{profileInitial}</div>
              }
              {/* Camera badge on avatar — bottom-right corner only */}
              <div style={{ position:"absolute", bottom:2, right:2, background:"rgba(0,0,0,0.6)", borderRadius:"50%", padding:5, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <CamIcon />
              </div>
            </div>
          </label>

          {/* Share + Edit profile buttons — right side, below banner */}
          <div style={{ position:"absolute", bottom:-44, right:14, display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setShowShareSheet(true)}
              style={{ background:"none", border:`1.5px solid ${T.cardBorder}`, borderRadius:22, padding:"9px 16px", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper, cursor:"pointer", lineHeight:1, flexShrink:0, whiteSpace:"nowrap" }}>
              Share
            </button>
            <button onClick={() => setMorePage("profile-edit")}
              style={{ background:T.goldGradient, border:"none", borderRadius:22, padding:"9px 16px", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.ink, cursor:"pointer", lineHeight:1, flexShrink:0, whiteSpace:"nowrap" }}>
              Edit profile
            </button>
          </div>
        </div>

        {/* Spacer for overlap */}
        <div style={{ height:60 }} />

        {/* ── Profile info ── */}
        <div style={{ padding:"0 16px 8px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
            <span style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:20, color:T.paper, lineHeight:1.2 }}>{fullName || username || (profileLoaded ? account?.email : "")}</span>
            <CommunityBadge isAdmin={false} badge={verification || "none"} isPro={false} />
          </div>
          {username && <div style={{ fontSize:13.5, color:T.muted, marginBottom:7 }}>@{username}</div>}
          {bio && <div style={{ fontSize:13.5, color:T.paper, marginBottom:9, lineHeight:1.65 }}>{bio}</div>}
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:"4px 14px", marginBottom:9 }}>
            {location && <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12.5, color:T.muted }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {location}
            </span>}
            {joinedLabel && <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12.5, color:T.muted }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {joinedLabel}
            </span>}
            {dobDisplay && <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12.5, color:T.muted }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {dobDisplay}
            </span>}
          </div>
          <div style={{ display:"flex", gap:20, marginBottom:10 }}>
            <button onClick={() => setShowFollowListOwn("following")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}>
              <strong style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper }}>{formatCount(profileFollowing)}</strong><span style={{ fontSize:14, color:T.muted }}> Following</span>
            </button>
            <button onClick={() => setShowFollowListOwn("followers")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}>
              <strong style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper }}>{formatCount(profileFollowers)}</strong><span style={{ fontSize:14, color:T.muted }}> Followers</span>
            </button>
          </div>
          {mutualFollowers.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, fontSize:12.5, color:T.muted }}>
              <div style={{ display:"flex", alignItems:"center" }}>
                {mutualFollowers.slice(0, 3).map((f, i) => (
                  <div key={f.id} style={{ width:22, height:22, borderRadius:"50%", marginLeft:i > 0 ? -7 : 0, border:`1.5px solid ${T.ink}`, overflow:"hidden", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_HEAD, fontWeight:700, fontSize:8, color:T.ink, flexShrink:0 }}>
                    {f.avatar_url ? <img src={f.avatar_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" /> : (f.username || f.email || "?")[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
              <span>Followed by {mutualFollowers.slice(0, 2).map(f => f.username || f.email?.split("@")[0]).join(", ")}{mutualFollowers.length > 2 ? ` and ${mutualFollowers.length - 2} others` : ""}</span>
            </div>
          )}
        </div>

        {/* ── Posts / Reposts — same interaction model as Community profiles ── */}
        <div style={{ borderTop:`1px solid ${T.cardBorder}`, display:"grid", gridTemplateColumns:"1fr 1fr" }}>
          {[
            { key:"posts", label:"Posts", icon:null },
            { key:"reposts", label:"Reposts", icon:Repeat2 },
          ].map(({ key, label, icon:Icon }) => (
            <button key={key} onClick={() => setProfileTab(key)}
              style={{ background:"none", border:"none", color:profileTab === key ? T.paper : T.muted, fontFamily:FONT_HEAD, fontWeight:700, fontSize:13.5, padding:"13px 8px 11px", cursor:"pointer", borderBottom:profileTab === key ? `2px solid ${T.gold}` : "2px solid transparent", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              {Icon && <Icon size={16} strokeWidth={2.2} />}
              {label}
            </button>
          ))}
        </div>

        {/* ── Profile Composer FAB ── */}
        <button
          onClick={() => setShowProfileFabModal(true)}
          style={{ position:"fixed", bottom:90, right:20, width:52, height:52, borderRadius:"50%", background:T.gold, border:"none", color:T.ink, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 16px rgba(0,0,0,0.4)", cursor:"pointer", zIndex:40, transition:"transform 0.15s" }}
          onMouseDown={e => { e.currentTarget.style.transform = "scale(0.9)"; }}
          onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </button>
        {showProfileFabModal && (
          <CommunityComposer
            account={account}
            themeTokens={T}
            onClose={() => setShowProfileFabModal(false)}
            onPosted={() => {
              setShowProfileFabModal(false);
              supabase.from("community_posts").select("*").eq("user_id",account.id).order("created_at",{ascending:false}).then(({data})=>setProfilePosts(data||[]));
            }}
          />
        )}

        {/* ── Profile posts feed ── */}
        {profilePostsLoading ? (
          <div style={{ fontSize:13, color:T.muted, padding:"28px 0", textAlign:"center" }}>Loading…</div>
        ) : (() => {
          const tabPosts = profileTab === "reposts" ? profilePosts.filter(p => !!p.repost_of_post_id) : profilePosts.filter(p => !p.repost_of_post_id);
          if (!tabPosts.length) return <div style={{ fontSize:13, color:T.muted, padding:"32px 0", textAlign:"center" }}>{profileTab === "reposts" ? "No reposts yet." : "No posts yet."}</div>;
          return (
            <CommunityProfileFeed
              posts={tabPosts}
              account={account}
            themeTokens={T}
            profileEntry={{
              id: account.id,
              display_name: username || account?.email?.split("@")[0] || "user",
              full_name: fullName,
              username: username,
              avatar_url: avatarUrl,
              badge: verification || "none",
              is_official: verification === "official",
              is_admin: false,
            }}
            onOpenProfile={() => {}}
            onDmUser={() => {}}
            onDelete={async (id) => {
              await supabase.from("community_posts").delete().eq("id", id);
              setProfilePosts(posts => posts.filter(p => p.id !== id));
            }}
              onRefresh={() => {
                supabase.from("community_posts").select("*").eq("user_id",account.id).order("created_at",{ascending:false}).then(({data})=>setProfilePosts(data||[]));
              }}
            />
          );
        })()}
      </div>
    );
  }

  if (morePage === "profile-edit") {
    const CamIcon = () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
      </svg>
    );
    return (
      <div style={{ minHeight:"100%", background:T.ink, overflowY:"auto", animation:"slideInRight 0.2s ease" }}>
        <style>{"@keyframes slideInRight { from { transform:translateX(24px); opacity:0 } to { transform:translateX(0); opacity:1 } }"}</style>

        {/* ── Edit profile header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", position:"sticky", top:0, zIndex:10, background:T.ink, borderBottom:`1px solid ${T.cardBorder}` }}>
          <button onClick={() => setMorePage("profile")} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:6, color:T.paper }}>
            <ChevronLeft size={22} color={T.paper} />
            <span style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.paper }}>Edit profile</span>
          </button>
          <button onClick={saveProfileExtended} disabled={savingProfile}
            style={{ background:"none", border:"none", cursor:"pointer", fontFamily:FONT_HEAD, fontWeight:700, fontSize:15, color:T.gold, padding:"4px 2px" }}>
            {savingProfile ? "Saving…" : "Save"}
          </button>
        </div>

        {/* ── Banner + Avatar (both tappable) ── */}
        <div style={{ position:"relative", marginBottom:50 }}>
          {/* Banner */}
          <label style={{ display:"block", cursor:"pointer", position:"relative" }}>
            <input type="file" accept="image/*" onChange={e => e.target.files[0] && setCropFile(e.target.files[0])} style={{ display:"none" }} disabled={uploadingCover} />
            {coverUrl
              ? <img src={coverUrl} style={{ width:"100%", height:110, objectFit:"cover", display:"block" }} alt="" />
              : <div style={{ width:"100%", height:110, background:`linear-gradient(135deg,#1a160d 0%,#231d10 55%,${T.gold}28 100%)` }} />
            }
            {/* Camera badge — small corner icon, does not cover the photo */}
            <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.55)", borderRadius:"50%", padding:7, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
              <CamIcon />
            </div>
          </label>
          {/* Avatar */}
          <label style={{ position:"absolute", bottom:-46, left:14, cursor:"pointer" }}>
            <input type="file" accept="image/*" onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} style={{ display:"none" }} disabled={uploadingAvatar} />
            <div style={{ width:88, height:88, borderRadius:"50%", border:`3px solid ${T.gold}`, boxShadow:`0 0 0 3px ${T.ink}`, overflow:"hidden", position:"relative" }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ width:"100%", height:"100%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", color:T.ink, fontWeight:800, fontFamily:FONT_HEAD, fontSize:30 }}>{profileInitial}</div>
              }
              {/* Camera badge — bottom-right corner only */}
              <div style={{ position:"absolute", bottom:2, right:2, background:"rgba(0,0,0,0.6)", borderRadius:"50%", padding:5, display:"flex", alignItems:"center", justifyContent:"center" }}><CamIcon /></div>
            </div>
          </label>
        </div>

        {/* ── Edit fields ── */}
        <div style={{ padding:"0 16px 24px" }}>
          {profileMsg && <div style={{ fontSize:12, color:profileMsg.startsWith("Saved") ? T.sage : T.rust, marginBottom:12, padding:"8px 12px", background:`${profileMsg.startsWith("Saved") ? T.sage : T.rust}18`, borderRadius:8 }}>{profileMsg}</div>}

          {/* Year picker bottom sheet */}
          {showYearPicker && (
            <div onClick={() => setShowYearPicker(false)} style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.55)" }}>
              <div onClick={e => e.stopPropagation()} style={{ position:"absolute", bottom:0, left:0, right:0, background:T.card, borderRadius:"20px 20px 0 0", padding:"16px 0 40px", animation:"sheetUp 0.28s ease", maxHeight:"70vh", display:"flex", flexDirection:"column" }}>
                <div style={{ width:40, height:4, borderRadius:2, background:T.cardBorder, margin:"0 auto 16px", flexShrink:0 }} />
                <div style={{ textAlign:"center", fontFamily:FONT_HEAD, fontWeight:700, fontSize:15, color:T.paper, marginBottom:8, flexShrink:0 }}>Select Year</div>
                <div style={{ overflowY:"auto", flex:1 }}>
                  {Array.from({ length: 80 }, (_, i) => 2010 - i).map(y => {
                    const curYear = dob ? dob.split("-")[0] : "";
                    return (
                      <button key={y} onClick={() => {
                        const parts = dob ? dob.split("-") : ["","01","01"];
                        const mm = (parts[1] || "01").padStart(2,"0");
                        const dd = (parts[2] || "01").padStart(2,"0");
                        setDob(`${y}-${mm}-${dd}`);
                        setShowYearPicker(false);
                      }}
                        style={{ width:"100%", padding:"14px 0", background: curYear === String(y) ? `${T.gold}22` : "none", border:"none", borderBottom:`1px solid ${T.cardBorder}33`, color: curYear === String(y) ? T.goldBright : T.paper, fontFamily:FONT_HEAD, fontWeight: curYear === String(y) ? 800 : 400, fontSize:16, cursor:"pointer" }}>
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Generic text/multiline fields */}
          {[
            { label:"Name",     val:fullName, set:setFullName, ph:"Your display name" },
            { label:"Bio",      val:bio,      set:setBio,      ph:"Say something about yourself", multiline:true },
            { label:"Username", val:username, set:setUsername, ph:"@handle" },
          ].map(({ label, val, set, ph, multiline }) => (
            <div key={label} style={{ marginBottom:0, paddingBottom:0 }}>
              <label style={{ fontSize:12, color:T.paper, fontWeight:600, display:"block", marginBottom:4, marginTop:18 }}>{label}</label>
              {multiline
                ? <textarea value={val} onChange={e => set(e.target.value)} placeholder={ph} rows={3}
                    style={{ width:"100%", background:"none", border:"none", borderBottom:`1px solid ${T.cardBorder}`, color:T.paper, fontSize:15, padding:"6px 0", fontFamily:FONT_HEAD, outline:"none", resize:"none", boxSizing:"border-box" }} />
                : <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width:"100%", background:"none", border:"none", borderBottom:`1px solid ${T.cardBorder}`, color:T.paper, fontSize:15, padding:"6px 0", fontFamily:FONT_HEAD, outline:"none", boxSizing:"border-box" }} />
              }
            </div>
          ))}

          {/* Location with search suggestions */}
          <div style={{ marginBottom:0, paddingBottom:0, position:"relative" }}>
            <label style={{ fontSize:12, color:T.paper, fontWeight:600, display:"block", marginBottom:4, marginTop:18 }}>Location</label>
            <ProfileLocationInput value={location} onChange={setLocation} T={T} FONT_HEAD={FONT_HEAD} />
          </div>

          {/* Date of birth — month + day inline, year opens bottom sheet */}
          <div style={{ marginBottom:0, paddingBottom:0 }}>
            <label style={{ fontSize:12, color:T.paper, fontWeight:600, display:"block", marginBottom:4, marginTop:18 }}>Date of birth</label>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <select
                value={dob ? dob.split("-")[1] || "" : ""}
                onChange={e => {
                  const parts = dob ? dob.split("-") : ["2000","","01"];
                  const y = parts[0] || "2000"; const d = (parts[2] || "01").padStart(2,"0");
                  setDob(`${y}-${e.target.value.padStart(2,"0")}-${d}`);
                }}
                style={{ flex:2, background:"none", border:"none", borderBottom:`1px solid ${T.cardBorder}`, color:T.paper, fontSize:14, padding:"6px 0", fontFamily:FONT_HEAD, outline:"none" }}>
                <option value="">Month</option>
                {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i) =>
                  <option key={i+1} value={String(i+1).padStart(2,"0")}>{m}</option>
                )}
              </select>
              <input
                type="number" min="1" max="31"
                value={dob ? (dob.split("-")[2] || "") : ""}
                onChange={e => {
                  const parts = dob ? dob.split("-") : ["2000","01",""];
                  const y = parts[0] || "2000"; const m = (parts[1] || "01").padStart(2,"0");
                  setDob(`${y}-${m}-${e.target.value.padStart(2,"0")}`);
                }}
                placeholder="Day"
                style={{ flex:1, background:"none", border:"none", borderBottom:`1px solid ${T.cardBorder}`, color:T.paper, fontSize:14, padding:"6px 0", fontFamily:FONT_HEAD, outline:"none", textAlign:"center", width:0 }} />
              <button
                onClick={() => setShowYearPicker(true)}
                style={{ flex:1.2, background:"none", border:"none", borderBottom:`1px solid ${T.cardBorder}`, color: dob && dob.split("-")[0] ? T.paper : T.muted, fontSize:14, padding:"6px 0", fontFamily:FONT_HEAD, textAlign:"center", cursor:"pointer" }}>
                {dob && dob.split("-")[0] ? dob.split("-")[0] : "Year ▾"}
              </button>
            </div>
          </div>

          {/* DOB privacy selector */}
          {dob && (
            <div style={{ marginTop:18 }}>
              <label style={{ fontSize:12, color:T.paper, fontWeight:600, display:"block", marginBottom:8 }}>DOB visibility</label>
              <div style={{ display:"flex", gap:8 }}>
                {[["daymonth","Day & Month"],["everyone","Full Date"],["friends","Friends"]].map(([v, lbl]) => (
                  <button key={v} onClick={() => { setDobPrivacy(v); lsSet("rainx-dob-privacy", v); }}
                    style={{ flex:1, fontSize:11, padding:"6px 4px", borderRadius:10, border:`1px solid ${dobPrivacy===v ? T.gold : T.cardBorder}`, background:dobPrivacy===v ? `${T.gold}22` : "none", color:dobPrivacy===v ? T.goldBright : T.muted, cursor:"pointer", fontFamily:FONT_HEAD, fontWeight:600 }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => onLogoutConfirm && onLogoutConfirm()}
            style={{ width:"100%", marginTop:32, background:"none", border:`1px solid rgba(176,96,74,0.4)`, borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.rust, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      </div>
    );
  }

  if (morePage === "verification") {
    const isGolden = verification === "golden";
    const isBlue   = verification === "blue";
    const isVerif  = isGolden || isBlue;
    const badgeBg  = isGolden ? "rgba(244,211,94,0.12)" : isBlue ? "rgba(91,156,246,0.12)" : "rgba(100,100,100,0.10)";
    const badgeBorder = isGolden ? T.gold : isBlue ? "#5B9CF6" : T.cardBorder;
    const iconBg   = isGolden ? "rgba(244,211,94,0.15)" : isBlue ? "rgba(91,156,246,0.15)" : "rgba(100,100,100,0.08)";
    const iconBorder = isGolden ? `2px solid ${T.gold}` : isBlue ? "2px solid #5B9CF6" : `1px solid ${T.cardBorder}`;

    const tiers = [
      { key: "weekly",   label: "Weekly",    verif: "Blue Verified",   icon: "blue",   desc: "Subscribers on the Weekly plan receive a Blue Verified badge." },
      { key: "monthly",  label: "Monthly",   verif: "Blue Verified",   icon: "blue",   desc: "Subscribers on the Monthly plan receive a Blue Verified badge." },
      { key: "yearly", label: "Yearly", verif: "Golden Verified", icon: "golden", desc: "Premium Yearly subscribers receive the exclusive Golden Verified badge." },
    ];

    return (
      <MoreSubScreen onBack={() => setMorePage(null)} title="Verification" subtitle="Your identity & trust level">
        <div style={{ padding: 16 }}>
          {/* Status card */}
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 18, padding: 24, marginBottom: 14, textAlign: "center" }}>
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: iconBg, border: iconBorder, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              {isGolden ? (
                <svg width="38" height="38" viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }}>
                  <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#F4D35E" />
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
              <CommunityBadge isAdmin={false} badge={verification || "none"} isPro={false} />
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, color: verificationColor }}>{verificationLabel}</span>
            </div>
            {isVerif && (
              <div style={{ marginTop: 12, fontSize: 11.5, color: T.muted, lineHeight: 1.6 }}>
                {isGolden ? "Premium Yearly subscriber · highest trust level" : "Active subscriber · community trusted"}
              </div>
            )}
          </div>

          {/* Tier breakdown */}
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: "6px 0", marginBottom: 14 }}>
            <div style={{ padding: "12px 16px 8px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, color: T.muted, letterSpacing: 0.5 }}>HOW IT WORKS</div>
            {tiers.map((t, i) => {
              const active = entitlement.tier === t.key;
              const tBlue = t.icon === "blue";
              return (
                <div key={t.key} style={{ padding: "12px 16px", borderTop: i > 0 ? `1px solid ${T.cardBorder}` : "none", display: "flex", alignItems: "center", gap: 12, background: active ? (tBlue ? "rgba(91,156,246,0.06)" : "rgba(244,211,94,0.06)") : "transparent" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: tBlue ? "rgba(91,156,246,0.12)" : "rgba(244,211,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {tBlue ? (
                      <svg width="16" height="16" viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }}>
                        <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }}>
                        <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#F4D35E" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper }}>{t.label} Plan</span>
                      {active && <span style={{ fontSize: 10, fontWeight: 700, color: tBlue ? "#5B9CF6" : T.goldBright, background: tBlue ? "rgba(91,156,246,0.15)" : "rgba(244,211,94,0.15)", borderRadius: 8, padding: "2px 7px" }}>ACTIVE</span>}
                    </div>
                    <div style={{ fontSize: 11, color: tBlue ? "#5B9CF6" : T.goldBright, marginTop: 2, fontWeight: 600 }}>{t.verif}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          {!isVerif && (
            <button onClick={() => setMorePage("rewards")} style={{ width: "100%", background: T.goldGradient, color: T.ink, border: "none", borderRadius: 13, padding: "14px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
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
    <MoreSubScreen onBack={() => setMorePage("profile-menu")} title="Trader Wallet" subtitle="Your personal trading wallet">
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

  // Community profile = redirect to main profile (same data)
  if (morePage === "community-profile") {
    setMorePage("profile");
    return null;
  }

  if (morePage === "analytics") return (
    <MoreSubScreen onBack={() => setMorePage(null)} title="ANALYTICS" subtitle="Your creator performance">
      <AnalyticsScreen account={account} />
    </MoreSubScreen>
  );

  function renderAppearancePhone(mode) {
    const isLight = mode === "light";
    const splitGrad = function(l, d) { return "linear-gradient(to right, " + l + " 50%, " + d + " 50%)"; };
    const bg = mode === "split" ? splitGrad("#f5f5f5", "#1c1c1c") : (isLight ? "#f5f5f5" : "#1c1c1c");
    const bar = mode === "split" ? splitGrad("#eaeaea", "#2a2a2a") : (isLight ? "#eaeaea" : "#2a2a2a");
    const block1 = mode === "split" ? splitGrad("#ffffff", "#333333") : (isLight ? "#ffffff" : "#333333");
    const block2 = mode === "split" ? splitGrad("#ececec", "#2e2e2e") : (isLight ? "#ececec" : "#2e2e2e");
    const nav = mode === "split" ? splitGrad("#eaeaea", "#2a2a2a") : (isLight ? "#eaeaea" : "#2a2a2a");
    const notch = mode === "split" ? splitGrad("#cfcfcf", "#444444") : (isLight ? "#cfcfcf" : "#444444");
    return (
      <div style={{ width:60, height:112, borderRadius:15, background:bg, border:"1px solid #e3e3e3", boxShadow:"0 3px 10px rgba(0,0,0,0.10)", padding:7, display:"flex", flexDirection:"column", gap:6, position:"relative", overflow:"hidden" }}> 
        <div style={{ position:"absolute", top:6, left:"50%", transform:"translateX(-50%)", width:18, height:4, borderRadius:2, background:notch }} />
        <div style={{ height:14, borderRadius:5, background:bar, marginTop:9 }} />
        <div style={{ height:22, borderRadius:6, background:block1 }} />
        <div style={{ height:13, borderRadius:5, background:block2, width:"72%" }} />
        <div style={{ flex:1 }} />
        <div style={{ height:12, borderRadius:6, background:nav }} />
      </div>
    );
  }

  // ── Settings / Security visual system ─────────────────────────────────────
  // These screens intentionally use a light ash page, white grouped cards,
  // dark icons and the existing RainX yellow accent without changing the rest
  // of the application theme.
  const PREF_BG = "#F2F3F5";
  const PREF_CARD = "#FFFFFF";
  const PREF_BORDER = "#E7E9EC";
  const PREF_ICON = "#18202A";
  const PREF_TEXT = "#111418";
  const PREF_MUTED = "#737B85";
  const PREF_YELLOW = T.gold;

  const LightToggle = ({ on, onChange, disabled=false, danger=false }) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={e=>{ e.stopPropagation(); onChange(); }}
      disabled={disabled}
      style={{ width:44, height:25, padding:0, border:0, borderRadius:13, background:on ? (danger ? "#C0392B" : PREF_YELLOW) : "#D7DBE0", position:"relative", cursor:disabled?"not-allowed":"pointer", transition:"background .18s", flexShrink:0, opacity:disabled?.55:1 }}
    >
      <span style={{ position:"absolute", top:3, left:on?22:3, width:19, height:19, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,.18)", transition:"left .18s" }} />
    </button>
  );

  const LightSection = ({ title, children }) => (
    <section style={{ marginBottom:22 }}>
      <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:12.5, letterSpacing:.15, color:PREF_MUTED, margin:"0 0 8px 4px", textTransform:"uppercase" }}>{title}</div>
      <div style={{ background:PREF_CARD, border:`1px solid ${PREF_BORDER}`, borderRadius:17, overflow:"hidden", boxShadow:"0 1px 2px rgba(15,20,25,.03)" }}>{children}</div>
    </section>
  );

  const LightDivider = () => <div style={{ height:1, background:PREF_BORDER, marginLeft:66 }} />;

  const LightIcon = ({ Icon }) => (
    <div style={{ width:38, height:38, borderRadius:11, background:"#F1F3F5", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <Icon size={19} color={PREF_ICON} strokeWidth={2.1} />
    </div>
  );

  const LightRow = ({ icon:Icon, title, subtitle, onPress, right, disabled=false }) => (
    <div role={onPress?"button":undefined} tabIndex={onPress?0:undefined} onClick={onPress} onKeyDown={e=>{if(onPress&&(e.key==="Enter"||e.key===" ")){e.preventDefault();onPress();}}} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"transparent", border:0, textAlign:"left", cursor:disabled?"not-allowed":onPress?"pointer":"default", opacity:disabled?.55:1, boxSizing:"border-box" }}>
      {Icon && <LightIcon Icon={Icon} />}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13.5, color:PREF_TEXT }}>{title}</div>
        {subtitle && <div style={{ fontFamily:FONT_BODY, fontSize:11.2, color:PREF_MUTED, marginTop:3, lineHeight:1.4 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );

  const LightToggleRow = ({ icon:Icon, title, subtitle, prefKey, defaultValue=true }) => {
    const on = settingsPrefs[prefKey] ?? defaultValue;
    return <LightRow icon={Icon} title={title} subtitle={subtitle} onPress={()=>persistSettings({[prefKey]:!on})} right={<LightToggle on={on} onChange={()=>persistSettings({[prefKey]:!on})} />} />;
  };

  const LightSecurityToggleRow = ({ title, subtitle, prefKey, defaultValue=true }) => {
    const on = securityPrefs[prefKey] ?? defaultValue;
    return <LightRow icon={ShieldCheck} title={title} subtitle={subtitle} onPress={()=>persistSecurity({[prefKey]:!on})} right={<LightToggle on={on} onChange={()=>persistSecurity({[prefKey]:!on})} />} />;
  };

  const LightSheet = StableLightSheet;

  const LightSheetTitle = ({ title, desc }) => <>
    <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:18, color:PREF_TEXT, marginBottom:5 }}>{title}</div>
    {desc && <div style={{ fontSize:11.5, color:PREF_MUTED, lineHeight:1.55, marginBottom:16 }}>{desc}</div>}
  </>;

  const LightChoice = ({ value, current, title, desc, onSelect }) => (
    <button type="button" onClick={()=>onSelect(value)} style={{ width:"100%", background:"transparent", border:0, padding:"13px 0", display:"flex", alignItems:"center", gap:12, textAlign:"left", cursor:"pointer" }}>
      <div style={{ flex:1 }}><div style={{fontFamily:FONT_HEAD,fontWeight:700,fontSize:13,color:PREF_TEXT}}>{title}</div>{desc&&<div style={{fontSize:11,color:PREF_MUTED,marginTop:2}}>{desc}</div>}</div>
      <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${current===value?PREF_YELLOW:"#C9CED4"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>{current===value&&<div style={{width:10,height:10,borderRadius:"50%",background:PREF_YELLOW}}/>}</div>
    </button>
  );

  if (morePage === "privacy-center") return (
    <MoreSubScreen onBack={() => setMorePage("profile-menu")} title="Privacy & Data" subtitle="Control how RainX uses, stores and exposes your information">
      <div style={{ background:PREF_BG, minHeight:"100%", padding:"16px 16px 28px" }}>
        <LightSection title="Privacy controls">
          <LightToggleRow icon={Eye} title="Profile discoverable" subtitle="Allow your profile to appear in search and suggestions" prefKey="profileDiscoverable" />
          <LightDivider />
          <LightToggleRow icon={EyeOff} title="Activity status" subtitle="Hide your active status from other users" prefKey="activityStatus" defaultValue={false} />
          <LightDivider />
          <LightToggleRow icon={MessageCircle} title="Read receipts" subtitle="Control whether message read status is shared" prefKey="readReceipts" />
          <LightDivider />
          <LightRow icon={Users2} title="Blocked & muted users" subtitle="Manage accounts you no longer want to interact with" onPress={()=>setSettingsSheet("blockedUsers")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={Lock} title="Messaging privacy" subtitle="Choose who can message you and send requests" onPress={()=>setSettingsSheet("messageWho")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
        </LightSection>
        <LightSection title="Data & personalization">
          <LightToggleRow icon={Users2} title="Personalized recommendations" subtitle="Use activity to improve people, market and creator suggestions" prefKey="personalizedSuggestions" />
          <LightDivider />
          <LightToggleRow icon={Activity} title="Analytics" subtitle="Allow optional product analytics" prefKey="analyticsCookies" defaultValue={false} />
          <LightDivider />
          <LightToggleRow icon={Bell} title="Marketing updates" subtitle="Allow optional promotional and creator updates" prefKey="marketingNotifications" defaultValue={false} />
          <LightDivider />
          <LightRow icon={Download} title="Download your data" subtitle="Export available local preferences now; full account export needs backend support" onPress={()=>setSettingsSheet("downloadData")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
        </LightSection>
        <LightSection title="Data lifecycle">
          <LightRow icon={Database} title="Data deletion request" subtitle="Request deletion of eligible account data" onPress={async()=>{const {error}=await supabase.rpc("request_account_deletion"); if(error) alert(error.message || "Unable to submit deletion request."); else alert("Your account deletion request has been submitted.");}} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={Trash2} title="Clear local RainX data" subtitle="Remove locally stored preferences on this device" onPress={()=>{try{Object.keys(localStorage).filter(k=>k.startsWith("rainx-")).forEach(k=>localStorage.removeItem(k));}catch{} setSettingsPrefs({}); setSecurityPrefs({}); alert("Local RainX data cleared.");}} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
        </LightSection>
        <LightSection title="Legal & preferences">
          <LightRow icon={FileCheck} title="Privacy Policy" subtitle="Review how personal information is handled" onPress={()=>alert("Open the RainX Privacy Policy from the legal centre.")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={FileCheck} title="Terms of Service" subtitle="Review the rules governing RainX use" onPress={()=>alert("Open the RainX Terms from the legal centre.")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={Cookie} title="Cookie & data preferences" subtitle="Manage optional analytics, personalization and marketing" onPress={()=>setSettingsSheet("cookies")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
        </LightSection>
      </div>
    </MoreSubScreen>
  );

  if (morePage === "creator-safety") return (
    <MoreSubScreen onBack={() => setMorePage("profile-menu")} title="Creator & Token Safety" subtitle="Security, reporting, moderation and creator controls">
      <div style={{ background:PREF_BG, minHeight:"100%", padding:"16px 16px 28px" }}>
        <LightSection title="Creator protection">
          <LightSecurityToggleRow title="Creator security alerts" subtitle="Permission, payout and creator-account security events" prefKey="creatorSecurityAlerts" />
          <LightDivider />
          <LightSecurityToggleRow title="Payout change confirmations" subtitle="Require an extra confirmation before changing payout destinations" prefKey="creatorPayoutConfirmations" />
          <LightDivider />
          <LightSecurityToggleRow title="Moderation notifications" subtitle="Notify me about reports, takedowns and review outcomes" prefKey="moderationNotifications" />
        </LightSection>
        <LightSection title="Token safety">
          <LightSecurityToggleRow title="Show token reporting controls" subtitle="Keep report, mute and moderation actions visible on token surfaces" prefKey="tokenReporting" />
          <LightDivider />
          <LightSecurityToggleRow title="Risk acknowledgement" subtitle="Require acknowledgement before high-risk creator-token actions" prefKey="tokenRiskAcknowledgement" />
          <LightDivider />
          <LightRow icon={ShieldCheck} title="Internal-token risk & disclosure" subtitle="Review the risk language used around creator tokens" onPress={()=>setSecuritySheet("tokenRisk")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={FileCheck} title="Report a token" subtitle="Flag suspected scams, impersonation, manipulation or policy violations" onPress={()=>alert("Backend required: token-report submission and moderation queue.")} right={<span style={{fontSize:10,fontWeight:800,color:PREF_MUTED,border:`1px solid ${PREF_BORDER}`,borderRadius:20,padding:"4px 8px"}}>BACKEND</span>} />
        </LightSection>
        <LightSection title="Premium creator controls">
          <LightRow icon={Lock} title="Creator permissions" subtitle="Role-based publishing, moderation and payout permissions" onPress={()=>alert("Backend required: creator role/permission API.")} right={<span style={{fontSize:10,fontWeight:800,color:PREF_MUTED}}>BACKEND</span>} />
          <LightDivider />
          <LightRow icon={Activity} title="Creator activity log" subtitle="Audit creator actions and security events" onPress={()=>alert("Backend required: creator audit-log endpoint.")} right={<span style={{fontSize:10,fontWeight:800,color:PREF_MUTED}}>BACKEND</span>} />
        </LightSection>
      </div>
    </MoreSubScreen>
  );

  if (morePage === "settings") return (
    <MoreSubScreen onBack={() => setMorePage("profile-menu")} title="Settings" subtitle="Privacy & account controls">
      <div style={{ background:PREF_BG, minHeight:"100%", padding:"16px 16px 28px" }}>
        <LightSection title="Privacy & discovery">
          <LightToggleRow icon={Eye} title="Profile discoverable" subtitle="Allow your profile to appear in search and suggestions" prefKey="profileDiscoverable" />
          <LightDivider />
          <LightToggleRow icon={Eye} title="Activity status" subtitle="Let people you follow see when you are active" prefKey="activityStatus" />
          <LightDivider />
          <LightToggleRow icon={MessageCircle} title="Read receipts" subtitle="Show when direct messages have been read" prefKey="readReceipts" />
          <LightDivider />
          <LightToggleRow icon={Users2} title="Personalized suggestions" subtitle="Use your activity to improve people and market suggestions" prefKey="personalizedSuggestions" />
        </LightSection>

        <LightSection title="Your posts">
          {[["public","Public — everyone","Anyone can view your posts"],["followers","Followers only","Only your followers can view your posts"],["premium","Subscribers only","Only eligible subscribers can view your posts"]].map(([value,title,desc],i)=>{
            return <React.Fragment key={value}>{i>0&&<LightDivider/>}<LightRow icon={FileText} title={title} subtitle={desc} onPress={()=>{setPostVisibility(value);lsSet("rainx-post-visibility",value)}} right={<div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${postVisibility===value?PREF_YELLOW:"#C9CED4"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{postVisibility===value&&<div style={{width:10,height:10,borderRadius:"50%",background:PREF_YELLOW}}/>}</div>} /></React.Fragment>;
          })}
        </LightSection>

        <LightSection title="Trading & signals">
          <LightToggleRow icon={Bell} title="Trading signal alerts" subtitle="Receive new BUY / SELL signal notifications" prefKey="signalAlerts" />
          <LightDivider />
          <LightToggleRow icon={ShieldCheck} title="Risk & trade alerts" subtitle="Get TP, SL and important risk notifications" prefKey="riskAlerts" />
          <LightDivider />
          <LightToggleRow icon={Bell} title="Signal sounds" subtitle="Play alert sounds for important trading events" prefKey="signalSounds" />
          <LightDivider />
          <LightToggleRow icon={Activity} title="Live market refresh" subtitle="Keep market and signal data refreshed automatically" prefKey="autoRefresh" />
          <LightDivider />
          <LightRow icon={ChevronDown} title="Signal delivery" subtitle={settingsPrefs.signalDelivery || "All signals"} onPress={()=>setSettingsSheet("signalDelivery")} right={<ChevronRight size={18} color={PREF_MUTED} />} />
        </LightSection>

        <LightSection title="Community & messaging">
          <LightToggleRow icon={Bell} title="Community notifications" subtitle="Likes, replies, follows and mentions" prefKey="communityNotifications" />
          <LightDivider />
          <LightToggleRow icon={MessageCircle} title="Message requests" subtitle="Allow new people to send you a message request" prefKey="messageRequests" />
          <LightDivider />
          <LightToggleRow icon={Users2} title="Creator updates" subtitle="Updates from creators and Space Coins you follow" prefKey="creatorUpdates" />
          <LightDivider />
          <LightToggleRow icon={TrendingUp} title="Space Coin launch alerts" subtitle="Notify me when followed creators launch a new mini token" prefKey="launchAlerts" />
          <LightDivider />
          <LightRow icon={Lock} title="Who can message you" subtitle={settingsPrefs.messageWho || "Followers and people you follow"} onPress={()=>setSettingsSheet("messageWho")} right={<ChevronRight size={18} color={PREF_MUTED} />} />
        </LightSection>

        <LightSection title="Data & account">
          <LightToggleRow icon={EyeOff} title="Hide balances" subtitle="Hide wallet and account balances until tapped" prefKey="hideBalances" defaultValue={false} />
          <LightDivider />
          <LightRow icon={ScrollText} title="Data & storage" subtitle="Cache, downloads and local data" onPress={()=>setSettingsSheet("dataStorage")} right={<ChevronRight size={18} color={PREF_MUTED} />} />
          <LightDivider />
          <LightRow icon={Globe} title="Language & region" subtitle={settingsPrefs.language ? `${settingsPrefs.language} · ${settingsPrefs.region || "Ghana"}` : "English · Ghana"} onPress={()=>setSettingsSheet("region")} right={<ChevronRight size={18} color={PREF_MUTED} />} />
        </LightSection>

        <LightSection title="Legal, privacy & data">
          <LightRow icon={FileCheck} title="Privacy policy" subtitle="Review how RainX handles personal information" onPress={()=>setShowLegal(true)} right={<ChevronRight size={18} color={PREF_MUTED} />} />
          <LightDivider />
          <LightRow icon={FileCheck} title="Terms of service" subtitle="Review the rules that apply to your account" onPress={()=>setShowLegal(true)} right={<ChevronRight size={18} color={PREF_MUTED} />} />
          <LightDivider />
          <LightRow icon={Cookie} title="Cookie & tracking preferences" subtitle="Control optional analytics and personalization" onPress={()=>setSettingsSheet("cookies")} right={<ChevronRight size={18} color={PREF_MUTED} />} />
          <LightDivider />
          <LightRow icon={Download} title="Download your data" subtitle="Request a copy of information associated with your account" onPress={()=>setSettingsSheet("downloadData")} right={<ChevronRight size={18} color={PREF_MUTED} />} />
        </LightSection>

        <LightSection title="Notifications">
          <LightRow icon={Bell} title="Notification preferences" subtitle="Manage in-app and push alerts by category" onPress={()=>setMorePage("notifications")} right={<ChevronRight size={18} color={PREF_MUTED} />} />
        </LightSection>

        {settingsSheet && <LightSheet onClose={()=>setSettingsSheet(null)}>
          {settingsSheet === "signalDelivery" && <>
            <LightSheetTitle title="Signal delivery" desc="Choose which trading signals reach you." />
            <LightChoice value="all" current={settingsPrefs.signalDelivery||"all"} title="All signals" desc="BUY, SELL and watchlist updates" onSelect={v=>{persistSettings({signalDelivery:v});setSettingsSheet(null)}} />
            <LightChoice value="high" current={settingsPrefs.signalDelivery||"all"} title="High confidence only" desc="Only stronger-confidence setups" onSelect={v=>{persistSettings({signalDelivery:v});setSettingsSheet(null)}} />
            <LightChoice value="followed" current={settingsPrefs.signalDelivery||"all"} title="Followed markets only" desc="Only markets in your watchlist" onSelect={v=>{persistSettings({signalDelivery:v});setSettingsSheet(null)}} />
          </>}
          {settingsSheet === "messageWho" && <>
            <LightSheetTitle title="Who can message you" desc="Choose who can start a conversation." />
            {[['followers','Followers and people you follow'],['everyone','Anyone on RainX'],['nobody','Nobody']].map(([v,t])=><LightChoice key={v} value={v} current={settingsPrefs.messageWhoKey||'followers'} title={t} onSelect={x=>{persistSettings({messageWho:t,messageWhoKey:x});setSettingsSheet(null)}} />)}
          </>}
          {settingsSheet === "blockedUsers" && <>
            <LightSheetTitle title="Blocked & muted users" desc="These lists are connected directly to your RainX account controls." />
            {blockedLoading ? <div style={{padding:"18px 0",fontSize:12,color:PREF_MUTED,textAlign:"center"}}>Loading account controls…</div> : <>
              <div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:12.5,color:PREF_MUTED,margin:"4px 0 8px"}}>BLOCKED ({blockedUsers.length})</div>
              {blockedUsers.length === 0 ? <div style={{padding:"10px 0 14px",fontSize:12,color:PREF_MUTED}}>No blocked accounts.</div> : blockedUsers.map(({id,profile}) => {
                const name = profile?.display_name || profile?.full_name || profile?.username || `Account ${id.slice(0,6)}`;
                return <LightRow key={id} icon={UserX} title={name} subtitle={profile?.username ? `@${profile.username}` : "Blocked account"} onPress={async()=>{ const {error}=await supabase.from("user_blocks").delete().eq("blocker_id",account.id).eq("blocked_id",id); if(!error) setBlockedUsers(v=>v.filter(x=>x.id!==id)); }} right={<span style={{fontSize:10,fontWeight:800,color:PREF_MUTED,border:`1px solid ${PREF_BORDER}`,borderRadius:20,padding:"4px 8px"}}>UNBLOCK</span>} />;
              })}
              <LightDivider />
              <div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:12.5,color:PREF_MUTED,margin:"14px 0 8px"}}>MUTED ({mutedUsers.length})</div>
              {mutedUsers.length === 0 ? <div style={{padding:"10px 0",fontSize:12,color:PREF_MUTED}}>No muted accounts.</div> : mutedUsers.map(({id,profile}) => {
                const name = profile?.display_name || profile?.full_name || profile?.username || `Account ${id.slice(0,6)}`;
                return <LightRow key={id} icon={Bell} title={name} subtitle={profile?.username ? `@${profile.username}` : "Muted account"} onPress={async()=>{ const {error}=await supabase.from("user_mutes").delete().eq("muter_id",account.id).eq("muted_id",id); if(!error) setMutedUsers(v=>v.filter(x=>x.id!==id)); }} right={<span style={{fontSize:10,fontWeight:800,color:PREF_MUTED,border:`1px solid ${PREF_BORDER}`,borderRadius:20,padding:"4px 8px"}}>UNMUTE</span>} />;
              })}
            </>}
          </>}
          {settingsSheet === "dataStorage" && <>
            <LightSheetTitle title="Data & storage" desc="Manage local app data without changing your account." />
            <LightRow icon={ScrollText} title="Clear local preferences" subtitle="Remove locally saved RainX preferences on this device" onPress={()=>{try{Object.keys(localStorage).filter(k=>k.startsWith('rainx-')).forEach(k=>localStorage.removeItem(k));}catch{} setSettingsPrefs({}); setSettingsSheet(null); alert('Local RainX preferences were cleared.');}} right={<ChevronRight size={18} color={PREF_MUTED} />} />
          </>}
          {settingsSheet === "region" && <>
            <LightSheetTitle title="Language & region" desc="Choose your preferred app language and region." />
            <div style={{maxHeight:"52vh",overflowY:"auto",paddingRight:4}}>
              {["English","French","Spanish","Portuguese","Arabic","German","Italian","Dutch","Chinese (Simplified)","Chinese (Traditional)","Japanese","Korean","Hindi","Bengali","Urdu","Indonesian","Malay","Thai","Vietnamese","Turkish","Swahili","Hausa","Yoruba","Amharic","Hebrew","Russian","Ukrainian","Polish","Romanian","Greek","Czech","Hungarian","Swedish","Norwegian","Danish","Finnish"].map(v=><LightChoice key={v} value={v} current={settingsPrefs.language||"English"} title={v} onSelect={x=>{persistSettings({language:x,region:x==="English"?"Ghana":x});setSettingsSheet(null)}} />)}
            </div>
          </>}
          {settingsSheet === "cookies" && <>
            <LightSheetTitle title="Cookie & tracking preferences" desc="Optional controls. Essential security and session storage remain enabled." />
            <LightToggleRow icon={Activity} title="Analytics" subtitle="Help RainX understand how features are used" prefKey="analyticsCookies" />
            <LightToggleRow icon={Users2} title="Personalized recommendations" subtitle="Use activity to improve content and market suggestions" prefKey="personalizationCookies" />
            <LightToggleRow icon={Bell} title="Marketing notifications" subtitle="Allow promotional product and creator updates" prefKey="marketingNotifications" defaultValue={false} />
          </>}
          {settingsSheet === "downloadData" && <>
            <LightSheetTitle title="Download your data" desc="Export the account preferences currently available to your authenticated session." />
            <LightRow icon={Download} title="Export local preferences" subtitle="Save your RainX settings as a JSON file" onPress={()=>{try{const payload={exportedAt:new Date().toISOString(),settings:settingsPrefs,security:{...securityPrefs,pinHash:undefined,biometricCredentialId:undefined}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="rainx-settings.json";a.click();URL.revokeObjectURL(url);setSettingsSheet(null)}catch{alert("Unable to export local preferences on this device.")}}} right={<ChevronRight size={18} color={PREF_MUTED} />} />
          </>}
        </LightSheet>}
      </div>
    </MoreSubScreen>
  );

  if (morePage === "notifications") return (
    <MoreSubScreen onBack={() => setMorePage("profile-menu")} title="Notifications" subtitle="Alert preferences & push settings">
      <div style={{ background:PREF_BG, minHeight:"100%" }}><NotificationSettingsScreen account={account} activeMarkets={activeMarkets} settingsPrefs={settingsPrefs} persistSettings={persistSettings} /></div>
    </MoreSubScreen>
  );

  if (morePage === "security") return (
    <MoreSubScreen onBack={() => setMorePage("profile-menu")} title="Security" subtitle="Protect your account & device">
      <div style={{ background:PREF_BG, minHeight:"100%", padding:"16px 16px 28px" }}>
        {(() => {
          const checks = [
            securityPrefs.pinEnabled,
            securityPrefs.biometricEnabled,
            securityPrefs.loginAlerts !== false,
            securityPrefs.tradeConfirmations !== false,
            securityPrefs.withdrawConfirmations !== false,
            securityPrefs.securityEmails !== false,
          ];
          const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
          const scoreLabel = score >= 85 ? "Strong" : score >= 60 ? "Good" : "Needs attention";
          return (
            <div style={{ background:"#FFFFFF", border:`1px solid ${PREF_BORDER}`, borderRadius:16, padding:"15px 16px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div>
                  <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:14, color:PREF_TEXT }}>Security Center</div>
                  <div style={{ fontSize:11, color:PREF_MUTED, marginTop:3 }}>Account protection score · {scoreLabel}</div>
                </div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:900, fontSize:20, color:score >= 85 ? "#1A7A50" : score >= 60 ? "#A87500" : "#C0392B" }}>{score}%</div>
              </div>
              <div style={{ height:7, borderRadius:8, background:"#EEF1F3", overflow:"hidden", marginTop:12 }}>
                <div style={{ height:"100%", width:`${score}%`, background:PREF_YELLOW, borderRadius:8 }} />
              </div>
              <button onClick={()=>setSecuritySheet("checkup")} style={{ marginTop:12, width:"100%", border:`1px solid ${PREF_BORDER}`, background:"#FFFFFF", borderRadius:10, padding:"9px 12px", fontFamily:FONT_HEAD, fontWeight:800, fontSize:11.5, color:PREF_TEXT, cursor:"pointer" }}>Run security checkup</button>
            </div>
          );
        })()}
        <LightSection title="Sign-in security">
          <LightRow icon={Key} title="Change Password" subtitle="Update your account password securely" onPress={()=>{setPasswordForm({current:"",next:"",confirm:""});setMfaError("");setSecuritySheet("changePassword")}} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={ShieldCheck} title="Two-Step Authentication (2FA)" subtitle={securityPrefs.twoFactorEnabled ? "2FA is enabled for this account" : "Add an authenticator app or verified factor"} onPress={()=>setSecuritySheet("twoFactor")} right={<span style={{fontSize:10.5,fontWeight:800,color:securityPrefs.twoFactorEnabled?"#1A7A50":PREF_MUTED,border:`1px solid ${securityPrefs.twoFactorEnabled?"#B9DCCB":PREF_BORDER}`,borderRadius:20,padding:"4px 8px"}}>{securityPrefs.twoFactorEnabled?"ENABLED":"BACKEND"}</span>} />
          <LightDivider />
          <LightRow icon={Smartphone} title="Phone & recovery methods" subtitle="Manage verified phone numbers and recovery factors" onPress={()=>setSecuritySheet("recovery")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={Activity} title="Login history" subtitle="Review sign-ins, devices, locations and security events" onPress={()=>setSecuritySheet("loginHistory")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
        </LightSection>

        <LightSection title="Device security">
          <LightRow icon={Lock} title="App Lock" subtitle="Require device authentication before opening RainX" onPress={()=>{ if (!(securityPrefs.pinEnabled || securityPrefs.biometricEnabled)) { setSecuritySheet("appLockSetup"); return; } persistSecurity({appLock:!(securityPrefs.appLock ?? false)}); }} right={<LightToggle on={securityPrefs.appLock ?? false} onChange={()=>{ if (!(securityPrefs.pinEnabled || securityPrefs.biometricEnabled)) { setSecuritySheet("appLockSetup"); return; } persistSecurity({appLock:!(securityPrefs.appLock ?? false)}); }} />} />
          <LightDivider />
          <LightRow icon={Key} title="PIN Lock" subtitle={securityPrefs.pinEnabled ? "A RainX device PIN is set" : "Create a 4–6 digit RainX device PIN"} onPress={()=>{setPinCurrent("");setPinCurrent("");setPinValue("");setPinConfirm("");setPinError("");setSecuritySheet("pin")}} right={<span style={{fontSize:10.5,fontWeight:800,color:securityPrefs.pinEnabled?PREF_YELLOW:PREF_MUTED,border:`1px solid ${securityPrefs.pinEnabled?PREF_YELLOW:PREF_BORDER}`,borderRadius:20,padding:"4px 9px"}}>{securityPrefs.pinEnabled?"ENABLED":"SET UP"}</span>} />
          <LightDivider />
          <LightRow icon={Smartphone} title="Face ID / Device Passkey" subtitle={securityPrefs.biometricEnabled?"Biometric sign-in is enabled on this device":"Use Face ID, fingerprint or device biometrics"} onPress={setupPasskey} right={<span style={{fontSize:10.5,fontWeight:800,color:securityPrefs.biometricEnabled?PREF_YELLOW:PREF_MUTED,border:`1px solid ${securityPrefs.biometricEnabled?PREF_YELLOW:PREF_BORDER}`,borderRadius:20,padding:"4px 9px"}}>{securityPrefs.biometricEnabled?"ENABLED":"SET UP"}</span>} />
        </LightSection>

        <LightSection title="Account protection">
          <LightSecurityToggleRow title="New login alerts" subtitle="Notify me when a new device signs in" prefKey="loginAlerts" />
          <LightDivider />
          <LightSecurityToggleRow title="Trade confirmations" subtitle="Confirm sensitive trading actions before they are submitted" prefKey="tradeConfirmations" />
          <LightDivider />
          <LightSecurityToggleRow title="Withdrawal confirmations" subtitle="Require an extra confirmation before wallet withdrawals" prefKey="withdrawConfirmations" />
          <LightDivider />
          <LightSecurityToggleRow title="Security emails" subtitle="Receive important security and account notices" prefKey="securityEmails" />
        </LightSection>

        <LightSection title="Sessions & recovery">
          <LightRow icon={Smartphone} title="Active Sessions" subtitle="View and manage devices signed in to RainX" onPress={()=>setSecuritySheet("sessions")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={Mail} title="Recovery email" subtitle={account?.email?"Your account email is set":"Add a recovery email"} onPress={()=>setSecuritySheet("recovery")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={ShieldCheck} title="Security checkup" subtitle="Review your account protection settings" onPress={()=>setSecuritySheet("checkup")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
        </LightSection>

        <LightSection title="Suspicious activity & protection">
          <LightSecurityToggleRow title="Suspicious activity alerts" subtitle="Warn me about unusual sign-ins and high-risk account activity" prefKey="suspiciousActivityAlerts" />
          <LightDivider />
          <LightSecurityToggleRow title="Require confirmation for sensitive actions" subtitle="Add an extra confirmation before security or wallet changes" prefKey="sensitiveActionConfirmations" />
          <LightDivider />
          <LightRow icon={ShieldCheck} title="Report a security issue" subtitle="Open the security-report flow for a suspected compromise" onPress={()=>setSecuritySheet("reportSecurity")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
        </LightSection>

        <LightSection title="Creator Space security">
          <LightSecurityToggleRow title="Creator security alerts" subtitle="Notify me about creator-space permission and payout changes" prefKey="creatorSecurityAlerts" />
          <LightDivider />
          <LightSecurityToggleRow title="Token reporting reminders" subtitle="Show reporting and moderation actions on token pages" prefKey="tokenReporting" />
          <LightDivider />
          <LightRow icon={ShieldCheck} title="Token risk & disclosure" subtitle="Review internal-token risk warnings before creator actions" onPress={()=>setSecuritySheet("tokenRisk")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={Lock} title="Premium creator controls" subtitle="Creator permissions, payout protection and moderation access" onPress={()=>setSecuritySheet("creatorControls")} right={<span style={{fontSize:10.5,fontWeight:800,color:PREF_MUTED,border:`1px solid ${PREF_BORDER}`,borderRadius:20,padding:"4px 8px"}}>BACKEND</span>} />
        </LightSection>

        <LightSection title="Account status & control">
          <LightRow icon={UserX} title="Deactivate account" subtitle="Temporarily hide your account and sign you out" right={<LightToggle danger on={!!securityPrefs.deactivated} onChange={()=>{if(securityPrefs.deactivated){persistSecurity({deactivated:false});return;}if(window.confirm("Deactivate your RainX account on this device? You can reactivate later.")){persistSecurity({deactivated:true});onLogout?.();}}} />} />
          <LightDivider />
          <LightRow icon={Database} title="Account data" subtitle="Review your account data and privacy controls" onPress={()=>setSecuritySheet("accountData")} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          <LightDivider />
          <LightRow icon={Trash2} title="Delete account" subtitle="Permanently request account deletion" right={<LightToggle danger on={!!securityPrefs.deleteArmed} onChange={()=>{if(securityPrefs.deleteArmed){persistSecurity({deleteArmed:false});return;}if(window.confirm("Arm permanent account deletion? You will still need to confirm on the next screen.")){persistSecurity({deleteArmed:true});setSecuritySheet("deleteAccount");}}} />} />
        </LightSection>

        {securitySheet && <LightSheet onClose={()=>setSecuritySheet(null)}>
          {securitySheet === "changePassword" && <>
            <LightSheetTitle title="Change Password" desc="Confirm your current password before setting a new one." />
            {mfaError&&<div style={{background:"#FFF4F4",border:"1px solid #F2B8B8",borderRadius:12,padding:"10px 12px",fontSize:11,color:"#8E2A2A",marginBottom:12}}>{mfaError}</div>}
            <input type="password" autoComplete="current-password" value={passwordForm.current} onChange={e=>setPasswordForm(v=>({...v,current:e.target.value}))} placeholder="Current password" style={{width:"100%",boxSizing:"border-box",border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",marginBottom:9,fontFamily:FONT_HEAD}} />
            <input type="password" autoComplete="new-password" value={passwordForm.next} onChange={e=>setPasswordForm(v=>({...v,next:e.target.value}))} placeholder="New password" style={{width:"100%",boxSizing:"border-box",border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",marginBottom:9,fontFamily:FONT_HEAD}} />
            <input type="password" autoComplete="new-password" value={passwordForm.confirm} onChange={e=>setPasswordForm(v=>({...v,confirm:e.target.value}))} placeholder="Confirm new password" style={{width:"100%",boxSizing:"border-box",border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",fontFamily:FONT_HEAD}} />
            <button onClick={changePassword} disabled={passwordBusy} style={{width:"100%",marginTop:12,border:0,borderRadius:12,padding:"12px 0",background:PREF_YELLOW,color:T.ink,fontFamily:FONT_HEAD,fontWeight:900}}>{passwordBusy?"Changing…":"Change password"}</button>
          </>}
          {securitySheet === "twoFactor" && <>
            <LightSheetTitle title="Two-Step Authentication" desc="Protect sign-ins with an authenticator app. Supabase handles the secret and verification securely." />
            {mfaError&&<div style={{background:"#FFF4F4",border:"1px solid #F2B8B8",borderRadius:12,padding:"10px 12px",fontSize:11,color:"#8E2A2A",marginBottom:12}}>{mfaError}</div>}
            {mfaEnrollment ? <>
              {mfaEnrollment?.totp?.qr_code && <img alt="Scan with your authenticator app" src={`data:image/svg+xml;utf8,${encodeURIComponent(mfaEnrollment.totp.qr_code)}`} style={{width:190,height:190,display:"block",margin:"0 auto 12px",background:"#fff",borderRadius:12}} />}
              <div style={{fontSize:11,color:PREF_MUTED,lineHeight:1.5,marginBottom:10}}>Scan this QR code in Google Authenticator, Authy or another TOTP app, then enter the 6-digit code it generates.</div>
              {mfaEnrollment?.totp?.secret && <div style={{fontFamily:"monospace",fontSize:11,wordBreak:"break-all",background:PREF_BG,border:`1px solid ${PREF_BORDER}`,borderRadius:10,padding:9,marginBottom:10}}>{mfaEnrollment.totp.secret}</div>}
              <input value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="text" placeholder="6-digit code" style={{width:"100%",boxSizing:"border-box",border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",fontFamily:FONT_HEAD,fontSize:15,textAlign:"center",letterSpacing:3}} />
              <button onClick={verifyTotpEnrollment} disabled={mfaBusy} style={{width:"100%",marginTop:10,border:0,borderRadius:12,padding:"12px 0",background:PREF_YELLOW,color:T.ink,fontFamily:FONT_HEAD,fontWeight:900}}>{mfaBusy?"Verifying…":"Verify & enable 2FA"}</button>
            </> : <>
              {(mfaFactors.totp||[]).filter(f=>f.status === "verified").map(f=><div key={f.id} style={{background:PREF_BG,border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}><ShieldCheck size={20}/><div style={{flex:1}}><div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:12.5}}>Authenticator app</div><div style={{fontSize:10.5,color:PREF_MUTED,marginTop:2}}>{f.friendly_name || "RainX Authenticator"} · Verified</div></div><button onClick={()=>disableMfaFactor(f.id)} disabled={mfaBusy} style={{border:`1px solid ${PREF_BORDER}`,background:"#fff",borderRadius:9,padding:"7px 9px",fontSize:10,fontWeight:800}}>REMOVE</button></div>)}
              {!(mfaFactors.totp||[]).some(f=>f.status === "verified") && <div style={{fontSize:12,color:PREF_MUTED,marginBottom:12}}>No authenticator is enabled yet.</div>}
              <button onClick={beginTotpEnrollment} disabled={mfaBusy} style={{width:"100%",border:0,borderRadius:12,padding:"12px 0",background:PREF_YELLOW,color:T.ink,fontFamily:FONT_HEAD,fontWeight:900}}>{mfaBusy?"Preparing…":(mfaFactors.totp||[]).some(f=>f.status === "verified")?"Add another authenticator":"Set up authenticator app"}</button>
            </>}
          </>}
          {securitySheet === "recovery" && <>
            <LightSheetTitle title="Phone & recovery methods" desc="Verify a phone number for account recovery. Phone MFA is separate; this uses Supabase's authenticated phone-change verification flow." />
            {recoveryError&&<div style={{background:"#FFF4F4",border:"1px solid #F2B8B8",borderRadius:12,padding:"10px 12px",fontSize:11,color:"#8E2A2A",marginBottom:12}}>{recoveryError}</div>}
            <LightRow icon={Mail} title="Account email" subtitle={account?.email || "Not available"} right={<span style={{fontSize:10.5,fontWeight:800,color:"#1A7A50"}}>VERIFIED</span>} />
            <LightDivider />
            {recoveryStep === "phone" ? <>
              <div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:13,color:PREF_TEXT,margin:"8px 0"}}>Recovery phone</div>
              <input value={recoveryPhone} onChange={e=>setRecoveryPhone(e.target.value)} inputMode="tel" placeholder="+233..." style={{width:"100%",boxSizing:"border-box",border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",fontFamily:FONT_HEAD,fontSize:14}} />
              <button onClick={sendRecoveryPhone} disabled={recoveryBusy} style={{width:"100%",marginTop:10,border:0,borderRadius:12,padding:"12px 0",background:PREF_YELLOW,color:T.ink,fontFamily:FONT_HEAD,fontWeight:900}}>{recoveryBusy?"Sending…":"Send verification code"}</button>
            </> : <>
              <div style={{fontSize:11.5,color:PREF_MUTED,lineHeight:1.5,marginBottom:10}}>Enter the 6-digit code sent to {recoveryPhone}.</div>
              <input value={recoveryOtp} onChange={e=>setRecoveryOtp(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="text" placeholder="6-digit code" style={{width:"100%",boxSizing:"border-box",border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",fontFamily:FONT_HEAD,fontSize:15,textAlign:"center",letterSpacing:3}} />
              <button onClick={verifyRecoveryPhone} disabled={recoveryBusy} style={{width:"100%",marginTop:10,border:0,borderRadius:12,padding:"12px 0",background:PREF_YELLOW,color:T.ink,fontFamily:FONT_HEAD,fontWeight:900}}>{recoveryBusy?"Verifying…":"Verify phone"}</button>
            </>}
          </>}
          {securitySheet === "loginHistory" && <>
            <LightSheetTitle title="Login history" desc="Recent RainX sign-ins and the devices currently holding sessions." />
            {loginHistoryLoading ? <div style={{padding:"18px 0",fontSize:12,color:PREF_MUTED,textAlign:"center"}}>Loading secure sign-in history…</div> : <>
              {loginHistoryRows.length === 0 && securitySessions.length === 0 && <div style={{padding:"12px 0",fontSize:12,color:PREF_MUTED}}>No recorded sign-in events yet.</div>}
              {loginHistoryRows.map((row) => {
                const meta = row.meta || {};
                return <div key={row.id} style={{background:PREF_BG,border:`1px solid ${PREF_BORDER}`,borderRadius:14,padding:"12px 13px",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}><LightIcon Icon={Activity}/><div style={{flex:1}}><div style={{fontFamily:FONT_HEAD,fontWeight:700,fontSize:12.5,color:PREF_TEXT}}>{row.action === "signup" ? "Account created" : "Successful sign-in"}</div><div style={{fontSize:10.5,color:PREF_MUTED,marginTop:2}}>{new Date(row.created_at).toLocaleString()}</div></div><span style={{fontSize:9.5,fontWeight:800,color:"#1A7A50"}}>RECORDED</span></div>
                  <div style={{fontSize:10.5,color:PREF_MUTED,marginTop:8,lineHeight:1.45}}>{typeof device === "string" ? device : device.label} · {meta.ip || "IP unavailable"} · {meta.timezone || "Timezone unavailable"}</div>
                </div>;
              })}
              {securitySessions.length > 0 && <div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:12,color:PREF_MUTED,margin:"14px 0 8px"}}>ACTIVE AUTH SESSIONS</div>}
              {securitySessions.map((s) => <div key={s.session_id} style={{background:PREF_BG,border:`1px solid ${PREF_BORDER}`,borderRadius:14,padding:"12px 13px",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:10}}><LightIcon Icon={Smartphone}/><div style={{flex:1,minWidth:0}}><div style={{fontFamily:FONT_HEAD,fontWeight:700,fontSize:12.5,color:PREF_TEXT}}>{describeRainxUserAgent(s.user_agent || "").label}</div><div style={{fontSize:10.5,color:PREF_MUTED,marginTop:2}}>{s.created_at ? new Date(s.created_at).toLocaleString() : ""} · {s.ip_address || "IP unavailable"}</div></div><span style={{fontSize:9.5,color:"#1A7A50",fontWeight:800}}>ACTIVE</span></div></div>)}
            </>}
          </>}
          {securitySheet === "reportSecurity" && <>
            <LightSheetTitle title="Report a security issue" desc="Use the authenticated security-report endpoint when this flow is wired to the backend." />
            <LightRow icon={ShieldCheck} title="Account may be compromised" subtitle="Start an urgent account-security review" onPress={async()=>{const {error}=await supabase.rpc("submit_security_report",{p_report_type:"account_compromised",p_details:"User reported a possible account compromise from Security settings."});if(error){alert(error.message||"Unable to submit security report.");return;}alert("Security report submitted securely.");}} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
            <LightDivider />
            <LightRow icon={Mail} title="Contact security support" subtitle="Send a protected security report with account context" onPress={async()=>{const {error}=await supabase.rpc("submit_security_report",{p_report_type:"security_support",p_details:"User requested security support from Security settings."});if(error){alert(error.message||"Unable to submit security request.");return;}alert("Security-support request submitted securely.");}} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          </>}
          {securitySheet === "tokenRisk" && <>
            <LightSheetTitle title="Internal-token risk & disclosure" desc="Creator tokens can carry market, liquidity, smart-contract and loss risks." />
            <div style={{background:"#FFF4F4",border:"1px solid #F2B8B8",borderRadius:13,padding:"12px 13px",fontSize:11,color:"#8E2A2A",lineHeight:1.55,marginBottom:12}}>Treat every creator token as high risk until verified. Do not present internal-token balances or creator projections as guaranteed value. Final risk disclosures and acknowledgement records must be enforced server-side.</div>
            <LightSecurityToggleRow title="Require risk acknowledgement" subtitle="Require a user acknowledgement before sensitive creator-token actions" prefKey="tokenRiskAcknowledgement" />
          </>}
          {securitySheet === "creatorControls" && <>
            <LightSheetTitle title="Premium creator controls" desc="Permissions that should be backed by server-side role and entitlement checks." />
            <LightRow icon={Lock} title="Creator permissions" subtitle="Manage who can publish, moderate and change creator settings" onPress={()=>alert("Backend required: role/permission management.")} right={<span style={{fontSize:10,fontWeight:800,color:PREF_MUTED}}>BACKEND</span>} />
            <LightDivider />
            <LightRow icon={Wallet} title="Payout protection" subtitle="Require verification before payout destination changes" onPress={()=>alert("Backend required: payout-change verification.")} right={<span style={{fontSize:10,fontWeight:800,color:PREF_MUTED}}>BACKEND</span>} />
            <LightDivider />
            <LightRow icon={FileCheck} title="Moderation & reports" subtitle="Review token reports, takedowns and creator disputes" onPress={()=>alert("Backend required: moderation/report queue.")} right={<span style={{fontSize:10,fontWeight:800,color:PREF_MUTED}}>BACKEND</span>} />
          </>}
          {securitySheet === "pin" && <>
            <LightSheetTitle title={securityPrefs.pinEnabled?"Change RainX PIN":"Set up RainX PIN"} desc="Your PIN is hashed before it is stored on this device." />
            {securityPrefs.pinEnabled&&<input value={pinCurrent} onChange={e=>setPinCurrent(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="password" placeholder="Current PIN" style={{width:"100%",boxSizing:"border-box",background:"#fff",border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",color:PREF_TEXT,fontFamily:FONT_HEAD,fontSize:15,outline:"none",marginBottom:10}} />}
            <input value={pinValue} onChange={e=>setPinValue(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="password" placeholder="New PIN" style={{width:"100%",boxSizing:"border-box",background:"#fff",border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",color:PREF_TEXT,fontFamily:FONT_HEAD,fontSize:15,outline:"none",marginBottom:10}} />
            <input value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="password" placeholder="Confirm PIN" style={{width:"100%",boxSizing:"border-box",background:"#fff",border:`1px solid ${PREF_BORDER}`,borderRadius:12,padding:"12px 13px",color:PREF_TEXT,fontFamily:FONT_HEAD,fontSize:15,outline:"none",marginBottom:6}} />
            {pinError&&<div style={{fontSize:11,color:T.rust,margin:"5px 0 10px"}}>{pinError}</div>}
            <button onClick={setupPin} style={{width:"100%",background:PREF_YELLOW,color:T.ink,border:0,borderRadius:12,padding:"12px 0",fontFamily:FONT_HEAD,fontWeight:800,fontSize:13,cursor:"pointer",marginTop:8}}>Save PIN</button>
          </>}
          {securitySheet === "sessions" && <>
            <LightSheetTitle title="Active Sessions" desc="Review devices currently signed in to RainX." />
            {securitySessionsLoading ? <div style={{padding:"18px 0",fontSize:12,color:PREF_MUTED,textAlign:"center"}}>Loading sessions…</div> : securitySessions.length === 0 ? <div style={{padding:"10px 0",fontSize:12,color:PREF_MUTED}}>No active session details are available.</div> : securitySessions.map((s) => <div key={s.session_id} style={{background:PREF_BG,border:`1px solid ${PREF_BORDER}`,borderRadius:14,padding:"13px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:8}}><LightIcon Icon={Smartphone}/><div style={{flex:1,minWidth:0}}><div style={{fontFamily:FONT_HEAD,fontWeight:700,fontSize:12.5,color:PREF_TEXT}}>{s.user_agent ? s.user_agent.slice(0,72) : "RainX device"}</div><div style={{fontSize:10.5,color:PREF_MUTED,marginTop:2}}>{s.ip_address || "IP unavailable"} · {s.updated_at ? new Date(s.updated_at).toLocaleString() : ""}</div></div><span style={{fontSize:9.5,color:"#1A7A50",fontWeight:800}}>ACTIVE</span></div>)}
          </>}
          {securitySheet === "appLockSetup" && <>
            <LightSheetTitle title="Set up App Lock" desc="RainX needs a PIN or device biometric before App Lock can be enabled." />
            <LightRow icon={Key} title="Set up PIN" subtitle="Create a 4–6 digit RainX PIN" onPress={()=>{setPinCurrent("");setPinCurrent("");setPinValue("");setPinConfirm("");setPinError("");setSecuritySheet("pin")}} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
            <LightDivider />
            <LightRow icon={Smartphone} title="Set up Face ID / device passkey" subtitle="Use your device biometric when supported" onPress={setupPasskey} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          </>}
          {securitySheet === "accountData" && <>
            <LightSheetTitle title="Account data" desc="Manage the privacy and account-data actions available from this device." />
            <LightRow icon={Download} title="Export local settings" subtitle="Download your RainX preferences as JSON" onPress={()=>{setSecuritySheet(null);setMorePage("settings");setSettingsSheet("downloadData")}} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
            <LightDivider />
            <LightRow icon={FileCheck} title="Privacy controls" subtitle="Review discovery, messaging and personalization settings" onPress={()=>{setSecuritySheet(null);setMorePage("settings")}} right={<ChevronRight size={18} color={PREF_MUTED}/>} />
          </>}
          {securitySheet === "deleteAccount" && <>
            <LightSheetTitle title="Delete account" desc="Account deletion is permanent. Real deletion should require re-authentication and a trusted server-side deletion flow." />
            <div style={{background:"#FFF4F4",border:"1px solid #F2B8B8",borderRadius:13,padding:"12px 13px",fontSize:11,color:"#8E2A2A",lineHeight:1.5,marginBottom:12}}>This client screen does not delete server data by itself. Connect it to your authenticated account-deletion endpoint before enabling permanent deletion.</div>
            <button onClick={async()=>{const {error}=await supabase.rpc("request_account_deletion");if(error){alert(error.message||"Unable to submit deletion request.");return;}setSecuritySheet(null);alert("Your deletion request has been submitted for secure processing.");}} style={{width:"100%",background:"#C0392B",color:"#FFFFFF",border:0,borderRadius:12,padding:"12px 0",fontFamily:FONT_HEAD,fontWeight:800,fontSize:13,cursor:"pointer"}}>Request deletion</button>
          </>}
          {securitySheet === "checkup" && <>
            <LightSheetTitle title="Security checkup" desc="A quick view of your current protection." />
            {[['Password','Managed by RainX account authentication',true],['PIN lock',securityPrefs.pinEnabled?'Enabled on this device':'Not set',!!securityPrefs.pinEnabled],['Face ID / Passkey',securityPrefs.biometricEnabled?'Enabled on this device':'Not set',!!securityPrefs.biometricEnabled],['Login alerts',securityPrefs.loginAlerts!==false?'Enabled':'Disabled',securityPrefs.loginAlerts!==false],['Withdrawal confirmations',securityPrefs.withdrawConfirmations!==false?'Enabled':'Disabled',securityPrefs.withdrawConfirmations!==false]].map(([t,d,on])=><div key={t} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${PREF_BORDER}`}}><div style={{flex:1}}><div style={{fontFamily:FONT_HEAD,fontWeight:700,fontSize:12.5,color:PREF_TEXT}}>{t}</div><div style={{fontSize:10.5,color:PREF_MUTED,marginTop:2}}>{d}</div></div><span style={{fontSize:10,fontWeight:800,color:on?"#1A7A50":PREF_MUTED}}>{on?"ON":"OFF"}</span></div>)}
          </>}
        </LightSheet>}
      </div>
    </MoreSubScreen>
  );

  const rewardEligible = followerCount >= 1000 && referralCount >= 500 && impressionCount >= 100000;

  // ---- Main More Page ----
  return (
    <div style={{ padding: "8px 16px 28px" }}>
      {/* User account header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0 16px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: T.paper, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fullName || (profileLoaded ? "User" : "…")}
          </div>
          {username ? (
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>@{username}</div>
          ) : null}
        </div>
      </div>

      {/* Analytics preview card */}
      <div style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:16, padding:16, marginBottom:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper }}>Analytics</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Your creator performance</div>
          </div>
          <button onClick={() => setMorePage("analytics")} style={{ background:"none", border:"none", color:T.muted, fontSize:11.5, fontFamily:FONT_HEAD, fontWeight:700, cursor:"pointer" }}>View all →</button>
        </div>
        {/* Mini bar chart sparkline */}
        <div style={{ height:52, display:"flex", alignItems:"flex-end", gap:3, marginBottom:12 }}>
          {[35,50,28,65,42,78,55,90,68,88].map((h,i) => (
            <div key={i} style={{ flex:1, height:`${h}%`, background:i===9?T.muted:`${T.muted}55`, borderRadius:2, minHeight:4 }} />
          ))}
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:18, color:T.paper }}>{impressionCount.toLocaleString()}</div>
            <div style={{ fontSize:10.5, color:T.muted, marginTop:1 }}>Total impressions</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:18, color:T.paper }}>{followerCount.toLocaleString()}</div>
            <div style={{ fontSize:10.5, color:T.muted, marginTop:1 }}>Followers</div>
          </div>
          <button onClick={() => setMorePage("analytics")} style={{ background:`rgba(140,140,140,0.15)`, border:`1px solid ${T.muted}44`, borderRadius:10, padding:"8px 14px", fontFamily:FONT_HEAD, fontWeight:700, fontSize:11.5, color:T.muted, cursor:"pointer", flexShrink:0 }}>Open</button>
        </div>
      </div>

      <MoreSection title="TRADER REWARDS PROGRAM">
        {/* Get Verified row with dual badges */}
        <button onClick={() => setMorePage("verification")} style={{ width:"100%", display:"flex", alignItems:"center", padding:"14px 16px", background:"none", border:"none", cursor:"pointer", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(140,140,140,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative" }}>
            {/* Overlapping blue + gold badges */}
            <svg width="16" height="16" viewBox="1.604 1.604 18.792 18.792" style={{ position:"absolute", left:6, top:10 }}>
              <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0" />
            </svg>
            <svg width="16" height="16" viewBox="1.604 1.604 18.792 18.792" style={{ position:"absolute", right:6, top:10 }}>
              <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#F4D35E" />
            </svg>
          </div>
          <div style={{ flex:1, textAlign:"left" }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13.5, color:T.paper }}>Get Verified</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Earn your badge &amp; unlock rewards</div>
          </div>
          <ChevronRight size={15} color={T.muted} />
        </button>
        <MoreRowDivider />
        <div style={{ padding:"14px 16px" }}>
          {/* Progress bars */}
          {[
            { label:"Followers", val:followerCount, target:1000 },
            { label:"Referrals", val:referralCount, target:500 },
            { label:"Impressions", val:impressionCount, target:100000 },
          ].map(({ label, val, target }) => {
            const done = val >= target;
            return (
              <div key={label} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, color:T.paper }}>{target.toLocaleString()} {label}</span>
                  <span style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, color:done?T.sage:T.paper }}>{val.toLocaleString()}/{target.toLocaleString()}</span>
                </div>
                <div style={{ height:6, borderRadius:3, background:T.cardBorder, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(1,val/target)*100}%`, borderRadius:3, background:done?T.sage:T.muted, transition:"width 0.6s ease" }} />
                </div>
              </div>
            );
          })}
          <div style={{ fontSize:11, color:T.muted, lineHeight:1.6, marginBottom:14 }}>A qualified referral is a user who signs up through your link and activates a subscription.</div>
          {/* Referral link + wallet balance */}
          <div style={{ background:T.ink, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, color:T.paper, marginBottom:8 }}>YOUR REFERRAL LINK</div>
            <div style={{ fontSize:11, color:T.muted, lineHeight:1.6, marginBottom:10 }}>Earn 20% cash reward — sent to your wallet — every time someone signs up with your link and activates a subscription.</div>
            {referralCode ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:10, padding:"10px 12px", marginBottom:12 }}>
                <span style={{ flex:1, fontSize:11, color:T.paper, fontFamily:FONT_BODY, wordBreak:"break-all" }}>https://rainx.app/?ref={referralCode}</span>
                <button
                  onClick={() => { try { navigator.clipboard.writeText(`https://rainx.app/?ref=${referralCode}`).then(() => alert("Link copied!")).catch(() => {}); } catch {} }}
                  style={{ background:T.gold, border:"none", borderRadius:8, padding:"6px 12px", fontFamily:FONT_HEAD, fontWeight:700, fontSize:11, color:T.ink, cursor:"pointer", flexShrink:0 }}>
                  Copy
                </button>
              </div>
            ) : (
              <div style={{ fontSize:11.5, color:T.muted, fontStyle:"italic", marginBottom:12 }}>Referral code not assigned — contact support to get yours.</div>
            )}
          </div>
          <button
            disabled={!rewardEligible}
            onClick={rewardEligible ? () => setMorePage("rewards") : undefined}
            style={{ width:"100%", background:rewardEligible?T.goldGradient:"rgba(100,100,100,0.18)", color:rewardEligible?T.ink:"rgba(150,150,150,0.6)", border:"none", borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:800, fontSize:14, cursor:rewardEligible?"pointer":"not-allowed", transition:"background 0.3s" }}>
            Apply Now
          </button>
        </div>
      </MoreSection>

      <MoreSection title="More">
        <MoreRow
          icon={Zap}
          title="Scalping"
          badge={hasAccess(entitlement.tier, "weekly") ? "Unlocked" : "Locked"}
          badgeColor={hasAccess(entitlement.tier, "weekly") ? T.sage : T.muted}
          onPress={() => setMorePage("scalping")}
        />
        <MoreRowDivider />
        {appInstalled
          ? <MoreRow icon={Smartphone} title="App Installed" subtitle="RainX is on your home screen" />
          : <MoreRow icon={ArrowUpCircle} title="Install App" subtitle="Add RainX to your home screen" onPress={async () => { if (installPrompt) { installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === 'accepted') { setInstallPrompt(null); setAppInstalled(true); } } else { setShowInstallHelp(true); } }} />}
      </MoreSection>

      <div style={{ textAlign: "center", marginTop: 4 }}>
        <button onClick={() => setShowLegal(true)} style={{ background: "none", border: "none", color: T.muted, fontSize: 10.5, cursor: "pointer", textDecoration: "underline", fontFamily: FONT_BODY }}>Terms & Risk Disclosure</button>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 4, lineHeight: 1.6 }}>RainX is an analysis tool, not a broker.</div>
      </div>

      {showInstallHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: T.card, width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '16px 16px 0 0', padding: '22px 20px 36px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 17, color: T.paper, fontWeight: 800 }}>Install RainX</div>
              <button onClick={() => setShowInstallHelp(false)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.8, marginBottom: 20 }}>
              <div style={{ color: T.paper, fontWeight: 700, marginBottom: 6 }}>📱 On iPhone / Safari:</div>
              <div>1. Tap the <strong style={{ color: T.paper }}>Share</strong> button at the bottom of your screen</div>
              <div>2. Scroll and tap <strong style={{ color: T.paper }}>Add to Home Screen</strong></div>
              <div>3. Tap <strong style={{ color: T.paper }}>Add</strong></div>
              <div style={{ color: T.paper, fontWeight: 700, margin: '14px 0 6px' }}>🤖 On Android / Chrome:</div>
              <div>1. Tap the <strong style={{ color: T.paper }}>⋮ menu</strong> at the top right</div>
              <div>2. Tap <strong style={{ color: T.paper }}>Add to Home Screen</strong> or <strong style={{ color: T.paper }}>Install App</strong></div>
            </div>
            <button onClick={() => setShowInstallHelp(false)} style={{ width: '100%', background: T.goldGradient, color: T.ink, border: 'none', borderRadius: 12, padding: '13px 0', fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Got it</button>
          </div>
        </div>
      )}
      {showLegal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: T.card, width: "100%", maxWidth: 480, margin: "0 auto", borderRadius: "16px 16px 0 0", padding: 22, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 17, color: T.paper, fontWeight: 800 }}>Terms & Risk Disclosure</div>
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


// ─────────────────────────────────────────────────────────────────────────────
// Analytics Screen — TikTok-style creator dashboard
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsScreen({ account }) {
  const TABS = ["Overview", "Content", "Viewers", "Followers"];
  const PERIODS = ["7 Days", "28 Days", "60 Days", "365 Days"];
  const [activeTab, setActiveTab] = useState("Overview");
  const [period, setPeriod] = useState("28 Days");
  const [customRange, setCustomRange] = useState({ from:"", to:"" });
  const [showCustom, setShowCustom] = useState(false);
  // Start with zeros so the UI renders immediately — supabase resolves will update it
  const [stats, setStats] = useState({ posts:0, views:0, likes:0, comments:0, newFollowers:0, daily:[] });

  useEffect(() => {
    if (!account?.id) return;
    const days = period === "7 Days" ? 7 : period === "28 Days" ? 28 : period === "60 Days" ? 60 : 365;
    const since = new Date(Date.now() - days * 864e5).toISOString();
    // Reset to zeros for the new period before loading
    setStats({ posts:0, views:0, likes:0, comments:0, newFollowers:0, daily:[] });
    const safeFetch = (q) => q.then(r => r, () => ({ data: [] }));
    Promise.all([
      safeFetch(supabase.from("community_posts").select("id,views,created_at").eq("user_id",account.id).gte("created_at",since)),
      safeFetch(supabase.from("post_likes").select("created_at").eq("liker_id",account.id).gte("created_at",since))
        .then(r => (r.data||[]).length ? r : safeFetch(supabase.from("post_likes").select("created_at").eq("user_id",account.id).gte("created_at",since))),
      safeFetch(supabase.from("post_comments").select("created_at").eq("user_id",account.id).gte("created_at",since)),
      safeFetch(supabase.from("follows").select("created_at").eq("followed_id",account.id).gte("created_at",since)),
    ]).then(([posts,likes,comments,follows])=>{
      const postData = posts.data||[];
      const totalViews = postData.reduce((s,p)=>s+(p.views||0),0);
      setStats({
        posts: postData.length,
        views: totalViews,
        likes: (likes.data||[]).length,
        comments: (comments.data||[]).length,
        newFollowers: (follows.data||[]).length,
        daily: buildDailySeries(postData, "views", days),
      });
    }).catch(()=>{});
  },[account?.id, period]);

  function buildDailySeries(rows, field, days) {
    const buckets = {};
    for (let i=0; i<days; i++) {
      const d = new Date(Date.now() - (days-1-i)*864e5);
      buckets[d.toISOString().slice(0,10)] = 0;
    }
    rows.forEach(r => {
      const k = r.created_at?.slice(0,10);
      if (k in buckets) buckets[k] += (r[field]||0);
    });
    return Object.entries(buckets).map(([date,val])=>({date:date.slice(5),val}));
  }

  const MetricCard = ({ label, value, delta }) => (
    <div style={{ flex:1, minWidth:"45%", background:T.ink, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"14px 16px", marginBottom:10, boxShadow: T.ink==="#FFFFFF" ? "0 1px 6px rgba(0,0,0,0.07)" : "none" }}>
      <div style={{ fontSize:11, color:T.muted, fontWeight:600, marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:24, color:T.paper }}>{typeof value==="number"?value.toLocaleString():value}</div>
      {delta!==undefined && (
        <div style={{ fontSize:11, fontWeight:700, color:delta>=0?T.sage:T.rust, marginTop:4 }}>{delta>=0?"↑":"↓"} {Math.abs(delta).toLocaleString()} vs prev</div>
      )}
    </div>
  );

  // Simple bar chart using divs
  const BarChart = ({ data, color }) => {
    if (!data||!data.length) return null;
    const max = Math.max(...data.map(d=>d.val), 1);
    return (
      <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:80, marginTop:12, overflowX:"auto" }}>
        {data.map((d,i)=>(
          <div key={i} style={{ flex:1, minWidth:6, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <div style={{ width:"100%", height:`${(d.val/max)*72}px`, background:color||T.muted, borderRadius:2, minHeight:2, transition:"height 0.4s ease" }} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding:"0 0 24px", background:T.card, minHeight:"100%" }}>
      {/* Header */}
      <div style={{ padding:"20px 16px 12px", borderBottom:`1px solid ${T.cardBorder}` }}>
        <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:22, color:T.paper, letterSpacing:-0.5 }}>ANALYTICS</div>
        <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>Track your creator performance</div>
      </div>

      {/* Period selector */}
      <div style={{ display:"flex", gap:6, padding:"12px 16px", overflowX:"auto" }}>
        {PERIODS.map(p=>(
          <button key={p} onClick={()=>{setPeriod(p);setShowCustom(false);}} style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:`1px solid ${period===p?T.muted:T.cardBorder}`, background:period===p?"rgba(140,140,140,0.15)":"none", color:period===p?T.paper:T.muted, fontFamily:FONT_HEAD, fontWeight:700, fontSize:11.5, cursor:"pointer" }}>{p}</button>
        ))}
        <button onClick={()=>setShowCustom(v=>!v)} style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:`1px solid ${showCustom?T.muted:T.cardBorder}`, background:showCustom?"rgba(140,140,140,0.15)":"none", color:showCustom?T.paper:T.muted, fontFamily:FONT_HEAD, fontWeight:700, fontSize:11.5, cursor:"pointer" }}>Custom</button>
      </div>
      {showCustom && (
        <div style={{ display:"flex", gap:10, padding:"0 16px 12px" }}>
          <input type="date" value={customRange.from} onChange={e=>setCustomRange(r=>({...r,from:e.target.value}))} style={{ flex:1, ...getInputStyle() }} />
          <input type="date" value={customRange.to} onChange={e=>setCustomRange(r=>({...r,to:e.target.value}))} style={{ flex:1, ...getInputStyle() }} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${T.cardBorder}`, marginBottom:16 }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{ flex:1, padding:"10px 0", background:"none", border:"none", borderBottom:`2px solid ${activeTab===t?T.paper:"transparent"}`, color:activeTab===t?T.paper:T.muted, fontFamily:FONT_HEAD, fontWeight:700, fontSize:11.5, cursor:"pointer", transition:"color 0.15s" }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding:"0 16px" }}>
        {activeTab === "Overview" && (
          <>
            {false ? (
              <div style={{ color:T.muted, fontSize:13, textAlign:"center", paddingTop:32 }}>Loading analytics…</div>
            ) : (
              <>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16 }}>
                  <MetricCard label="Post Views" value={stats.views} />
                  <MetricCard label="Posts" value={stats.posts} />
                  <MetricCard label="Likes" value={stats.likes} />
                  <MetricCard label="Comments" value={stats.comments} />
                  <MetricCard label="New Followers" value={stats.newFollowers} />
                </div>
                <div style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:16, marginBottom:16 }}>
                  <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper, marginBottom:4 }}>Post Views — {period}</div>
                  <BarChart data={stats.daily} color={T.muted} />
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:9.5, color:T.muted, marginTop:6 }}>
                    {stats.daily.filter((_,i)=>i===0||i===Math.floor(stats.daily.length/2)||i===stats.daily.length-1).map(d=><span key={d.date}>{d.date}</span>)}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "Content" && (
          <div style={{ textAlign:"center", paddingTop:40 }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📄</div>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper, marginBottom:8 }}>Content Breakdown</div>
            <div style={{ fontSize:12, color:T.muted, lineHeight:1.8 }}>Views, likes, and comments per post will appear here.<br/>Post more to see your top-performing content.</div>
            {stats && stats.posts > 0 && (
              <div style={{ marginTop:20, fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.paper }}>{stats.posts} posts in this period</div>
            )}
          </div>
        )}

        {activeTab === "Viewers" && (
          <div style={{ textAlign:"center", paddingTop:40 }}>
            <div style={{ fontSize:36, marginBottom:12 }}>👥</div>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper, marginBottom:8 }}>Viewer Insights</div>
            <div style={{ fontSize:12, color:T.muted, lineHeight:1.8, marginBottom:20 }}>Demographics, locations, age groups, and active times.<br/>Available once your posts reach broader audiences.</div>
            <div style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:18, textAlign:"left" }}>
              <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper, marginBottom:12 }}>Most Active Times (UTC)</div>
              {["00–04","04–08","08–12","12–16","16–20","20–24"].map((slot,i)=>{
                const h = [20,35,70,100,85,60][i];
                return (
                  <div key={slot} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <span style={{ width:40, fontSize:11, color:T.muted, flexShrink:0 }}>{slot}</span>
                    <div style={{ flex:1, height:8, borderRadius:4, background:T.cardBorder, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${h}%`, borderRadius:4, background:T.muted }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "Followers" && (
          <div>
            <div style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:18, marginBottom:16 }}>
              <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.paper, marginBottom:4 }}>New Followers</div>
              <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:28, color:T.paper }}>{stats?.newFollowers||0}</div>
              <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>in the last {period}</div>
              {stats && <BarChart data={stats.daily.map(d=>({...d,val:0}))} color={T.sage} />}
            </div>
            <div style={{ textAlign:"center", paddingTop:8 }}>
              <div style={{ fontSize:12, color:T.muted, lineHeight:1.8 }}>Detailed follower demographics and<br/>growth charts will appear as you grow.</div>
            </div>
          </div>
        )}
      </div>
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

// ---------- New Features Slide-up Prompt ----------
const FEATURES_VERSION = "v2026-07";
function NewFeaturesPrompt() {
  const [show, setShow] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('rainx-features-seen') !== FEATURES_VERSION) {
      const t = setTimeout(() => { setShow(true); requestAnimationFrame(() => setSlideIn(true)); }, 1800);
      return () => clearTimeout(t);
    }
  }, []);
  const dismiss = () => { setSlideIn(false); setTimeout(() => setShow(false), 320); localStorage.setItem('rainx-features-seen', FEATURES_VERSION); };
  const forceRestart = () => { localStorage.setItem('rainx-features-seen', FEATURES_VERSION); window.location.reload(); };
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, background: T.card, borderTop: `2px solid ${T.gold}`, borderRadius: '16px 16px 0 0', padding: '20px 20px 36px', boxShadow: '0 -8px 40px rgba(0,0,0,0.55)', transform: slideIn ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: T.goldBright }}>✨ New Update</div>
          <button onClick={dismiss} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 13.5, color: T.paper, lineHeight: 1.7, marginBottom: 20 }}>
          RainX has been updated. <strong style={{ color: T.gold }}>Force restart</strong> or <strong style={{ color: T.gold }}>close and reopen</strong> the app to see the latest features.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={forceRestart} style={{ flex: 1, background: T.goldGradient, color: T.ink, border: 'none', borderRadius: 12, padding: '13px 0', fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Restart Now</button>
          <button onClick={dismiss} style={{ flex: 1, background: 'none', border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: '13px 0', fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.muted, cursor: 'pointer' }}>Got it</button>
        </div>
      </div>
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
    // Do not show banner if already running as an installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Do not show if the user previously dismissed it
    if (localStorage.getItem('rainx-install-dismissed') === '1') return;
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const dismiss = () => { setVisible(false); localStorage.setItem('rainx-install-dismissed', '1'); };
  const onTouchStart = (e) => { dragging.current = true; startX.current = e.touches[0].clientX; };
  const onTouchMove = (e) => { if (dragging.current) setDragX(e.touches[0].clientX - startX.current); };
  const onTouchEnd = () => { dragging.current = false; if (Math.abs(dragX) > 80) dismiss(); else setDragX(0); };

  return (
    <div
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ position: "fixed", top: 10, left: 10, right: 10, maxWidth: 460, margin: "0 auto", zIndex: 110, background: T.card, border: `1px solid ${T.gold}`, borderRadius: 12, padding: "10px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 10, fontFamily: FONT_BODY, transform: `translateX(${dragX}px)`, opacity: Math.max(0, 1 - Math.abs(dragX) / 200), transition: dragging.current ? "none" : "transform 0.2s, opacity 0.2s" }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, color: T.paper }}>Install RainX</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Add to your home screen for quick access</div>
      </div>
      <button
        onClick={async () => { setVisible(false); deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') localStorage.setItem('rainx-install-dismissed', '1'); setDeferredPrompt(null); }}
        style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 8, padding: "7px 12px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}
      >
        Install
      </button>
      <button onClick={dismiss} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}><X size={15} /></button>
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
  if (!account) return <><InstallBanner /><NewFeaturesPrompt /><AuthScreen onAuthed={(session) => setAccount(sessionToAccount(session))} /></>;
  return <><InstallBanner /><NewFeaturesPrompt /><MainApp account={account} onLogout={handleLogout} /></>;
}
