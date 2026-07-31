import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Maximize2, Home } from "lucide-react";
import LightweightChart from "./LightweightChart";
import FullChartView from "./FullChartView";
import { supabase } from "./supabaseClient";
import {
  T, FONT_HEAD, FONT_BODY,
  ALL_ASSETS, INSTRUMENTS, ASSET_CATALOG, ANALYSIS_DURATIONS, STEP_DEFS, TIMEFRAMES,
  isMarketOpen, nextOpenLabel, ticksToCandles, seedSeriesFromPrice, fetchLivePrice,
  sma, rsi, askRaina, recordActivity, saveTradeHistory,
  BiasChip, playNotifSound, getInputStyle,
  lsGet, lsSet, storageGet, storageSet,
} from "./shared";

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
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
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
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
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
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
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
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
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
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:80, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
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
// Home Tab — main redesigned screen
// ─────────────────────────────────────────────────────────────────────────────
function HomeTab({ inst, marketOpen, last, changePct, series, activeSymbol, setActiveSymbol, entitlement, onSubscribe, session, sessions, sessionSecsLeft, startAnalysisSession, seriesMap, themeMode, activeMarkets = [], addActiveMarket, removeActiveMarket, maxActiveMarkets = 3 }) {
  const [showAddMarket, setShowAddMarket] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showFullChart, setShowFullChart] = useState(false);
  const [activeChartTf, setActiveChartTf] = useState("15m");   // chart candle timeframe — does NOT control AI analysis duration
  const [sigTf, setSigTf] = useState("15m");   // signal card timeframe tab

  // Sync dark canvas flag
  setIsDarkCanvas(T.ink === "#0F0E0B");

  // OHLCV candles from tick series (fallback while real candles load)
  const candles = React.useMemo(() => ticksToCandles(series || [], 70), [series]);

  // Local live price with micro-jitter so the chart always animates even when API is slow
  const [localLast, setLocalLast] = React.useState(last);
  React.useEffect(() => { if (last) setLocalLast(last); }, [last]);
  React.useEffect(() => {
    const id = setInterval(() => {
      setLocalLast(prev => {
        if (!prev || !inst) return prev;
        const jitter = (Math.random() - 0.5) * (inst.vol || 1) * 0.03;
        return Number(Math.max((inst.base || 1) * 0.5, prev + jitter).toFixed(inst.digits ?? 2));
      });
    }, 400);
    return () => clearInterval(id);
  }, [inst]);

  // Real candles from Raina AI backend — keyed to selected timeframe
  const BASE_URL_H = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
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

  const [showSubLock, setShowSubLock] = useState(false);

  // Called from AddMarketSheet when the user picks a NEW market to add/replace
  function handleAssetSelect(asset) {
    setShowAddMarket(false);
    if (!hasAccess(entitlement?.tier, "weekly")) {
      setShowSubLock(true);
      return;
    }
    if (addActiveMarket) addActiveMarket(asset.symbol);
    // Only start a new session if one doesn't already exist for this market
    if (!sessions?.[asset.symbol]) {
      startAnalysisSession(asset);
    }
    setActiveSymbol(asset.symbol);
  }

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* ── Asset tab bar ──────────────────────────────────────────────── */}
      <div className="hide-scroll" style={{ display:"flex", gap:6, padding:"12px 14px 6px", overflowX:"auto", overflowY:"hidden", WebkitOverflowScrolling:"touch", position:"relative" }}>
        {(() => {
          const primarySym = session?.symbol || activeSymbol;
          const primaryAsset = ALL_ASSETS.find(a => a.symbol === primarySym);
          // Show active watched markets; fall back to defaults if none set yet
          const watchedAssets = activeMarkets.length > 0
            ? activeMarkets.filter(s => s !== primarySym).map(s => ALL_ASSETS.find(a => a.symbol === s)).filter(Boolean)
            : [];
          const tabs = [primaryAsset, ...watchedAssets].filter(Boolean).slice(0, 4);
          return tabs.map(a => {
            const active = a.symbol === primarySym;
            return (
              // Tab bar just switches the view — no dialog, no session restart
              <button key={a.symbol} onClick={() => setActiveSymbol(a.symbol)} style={{ flexShrink:0, background:active ? T.gold : T.card, color:active ? T.ink : T.paper, border:`1px solid ${active ? T.gold : T.cardBorder}`, borderRadius:20, padding:"6px 14px", fontFamily:FONT_HEAD, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                {a.symbol}
              </button>
            );
          });
        })()}
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
              <div style={{ fontFamily:FONT_HEAD, fontSize:10, fontWeight:700, color:T.muted }}>{a.symbol}</div>
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

        {/* Empty state: only when zero markets selected */}
        {activeMarkets.length === 0 && !session && (
          <div style={{ position:"absolute", inset:0, zIndex:5, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:T.ink + "cc", borderRadius:14 }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper, marginBottom:4 }}>Select a market</div>
            <div style={{ fontSize:12, color:T.muted, marginBottom:16, textAlign:"center", maxWidth:200 }}>You can select up to 3 markets per day.</div>
            <button onClick={() => setShowAddMarket(true)} style={{ background:T.gold, color:T.ink, border:"none", borderRadius:10, padding:"10px 22px", fontFamily:FONT_HEAD, fontWeight:800, fontSize:13, cursor:"pointer" }}>+ Add Market</button>
          </div>
        )}
        {/* Market Closed overlay */}
        {!marketOpen && (activeMarkets.length > 0 || !!session) && (
          <div style={{ position:"absolute", inset:0, zIndex:4, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"rgba(15,14,11,0.75)", borderRadius:14, pointerEvents:"none" }}>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.muted, marginBottom:6 }}>Market Closed</div>
            <div style={{ fontSize:12, color:T.muted, textAlign:"center", maxWidth:220, lineHeight:1.6 }}>
              {inst?.cls === "crypto" ? "Crypto trades 24/7 — data will resume shortly." : inst?.cls === "forex" ? "Forex is closed on weekends (Sat–Sun UTC)." : "Opens at the next market session."}
            </div>
          </div>
        )}

        {/* Preview chart — powered by lightweight-charts */}
        <div style={{ height:270, flexShrink:0, minHeight:220 }}>
          <LightweightChart
            candles={chartCandles}
            overlays={[
              ...(session?.overlays || []).filter(o => !o._tf),
              ...(session?.overlaysByTf?.[sigTf] || []),
            ]}
            inst={inst}
            containerHeight={270}
            compact={false}
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
          livePrice={last}
        />
      )}

      {/* ── Timeframe selector (chart candle timeframe — M15 = 15-min candles, not AI analysis duration) ── */}
      <div className="hide-scroll" style={{ display:"flex", gap:6, padding:"10px 14px 0", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        {["15m","30m","1H","2H","4H","1D"].map(tf => {
          const active = tf === activeChartTf;
          return (
            <button key={tf} onClick={() => setActiveChartTf(tf)} style={{ flexShrink:0, minWidth:44, padding:"7px 0", borderRadius:8, border:`1px solid ${active ? T.gold : T.cardBorder}`, background:active ? T.gold : T.card, color:active ? T.ink : T.paper, fontFamily:FONT_HEAD, fontWeight:700, fontSize:11, cursor:"pointer" }}>
              {tf}
            </button>
          );
        })}
      </div>

      {/* ── Signal Timeframe Tabs ───────────────────────────────────────── */}
      <div style={{ display:"flex", gap:0, margin:"12px 14px 0", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:4 }}>
        {[{key:"15m",label:"15 Minute"},{key:"1h",label:"1 Hour"}].map(({key,label})=>{
          const active = sigTf === key;
          return (
            <button key={key} onClick={()=>setSigTf(key)} style={{ flex:1, background:active?T.gold:"transparent", color:active?T.ink:T.muted, border:"none", borderRadius:8, padding:"9px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              {active && <span style={{ width:7, height:7, borderRadius:"50%", background:T.ink, display:"inline-block", flexShrink:0 }} />}
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Signal Card ──────────────────────────────────────────────────── */}
      {(()=>{
        const setup = session?.setupByTf?.[sigTf];
        const sym = session?.symbol || activeSymbol || "—";
        const tfLabel = sigTf === "15m" ? "15 Minute" : "1 Hour";
        const genTime = session?.activities?.length
          ? (session.activities[session.activities.length-1]?.time || new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"}))
          : new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

        // Market closed state
        if (!marketOpen && (activeMarkets.length > 0 || !!session)) {
          return (
            <div style={{ margin:"8px 14px 0", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"32px 20px", textAlign:"center" }}>
              <div style={{ fontSize:34, marginBottom:10 }}>🌙</div>
              <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.paper, marginBottom:6 }}>Market is closed</div>
              <div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>No new signals will load until trading resumes.</div>
            </div>
          );
        }

        // Analyzing — no setup yet
        if (!session || (!setup && session.state === "analyzing")) {
          return (
            <div style={{ margin:"8px 14px 0", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"28px 20px", textAlign:"center" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:T.gold, margin:"0 auto 12px", animation:"pulse 1.5s infinite" }} />
              <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.gold, marginBottom:4 }}>Analyzing market…</div>
              <div style={{ fontSize:12, color:T.muted }}>A signal will appear when a strong setup is confirmed.</div>
            </div>
          );
        }

        const bias = setup?.bias || "HOLD";
        const isBuy = bias === "BUY", isSell = bias === "SELL", isHold = !isBuy && !isSell;
        const confidence = setup?.confidence ?? 0;
        const dotColor = isBuy ? T.sage : isSell ? T.rust : T.muted;
        const actText = session?.activities?.[0]?.text || "";
        const hasSlHit = actText.toLowerCase().includes("stop loss");
        const hasTpHit = actText.toLowerCase().includes("take profit");
        let message = null;
        if (isHold) message = "No trade recommended right now - signals are mixed. No entry, stop loss, or take profit is being tracked for this call.";
        else if (hasSlHit) message = "Stop Loss hit. Your capital was protected by our risk-management limits. We are analyzing the next high-probability market setup.";
        else if (hasTpHit) message = "Take Profit hit. Well done. We are scanning for the next high-probability setup.";
        const fmt = n => (n != null && isFinite(n)) ? Number(n).toFixed(inst?.digits ?? 2) : "—";
        const entry = setup?.entry ?? (setup?.entryLow != null && setup?.entryHigh != null ? (setup.entryLow + setup.entryHigh) / 2 : null);

        return (
          <div style={{ margin:"8px 14px 0", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"14px 16px" }}>
            {/* Header: symbol + badge */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.paper }}>{sym}</div>
                <div style={{ fontSize:11.5, color:T.muted, marginTop:3 }}>{tfLabel} signal · generated {genTime}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, background:T.ink, border:`1px solid ${T.cardBorder}`, borderRadius:8, padding:"5px 10px", flexShrink:0 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:dotColor, flexShrink:0 }} />
                <span style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:13, color:T.paper }}>{bias}</span>
              </div>
            </div>
            {/* Confidence row */}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13.5, padding:"6px 0", borderBottom:`1px solid ${T.cardBorder}` }}>
              <span style={{ color:T.muted }}>Confidence</span>
              <span style={{ color:T.paper, fontWeight:700 }}>{confidence}%</span>
            </div>
            {/* Message box */}
            {message && (
              <div style={{ background:`${T.cardBorder}40`, border:`1px solid ${T.cardBorder}`, borderRadius:10, padding:"10px 12px", margin:"8px 0" }}>
                <div style={{ fontSize:12.5, color:T.paper, lineHeight:1.6 }}>{message}</div>
              </div>
            )}
            {/* Trade rows — BUY / SELL only */}
            {!isHold && setup && (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13.5, padding:"6px 0", borderBottom:`1px solid ${T.cardBorder}` }}>
                  <span style={{ color:T.muted }}>Entry</span>
                  <span style={{ color:T.paper, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{fmt(entry)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13.5, padding:"6px 0", borderBottom:`1px solid ${T.cardBorder}` }}>
                  <span style={{ color:T.muted }}>Stop Loss</span>
                  <span style={{ color:T.rust, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{fmt(setup.stopLoss)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13.5, padding:"6px 0", borderBottom:`1px solid ${T.cardBorder}` }}>
                  <span style={{ color:T.muted }}>Take Profit 1</span>
                  <span style={{ color:T.sage, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{fmt(setup.tp1)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13.5, padding:"6px 0" }}>
                  <span style={{ color:T.muted }}>Take Profit 2</span>
                  <span style={{ color:T.sage, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{fmt(setup.tp2)}</span>
                </div>
              </>
            )}
          </div>
        );
      })()}
      {/* Session complete panel */}
      {session?.state === "completed" && (
        <div style={{ margin:"12px 14px 0", background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"20px 16px", textAlign:"center" }}>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper, marginBottom:6 }}>Analysis Session Complete</div>
          <div style={{ fontSize:12, color:T.muted, marginBottom:16 }}>The selected analysis period has ended. Start a new session to continue monitoring.</div>
          <button onClick={() => setShowAddMarket(true)} style={{ background:T.gold, color:T.ink, border:"none", borderRadius:10, padding:"11px 28px", fontFamily:FONT_HEAD, fontWeight:800, fontSize:13, cursor:"pointer" }}>Analyze Again</button>
        </div>
      )}

      <div style={{ margin:"10px 14px 16px", fontSize:10.5, color:T.muted, lineHeight:1.6, textAlign:"center" }}>
        AI-generated analysis, not financial advice. No outcome is guaranteed. Always manage your risk.
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showSubLock && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:90, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:18, padding:28, width:"100%", maxWidth:340, textAlign:"center" }}>
            <div style={{ fontSize:38, marginBottom:12 }}>🔒</div>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.paper, marginBottom:8 }}>Subscription Required</div>
            <div style={{ fontSize:13, color:T.muted, lineHeight:1.7, marginBottom:22 }}>An active subscription is required to access live market analysis, Raina AI signals, and real-time charts. Subscribe to unlock up to 3 active markets.</div>
            <button onClick={() => { setShowSubLock(false); onSubscribe(); }} style={{ width:"100%", background:`linear-gradient(135deg,${T.gold},${T.goldBright})`, color:T.ink, border:"none", borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:800, fontSize:14, cursor:"pointer", marginBottom:10 }}>View Plans</button>
            <button onClick={() => setShowSubLock(false)} style={{ width:"100%", background:"none", border:`1px solid ${T.cardBorder}`, borderRadius:12, padding:"11px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, color:T.muted, cursor:"pointer" }}>Close</button>
          </div>
        </div>
      )}
      {showAddMarket && <AddMarketSheet onClose={() => setShowAddMarket(false)} onSelect={handleAssetSelect} activeMarkets={activeMarkets} maxActiveMarkets={maxActiveMarkets} onRemoveMarket={removeActiveMarket} />}
    </div>
  );
}
function Row({ label, value, color }) {
  return <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0" }}><span style={{ color:T.muted, fontWeight:500 }}>{label}</span><span style={{ color:color||T.paper, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{value}</span></div>;
}



export default HomeTab;
