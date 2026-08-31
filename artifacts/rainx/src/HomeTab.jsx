import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Maximize2, Home, Plus, ArrowUpRight } from "lucide-react";
import LightweightChart from "./LightweightChart";
import FullChartView from "./FullChartView";
import SpaceNewsSection from "./SpaceNewsSection";
import { resolveMarketLogo } from "./MarketLogos";
import { supabase } from "./supabaseClient";
import {
  T, FONT_HEAD, FONT_BODY,
  ALL_ASSETS, INSTRUMENTS, ASSET_CATALOG, ANALYSIS_DURATIONS, STEP_DEFS, TIMEFRAMES,
  isMarketOpen, nextOpenLabel, ticksToCandles, seedSeriesFromPrice, fetchLivePrice,
  sma, rsi, askRaina, recordActivity, saveTradeHistory,
  BiasChip, playNotifSound, getInputStyle,
  lsGet, lsSet, storageGet, storageSet,
} from "./shared";

let isDarkCanvas = false;
function setIsDarkCanvas(v) { isDarkCanvas = v; }

class HomeChartErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div style={{ padding: 24, color: T.paper, background: T.ink, textAlign: "center" }}>Chart unavailable. Please try again.</div>;
    return this.props.children;
  }
}

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

const CATEGORY_ART = {
  crypto: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=900&q=85",
  forex: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=85",
  metals: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=900&q=85",
  energy: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=85",
  indices: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=900&q=85",
};

function MarketSparkline({ data = [], base = 1, width = 92, height = 32 }) {
  const values = data.map((point) => Number(point?.price ?? point?.close ?? point?.value)).filter(Number.isFinite);
  const points = values.length > 1
    ? values.slice(-40)
    : Array.from({ length: 14 }, (_, index) => base * (1 + Math.sin(index * 1.4 + base) * 0.008 + index * 0.0007));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || Math.max(Math.abs(max) * 0.001, 1);
  const coordinates = points.map((value, index) => {
    const x = (index / Math.max(1, points.length - 1)) * width;
    const y = height - 3 - ((value - min) / range) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const up = points[points.length - 1] >= points[0];
  const stroke = up ? "#2186F3" : "#C8644E";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ display: "block" }}>
      <path d={`M0 ${height - 1} L${coordinates.split(" ").join(" L")} L${width} ${height - 1} Z`} fill={up ? "rgba(33,134,243,.10)" : "rgba(200,100,78,.10)"} />
      <polyline points={coordinates} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Native-feeling interactive sheet behavior. Dragging is intentionally limited to the
// handle so the market list keeps its normal vertical scrolling behavior.
function useBottomSheet(onClose) {
  const restOffset = 0;
  const [offset, setOffset] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 800));
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOffset(restOffset));
    return () => cancelAnimationFrame(frame);
  }, [restOffset]);

  const finish = (clientY, time) => {
    const start = dragRef.current;
    if (!start) return;
    const elapsed = Math.max(1, time - start.lastTime);
    const velocity = (clientY - start.lastY) / elapsed;
    const current = start.offset + (clientY - start.startY);
    setDragging(false);
    dragRef.current = null;

    if (current > restOffset + 120 || velocity > 0.85) {
      setOffset(window.innerHeight);
      window.setTimeout(onClose, 260);
    } else if (current < restOffset * 0.45 || velocity < -0.6) {
      setOffset(0);
    } else {
      setOffset(restOffset);
    }
  };

  const bind = {
    onPointerDown: (event) => {
      if (!event.target.closest?.("[data-sheet-handle]")) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragRef.current = { startY: event.clientY, lastY: event.clientY, lastTime: performance.now(), offset };
      setDragging(true);
    },
    onPointerMove: (event) => {
      const start = dragRef.current;
      if (!start) return;
      const now = performance.now();
      const next = Math.max(0, Math.min(window.innerHeight, start.offset + event.clientY - start.startY));
      start.lastY = event.clientY;
      start.lastTime = now;
      setOffset(next);
      event.preventDefault();
    },
    onPointerUp: (event) => finish(event.clientY, performance.now()),
    onPointerCancel: (event) => finish(event.clientY, performance.now()),
  };

  return { bind, style: { transform: `translate3d(0, ${offset}px, 0)`, willChange: "transform", transition: dragging ? "none" : "transform 520ms cubic-bezier(0.22, 0.8, 0.2, 1)" } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Market bottom sheet — supports add, replace when full, and manage active
// ─────────────────────────────────────────────────────────────────────────────
function AddMarketSheet({ onClose, onSelect, onReplaceMarket, initialReplacementAsset = null, activeSessions = [], activeMarkets = [], maxActiveMarkets = 3, onRemoveMarket, seriesMap = {} }) {
  const [category, setCategory] = useState(null);
  // mode: null = category grid | "manage" = replace/delete active | "pick_replacement" = pick who to replace
  const [mode, setMode] = useState(null);
  const [managedAsset, setManagedAsset] = useState(null);   // asset being managed or new asset wanting a slot
  const atLimit = activeMarkets.length >= maxActiveMarkets;
  const sheet = useBottomSheet(onClose);
  useEffect(() => { if (initialReplacementAsset) { setManagedAsset(initialReplacementAsset); setMode("pick_category_for_replace"); } }, [initialReplacementAsset]);

  // ── Manage already-active market: Replace or Delete ─────────────────────
  if (mode === "manage" && managedAsset) {
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1000, display:"flex", alignItems:"flex-end", overflow:"hidden" }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} {...sheet.bind} style={{ ...sheet.style, background:"#FFFFFF", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 40px", height:"min(96dvh, 820px)", maxHeight:"96dvh", overflowY:"scroll", WebkitOverflowScrolling:"touch", overscrollBehaviorY:"none", touchAction:"pan-y" }}>
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div data-sheet-handle style={{ width:36, height:4, borderRadius:2, background:T.cardBorder, touchAction:"none" }} /></div>
          <div style={{ padding:"0 20px 20px" }}>
            <button onClick={() => { setMode(null); setManagedAsset(null); }} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"flex", alignItems:"center", gap:4, marginBottom:14, padding:0 }}>
              <ChevronLeft size={16} /><span style={{ fontFamily:FONT_HEAD, fontSize:12, fontWeight:700 }}>Back</span>
            </button>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:"#0F0E0B", marginBottom:3 }}>{managedAsset.symbol}</div>
            <div style={{ fontSize:12, color:T.muted, marginBottom:22 }}>{managedAsset.name} · Currently active</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={() => { setMode("pick_category_for_replace"); setCategory(null); }} style={{ background:"#FFFFFF", border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:"16px", textAlign:"left", cursor:"pointer" }}>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:"#0F0E0B" }}>Replace with another market</div>
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
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
          <div onClick={e => e.stopPropagation()} {...sheet.bind} style={{ ...sheet.style, background:"#FFFFFF", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 32px", height:"min(96dvh, 820px)", overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehaviorY:"contain", touchAction:"pan-y" }}>
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div data-sheet-handle style={{ width:36, height:4, borderRadius:2, background:T.cardBorder, touchAction:"none" }} /></div>
            <div style={{ padding:"0 20px 16px", display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={() => { setMode(backMode === "pick_category_for_replace" ? "manage" : null); }} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><ChevronLeft size={20} /></button>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:"#0F0E0B" }}>
                  {backMode === "pick_category_for_replace" ? `Replace ${managedAsset?.symbol}` : "Select replacement market"}
                </div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>Choose a category</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 16px" }}>
              {ASSET_CATALOG.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat)} style={{ background:"#FFFFFF", border:"none", borderRadius:14, padding:0, overflow:"hidden", textAlign:"left", cursor:"pointer", minHeight:142, boxShadow:"0 4px 0 #0F0E0B, 0 8px 18px rgba(0,0,0,.18)" }}>
                  <div style={{ height:72, backgroundImage:`linear-gradient(180deg, rgba(15,14,11,.04), rgba(15,14,11,.54)), url(${CATEGORY_ART[cat.id]})`, backgroundSize:"cover", backgroundPosition:"center", display:"flex", alignItems:"flex-end", padding:"0 12px 9px", color:"#FFFFFF", fontSize:23 }}>{cat.emoji}</div>
                  <div style={{ padding:"10px 12px 12px" }}>
                    <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:"#0F0E0B" }}>{cat.label}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{cat.assets.length} markets</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
          <div onClick={e => e.stopPropagation()} {...sheet.bind} style={{ ...sheet.style, background:"#FFFFFF", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 32px", height:"min(96dvh, 820px)", overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehaviorY:"contain", touchAction:"pan-y" }}>
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div data-sheet-handle style={{ width:36, height:4, borderRadius:2, background:T.cardBorder, touchAction:"none" }} /></div>
          <div style={{ padding:"0 20px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => setCategory(null)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><ChevronLeft size={20} /></button>
            <div>
              <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:"#0F0E0B" }}>{category.label}</div>
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
                }} style={{ background:"#FFFFFF", border:`1px solid ${alreadyActive ? T.gold : T.cardBorder}`, borderRadius:12, padding:"11px 12px", display:"flex", alignItems:"center", gap:10, cursor:alreadyActive ? "default" : "pointer", opacity:alreadyActive ? 0.45 : 1 }}>
                   <img src={resolveMarketLogo({symbol:asset.symbol})?.src} alt="" style={{ width:34, height:34, borderRadius:"50%", flexShrink:0 }} />
                   <div style={{ textAlign:"left", minWidth:0, flex:1 }}>
                     <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:14, color:"#0F0E0B" }}>{asset.symbol}</div>
                     <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{asset.name}</div>
                   </div>
                   <MarketSparkline data={seriesMap[asset.symbol]} base={asset.base} />
                   <div style={{ textAlign:"right", minWidth:74 }}>
                     <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:12, color:"#0F0E0B", fontVariantNumeric:"tabular-nums" }}>{Number(seriesMap[asset.symbol]?.slice(-1)?.[0]?.price ?? asset.base).toFixed(Math.min(asset.digits, 5))}</div>
                     <div style={{ fontSize:10, color:(Number(seriesMap[asset.symbol]?.slice(-1)?.[0]?.price ?? asset.base) >= Number(seriesMap[asset.symbol]?.[0]?.price ?? asset.base)) ? "#21844A" : "#B24B37", marginTop:2 }}>Live move</div>
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
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
          <div onClick={e => e.stopPropagation()} {...sheet.bind} style={{ ...sheet.style, background:"#FFFFFF", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 40px", height:"min(96dvh, 820px)", overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehaviorY:"contain", touchAction:"pan-y" }}>
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}><div data-sheet-handle style={{ width:36, height:4, borderRadius:2, background:T.cardBorder, touchAction:"none" }} /></div>
          <div style={{ padding:"0 20px 20px" }}>
            <button onClick={() => setMode("pick_new_when_full")} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"flex", alignItems:"center", gap:4, marginBottom:14, padding:0 }}>
              <ChevronLeft size={16} /><span style={{ fontFamily:FONT_HEAD, fontSize:12, fontWeight:700 }}>Back</span>
            </button>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:"#0F0E0B", marginBottom:3 }}>Replace a Market</div>
            <div style={{ fontSize:12, color:T.muted, marginBottom:18 }}>Choose which market to replace with <strong style={{ color:"#0F0E0B" }}>{managedAsset.symbol}</strong></div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {activeMarkets.map(sym => {
                const a = ALL_ASSETS.find(x => x.symbol === sym);
                if (!a) return null;
                return (
                   <button key={sym} onClick={() => { onReplaceMarket?.(sym, managedAsset.symbol); }} style={{ background:"#FFFFFF", border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:"11px 12px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                     <img src={resolveMarketLogo({symbol:a.symbol})?.src} alt="" style={{ width:34, height:34, borderRadius:"50%" }} />
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:"#0F0E0B" }}>{a.symbol}</div>
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
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
           <div onClick={e => e.stopPropagation()} {...sheet.bind} style={{ ...sheet.style, background:"#FFFFFF", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"0 0 32px", height:"min(96dvh, 820px)", overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehaviorY:"contain", touchAction:"pan-y" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
          <div data-sheet-handle style={{ width:36, height:4, borderRadius:2, background:T.cardBorder, touchAction:"none" }} />
        </div>
        {!category ? (
          <>
            <div style={{ padding:"0 20px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:"#0F0E0B" }}>Add Market</div>
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
                   <button key={cat.id} onClick={() => setCategory(cat)} style={{ background:"#FFFFFF", border:"none", borderRadius:14, padding:0, overflow:"hidden", textAlign:"left", cursor:"pointer", minHeight:142, boxShadow:"0 4px 0 #0F0E0B, 0 8px 18px rgba(0,0,0,.18)" }}>
                   <div style={{ height:72, backgroundImage:`linear-gradient(180deg, rgba(15,14,11,.04), rgba(15,14,11,.54)), url(${CATEGORY_ART[cat.id]})`, backgroundSize:"cover", backgroundPosition:"center", display:"flex", alignItems:"flex-end", padding:"0 12px 9px", color:"#FFFFFF", fontSize:23 }}>{cat.emoji}</div>
                   <div style={{ padding:"10px 12px 12px" }}>
                     <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:"#0F0E0B" }}>{cat.label}</div>
                     <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{cat.assets.length} markets</div>
                   </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding:"0 20px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={() => setCategory(null)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><ChevronLeft size={20} /></button>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:"#0F0E0B" }}>{category.label}</div>
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
                   }} style={{ background:"#FFFFFF", border:`1px solid ${alreadyActive ? T.gold : T.cardBorder}`, borderRadius:12, padding:"11px 12px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                     <img src={resolveMarketLogo({symbol:asset.symbol})?.src} alt="" style={{ width:34, height:34, borderRadius:"50%", flexShrink:0 }} />
                     <div style={{ textAlign:"left", minWidth:0, flex:1 }}>
                      <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:"#0F0E0B" }}>{asset.symbol}</div>
                      <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{asset.name}</div>
                    </div>
                     <MarketSparkline data={seriesMap[asset.symbol]} base={asset.base} />
                     <div style={{ textAlign:"right", minWidth:74 }}>
                       <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:12, color:"#0F0E0B", fontVariantNumeric:"tabular-nums" }}>{Number(seriesMap[asset.symbol]?.slice(-1)?.[0]?.price ?? asset.base).toFixed(Math.min(asset.digits, 5))}</div>
                       <div style={{ fontSize:10, color:"#21844A", marginTop:2 }}>Live move</div>
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
// Home Tab — main redesigned screen
// ─────────────────────────────────────────────────────────────────────────────
function HomeTab({ account, inst, marketOpen, last, changePct, series, activeSymbol, setActiveSymbol, entitlement, onSubscribe, session, sessions, sessionSecsLeft, startAnalysisSession, seriesMap, signalsMap, themeMode, activeMarkets: activeMarketsProp = [], addActiveMarket, removeActiveMarket, replaceActiveMarket, reorderActiveMarkets, maxActiveMarkets = 3 }) {
  const activeMarkets = Array.isArray(activeMarketsProp) ? activeMarketsProp : [];
  const [displayMarkets, setDisplayMarkets] = useState(activeMarkets);
  useEffect(() => { setDisplayMarkets(activeMarkets); }, [activeMarkets]);
  const safeSeries = Array.isArray(series) ? series : [];
  const [showAddMarket, setShowAddMarket] = useState(false);
  const [longPressAsset, setLongPressAsset] = useState(null);
  const [replacementTarget, setReplacementTarget] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const pressTimer = useRef(null);
  const dragSymbol = useRef(null);
  const startLongPress = (asset) => { clearTimeout(pressTimer.current); pressTimer.current = setTimeout(() => { if (navigator.vibrate) navigator.vibrate(18); setLongPressAsset(asset); }, 520); };
  const cancelLongPress = () => clearTimeout(pressTimer.current);
  const [showActivity, setShowActivity] = useState(false);
  const [showFullChart, setShowFullChart] = useState(false);
  const [activeChartTf, setActiveChartTf] = useState("15m");   // chart candle timeframe — does NOT control AI analysis duration
  const [sigTf, setSigTf] = useState("15m");   // signal card timeframe tab

  // Sync dark canvas flag
  setIsDarkCanvas(T.ink === "#0F0E0B");

  // OHLCV candles from tick series (fallback while real candles load)
  const candles = React.useMemo(() => ticksToCandles(safeSeries, 70), [series]);

  // Smooth the real live price into the existing gold line chart.
  // No synthetic jitter: the chart only moves toward prices supplied by the app.
  const [localLast, setLocalLast] = React.useState(last);
  const animationRef = React.useRef(null);
  React.useEffect(() => {
    const target = Number(last);
    if (!Number.isFinite(target)) return;
    const from = Number(localLast);
    if (!Number.isFinite(from)) { setLocalLast(target); return; }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const start = performance.now();
    const duration = 650;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setLocalLast(from + (target - from) * eased);
      if (progress < 1) animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [last]);

  // Real candles from Raina AI backend — keyed to selected timeframe
  // Relative URLs fail in the Capacitor WebView (local origin) — must be absolute.
  const BASE_URL_H = "https://rainxapp.vercel.app";
  const [realCandles, setRealCandles] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const sym = session?.symbol || activeSymbol;
    if (!sym) return;
    fetch(`${BASE_URL_H}/api/candles?symbol=${encodeURIComponent(sym)}&interval=${activeChartTf}&limit=500`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data) {
          // API returns { values: [{datetime, open, high, low, close}] } newest-first
          const vals = Array.isArray(data) ? data : (data.values || []);
          // Convert to LightweightChart tick format (t in ms) — oldest-first
          const converted = vals.slice().reverse().map((c) => ({
            t: new Date(c.datetime || c.time || 0).getTime(),
            open: +c.open, high: +c.high, low: +c.low, close: +c.close,
          })).filter((c) => c.t > 0 && isFinite(c.open));
          setRealCandles(converted);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeSymbol, session?.symbol, activeChartTf]);

  // Poll the candles API every 30 s so the chart keeps refreshing with new bars
  useEffect(() => {
    const sym = session?.symbol || activeSymbol;
    if (!sym) return;
    const id = setInterval(() => {
      fetch(`${BASE_URL_H}/api/candles?symbol=${encodeURIComponent(sym)}&interval=${activeChartTf}&limit=500`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          const vals = Array.isArray(data) ? data : (data.values || []);
          const converted = vals.slice().reverse().map(c => ({
            t: new Date(c.datetime || c.time || 0).getTime(),
            open: +c.open, high: +c.high, low: +c.low, close: +c.close,
          })).filter(c => c.t > 0 && isFinite(c.open));
          if (converted.length) setRealCandles(converted);
        }).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [activeSymbol, session?.symbol, activeChartTf]);

  // Merge the live price into the last candle so the chart animates in real-time
  const chartCandles = React.useMemo(() => {
    const base = realCandles.length ? realCandles : candles;
    const livePrice = localLast || last;
    if (!base.length || !livePrice) return base;
    const arr = base.slice();
    const tail = { ...arr[arr.length - 1], close: livePrice, high: Math.max(arr[arr.length - 1].high, livePrice), low: Math.min(arr[arr.length - 1].low, livePrice) };
    arr[arr.length - 1] = tail;
    return arr;
  }, [realCandles, candles, localLast, last]);

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

  // Live performance line: use the real candle closes already feeding the chart.
  // The last point follows the live price, so the homepage visualization is not a static mock.
  const performanceSeries = React.useMemo(() => {
    const candleSource = (chartCandles || []).map(c => Number(c.close)).filter(Number.isFinite).slice(-56);
    const tickSource = safeSeries.map(p => Number(p.price ?? p.close ?? p.value)).filter(Number.isFinite).slice(-56);
    // Prefer the live tick stream so the gold line keeps moving between
    // candle refreshes; candles remain the fallback when ticks are unavailable.
    const source = tickSource.length >= 2 ? tickSource : candleSource;
    const live = Number(localLast || last);
    if (source.length >= 2) {
      const next = source.slice();
      if (Number.isFinite(live)) next[next.length - 1] = live;
      return next;
    }
    const fallback = Number(live || inst?.base || 1);
    return Array.from({ length: 24 }, () => fallback);
  }, [chartCandles, series, localLast, last, inst?.base]);

  const performanceGeometry = React.useMemo(() => {
    const min = Math.min(...performanceSeries);
    const max = Math.max(...performanceSeries);
    const range = max - min || Math.max(Math.abs(max) * 0.002, 1);
    const padX = 3, top = 14, bottom = 176, width = 674;
    const points = performanceSeries.map((value, index) => {
      const x = padX + (index / Math.max(1, performanceSeries.length - 1)) * width;
      const y = bottom - ((value - min) / range) * (bottom - top);
      return [x, y];
    });
    const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const fill = `${line} L 677 185 L 3 185 Z`;
    const lastPoint = points[points.length - 1] || [677, bottom];
    return { line, fill, lastX: lastPoint[0], lastY: lastPoint[1] };
  }, [performanceSeries]);

  const [showSubLock, setShowSubLock] = useState(false);
  const [todayPips, setTodayPips] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!account?.id) { setTodayPips(0); return; }
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    supabase.from("trade_history").select("points,result,closed_at,created_at").eq("user_id", account.id).gte("closed_at", startOfDay.toISOString()).limit(100)
      .then(({ data }) => {
        if (cancelled) return;
        const total = (data || []).filter(row => row.result === "tp" || Number(row.points) > 0).reduce((sum,row) => sum + (Number(row.points) || 0), 0);
        setTodayPips(Math.max(0, Math.round(total)));
      }).catch(() => { if (!cancelled) setTodayPips(0); });
    return () => { cancelled = true; };
  }, [account?.id]);

  // Called from AddMarketSheet when the user picks a NEW market to add/replace
  function handleAssetSelect(asset) {
    setShowAddMarket(false);
    // Update the homepage cards immediately, then keep the subscription prompt separate.
    setDisplayMarkets(prev => prev.includes(asset.symbol) ? prev : [...prev, asset.symbol].slice(0, maxActiveMarkets));
    if (addActiveMarket) addActiveMarket(asset.symbol);
    if (!hasAccess(entitlement?.tier, "weekly")) {
      setShowSubLock(true);
      return;
    }
    // Only start a new session if one doesn't already exist for this market
    if (!sessions?.[asset.symbol]) {
      startAnalysisSession(asset);
    }
    setActiveSymbol(asset.symbol);
  }

  const activeSignal = signalsMap?.[activeSymbol]?.["15m"] || null;
  // The selected homepage/Markets-tab symbol is authoritative; never substitute BTC when its signal is missing.
  const signalSymbol = activeSymbol || displayMarkets[0] || "BTCUSD";
  const signalInst = ALL_ASSETS.find(a => a.symbol === signalSymbol) || inst;
  const signalData = signalsMap?.[signalSymbol]?.["15m"] || null;
  const signalBias = String(signalData?.bias || "BUY").toUpperCase();
  const signalLabel = signalBias === "SELL" ? "SELL SIGNAL" : signalBias === "HOLD" ? "HOLD" : "BUY SIGNAL";
  const openSignalChart = () => { setActiveSymbol(signalSymbol); setShowFullChart(true); };
  const openMarket = (symbol) => {
    setActiveSymbol(symbol);
    if (!sessions?.[symbol] && addActiveMarket) {
      const asset = ALL_ASSETS.find(a => a.symbol === symbol);
      if (asset) startAnalysisSession(asset);
    }
  };
  const marketCards = displayMarkets.slice(0,3).map(symbol => ALL_ASSETS.find(a=>a.symbol===symbol)).filter(Boolean);
  const replaceMarket = (oldSymbol, newSymbol) => { setShowAddMarket(false); setDisplayMarkets(prev => { const next = [...prev]; const index = next.indexOf(oldSymbol); if (index >= 0) next[index] = newSymbol; return next; }); replaceActiveMarket?.(oldSymbol, newSymbol); const asset = ALL_ASSETS.find(a => a.symbol === newSymbol); if (asset && !sessions?.[newSymbol]) startAnalysisSession(asset); setActiveSymbol(newSymbol); };

  return (
    <div style={{background:"transparent",minHeight:"100%",color:T.ink}}>
       <section style={{padding:"12px 14px 0",background:"transparent"}}>
        <div style={{background:"#000000",border:"1px solid #2B281F",borderRadius:24,overflow:"hidden",padding:"12px 10px 8px",boxShadow:"0 10px 24px rgba(0,0,0,0.24)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:FONT_HEAD,fontSize:13,fontWeight:700,color:"#F5F1E8"}}>Today’s Performance <span style={{color:"#8D887C",fontSize:12}}>ⓘ</span></div>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:6}}><span style={{fontFamily:FONT_HEAD,fontSize:42,lineHeight:1,fontWeight:800,color:T.gold,letterSpacing:-1.5}}>+{todayPips}</span><span style={{fontFamily:FONT_HEAD,fontSize:27,fontWeight:700,color:"#F5F1E8"}}>Pips</span></div>
              <div style={{marginTop:4,fontFamily:FONT_HEAD,fontSize:11.5,fontWeight:600,color:"#D0C9B9"}}>Pips Wins Today</div>
              <div style={{marginTop:7,fontFamily:FONT_HEAD,fontSize:11,fontWeight:700,color:"#53D769"}}>▲ {todayPips>0?`+${todayPips} pips`:"0 pips"} vs yesterday</div>
            </div>
            <button onClick={openSignalChart} style={{width:150,minHeight:92,flexShrink:0,background:"#11110F",border:"1px solid #4A432A",borderRadius:18,padding:"10px 9px",textAlign:"left",cursor:"pointer",boxShadow:"0 0 18px rgba(244,211,94,0.08)"}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <img src={resolveMarketLogo({symbol:signalSymbol})?.src} alt={signalInst?.name || signalSymbol} style={{width:30,height:30,borderRadius:"50%",objectFit:"cover"}}/>
                <div><div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:14,color:"#F5F1E8"}}>{signalSymbol}</div><div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:11,color:signalBias==="SELL"?"#E27661":signalBias==="HOLD"?"#B4AD9D":"#4FE26E"}}>{signalLabel}</div></div>
              </div>
              <div style={{marginTop:10,border:"1px solid #8E741D",borderRadius:13,padding:"7px",display:"flex",alignItems:"center",justifyContent:"center",gap:5,color:T.gold,fontFamily:FONT_HEAD,fontSize:10.5,fontWeight:800,animation:"rx-breathe 2.2s ease-in-out infinite"}}>Tap to view setup <ArrowUpRight size={12}/></div>
            </button>
          </div>
           <svg viewBox="0 0 680 185" preserveAspectRatio="none" style={{display:"block",width:"100%",height:108,marginTop:4,overflow:"visible"}}>
            <defs>
              <linearGradient id="rxPerfFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F4D35E" stopOpacity=".30"/>
                <stop offset="100%" stopColor="#F4D35E" stopOpacity="0"/>
              </linearGradient>
               <filter id="rxPerfGlow"><feGaussianBlur stdDeviation="2.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <path d={performanceGeometry.fill} fill="url(#rxPerfFill)"/>
             <path d={performanceGeometry.line} fill="none" stroke={T.gold} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#rxPerfGlow)"/>
             <circle cx={performanceGeometry.lastX} cy={performanceGeometry.lastY} r="5" fill={T.gold}/>
             <circle cx={performanceGeometry.lastX} cy={performanceGeometry.lastY} r="11" fill="none" stroke={T.gold} strokeOpacity=".18" strokeWidth="2">
               <animate attributeName="r" values="8;14;8" dur="1.8s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values=".28;.05;.28" dur="1.8s" repeatCount="indefinite"/>
            </circle>
          </svg>
          <div style={{display:"flex",justifyContent:"space-between",padding:"0 3px",color:"#6F6A5D",fontFamily:FONT_HEAD,fontSize:10.5,fontWeight:700}}>{["1D","1W","1M","1Y","All"].map((label,i)=><span key={label} style={{color:i===0?T.gold:"#777164",background:i===0?"#2A2514":"transparent",borderRadius:18,padding:i===0?"7px 13px":"7px 8px"}}>{label}</span>)}</div>
         <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:6,marginTop:6}}>
                            {marketCards.map(asset=>{
                              const logo=resolveMarketLogo({symbol:asset.symbol})?.src; const arr=seriesMap?.[asset.symbol]||[]; const price=arr.length?arr[arr.length-1].price:asset.base; const prev=arr.length>1?arr[arr.length-2].price:price; const up=price>=prev;
                               return <button key={asset.symbol} draggable={reorderMode} onDragStart={()=>{dragSymbol.current=asset.symbol;}} onDragOver={e=>e.preventDefault()} onDrop={()=>{ if(dragSymbol.current && dragSymbol.current!==asset.symbol){ const next=[...displayMarkets]; const from=next.indexOf(dragSymbol.current), to=next.indexOf(asset.symbol); if(from>=0&&to>=0){ next.splice(from,1); next.splice(to,0,dragSymbol.current); setDisplayMarkets(next); reorderActiveMarkets?.(next); } } dragSymbol.current=null; }} onPointerDown={()=>startLongPress(asset)} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onContextMenu={e=>e.preventDefault()} onClick={()=>{ if(!reorderMode) openMarket(asset.symbol); }} style={{minWidth:0,minHeight:86,borderRadius:13,border:`1px solid ${T.cardBorder}`,background:"#1C1913",color:"#F5F1E8",padding:"5px 4px",cursor:reorderMode?"grab":"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:reorderMode?"rx-card-shake .18s ease-in-out infinite alternate":undefined,touchAction:reorderMode?"none":"auto"}}>
                                 {logo?<img src={logo} alt="" style={{width:25,height:25,borderRadius:"50%",objectFit:"cover",marginBottom:4}}/>:<div style={{width:25,height:25,borderRadius:"50%",background:T.gold,marginBottom:4}}/>}
                                <div style={{fontFamily:FONT_HEAD,fontSize:11,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{asset.symbol}</div>
                                <div style={{marginTop:4,fontFamily:FONT_HEAD,fontSize:10,fontWeight:700,color:up?"#5EDB78":"#E27661",fontVariantNumeric:"tabular-nums"}}>{Number(price).toFixed(Math.min(asset.digits,2))}</div>
                              </button>;
                            })}
                             <button onClick={()=>setShowAddMarket(true)} style={{minWidth:0,minHeight:86,borderRadius:13,border:`1px solid ${T.cardBorder}`,background:"#1C1913",color:"#F5F1E8",padding:"5px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",}}>
                               <div style={{width:25,height:25,borderRadius:"50%",border:`2px solid ${T.gold}`,display:"grid",placeItems:"center",marginBottom:4}}><Plus size={15} color={T.gold}/></div>
                              <div style={{fontFamily:FONT_HEAD,fontSize:10.5,fontWeight:800}}>Add Market</div>
                            </button>
                          </div>
        </div>
       </section>
       <SpaceNewsSection />

      {showFullChart&&<HomeChartErrorBoundary><FullChartView inst={signalInst} session={sessions?.[signalSymbol]||session} signalsMap={signalsMap} themeMode={themeMode} onClose={()=>setShowFullChart(false)} livePrice={signalSymbol===activeSymbol?last:(seriesMap?.[signalSymbol]?.slice(-1)?.[0]?.price||null)}/></HomeChartErrorBoundary>}

      {showSubLock&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:28,width:"100%",maxWidth:340,textAlign:"center"}}>
          <div style={{fontSize:38,marginBottom:12}}>🔒</div><div style={{fontFamily:FONT_HEAD,fontWeight:800,fontSize:17,color:T.paper,marginBottom:8}}>Subscription Required</div>
          <div style={{fontSize:13,color:T.muted,lineHeight:1.7,marginBottom:22}}>An active subscription is required to access live market analysis, Raina AI signals, and real-time charts. Subscribe to unlock up to 3 active markets.</div>
          <button onClick={()=>{setShowSubLock(false);onSubscribe();}} style={{width:"100%",background:T.goldGradient,color:T.ink,border:"none",borderRadius:12,padding:"13px 0",fontFamily:FONT_HEAD,fontWeight:800,fontSize:14,cursor:"pointer",marginBottom:10}}>View Plans</button>
          <button onClick={()=>setShowSubLock(false)} style={{width:"100%",background:"none",border:`1px solid ${T.cardBorder}`,borderRadius:12,padding:"11px 0",fontFamily:FONT_HEAD,fontWeight:700,fontSize:13,color:T.muted,cursor:"pointer"}}>Close</button>
        </div>
      </div>}
      {showAddMarket&&<AddMarketSheet initialReplacementAsset={replacementTarget} onClose={()=>{setShowAddMarket(false);setReplacementTarget(null);}} onSelect={handleAssetSelect} onReplaceMarket={replaceMarket} activeMarkets={displayMarkets} maxActiveMarkets={maxActiveMarkets} onRemoveMarket={removeActiveMarket} seriesMap={seriesMap}/>}
       {longPressAsset&&<div onClick={()=>setLongPressAsset(null)} style={{position:"fixed",inset:0,zIndex:1200,background:"rgba(12,16,18,.38)",display:"grid",placeItems:"center",padding:24,backdropFilter:"blur(7px)",animation:"rx-overlay-in .28s ease-out both"}}><div onClick={e=>e.stopPropagation()} style={{width:"min(350px,100%)",background:"#fff",borderRadius:28,padding:"10px 20px 22px",boxShadow:"0 24px 80px rgba(0,0,0,.22)",animation:"rx-modal-spring .55s cubic-bezier(.16,1.22,.3,1) both"}}><div style={{width:40,height:4,borderRadius:3,background:"#E8E8E8",margin:"0 auto 20px"}}/><div style={{width:58,height:58,borderRadius:"50%",background:"#E9FFF4",display:"grid",placeItems:"center",margin:"0 auto 14px",padding:7}}><img src={resolveMarketLogo({symbol:longPressAsset.symbol})?.src} alt="" style={{width:"100%",height:"100%",borderRadius:"50%"}}/></div><div style={{textAlign:"center",fontFamily:FONT_HEAD,fontWeight:800,fontSize:18,color:"#111",marginBottom:4}}>Manage {longPressAsset.symbol}</div><div style={{textAlign:"center",fontSize:12,color:"#A0A0A0",marginBottom:20}}>Choose an action for this market</div><div style={{display:"grid",gap:8}}><button onClick={()=>{setReplacementTarget(longPressAsset);setLongPressAsset(null);setShowAddMarket(true);}} style={{padding:14,border:0,borderRadius:14,background:"#111",color:"#fff",textAlign:"center",fontFamily:FONT_HEAD,fontWeight:800,fontSize:13}}>Replace</button><button onClick={()=>{removeActiveMarket(longPressAsset.symbol);setLongPressAsset(null);}} style={{padding:14,border:"1px solid #ECECEC",borderRadius:14,background:"#fff",color:"#222",textAlign:"center",fontFamily:FONT_HEAD,fontWeight:800,fontSize:13}}>Close market</button><button onClick={()=>{setReorderMode(true);setLongPressAsset(null);}} style={{padding:14,border:"1px solid #ECECEC",borderRadius:14,background:"#fff",color:"#222",textAlign:"center",fontFamily:FONT_HEAD,fontWeight:800,fontSize:13}}>Rearrange</button></div></div></div>}
       {reorderMode&&<button onClick={()=>setReorderMode(false)} style={{position:"fixed",right:16,bottom:92,zIndex:50,border:0,borderRadius:20,padding:"10px 14px",background:T.ink,color:T.gold,fontFamily:FONT_HEAD,fontWeight:800}}>Done rearranging</button>}
    </div>
  );
}
function Row({ label, value, color }) {
  return <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0" }}><span style={{ color:T.muted, fontWeight:500 }}>{label}</span><span style={{ color:color||T.paper, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{value}</span></div>;
}



export default HomeTab;
