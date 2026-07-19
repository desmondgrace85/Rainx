/**
 * FullChartView — Professional full-screen trading chart for RainX
 * Features: real OHLCV candles, pinch-to-zoom, pan, crosshair, timeframes,
 * live price, and all Raina AI analysis overlay types.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronDown, Loader } from "lucide-react";

// ── Design tokens (must match RainxApp DARK/LIGHT_TOKENS) ──────────────────
const DARK  = { bg:"#0F0E0B", card:"#1C1913", border:"#332C1F", gold:"#C6A15B", goldBright:"#E3C077", sage:"#22c55e", rust:"#ef4444", paper:"#F2EDE0", muted:"#9C947F", crosshair:"rgba(198,161,91,0.8)" };
const LIGHT = { bg:"#FFFFFF",  card:"#F7F9F9", border:"#EFF3F4", gold:"#C6A15B", goldBright:"#9E7B35", sage:"#16a34a", rust:"#dc2626", paper:"#0F1419", muted:"#536471", crosshair:"rgba(180,120,20,0.85)" };
const FONT  = "'Montserrat', 'Inter', sans-serif";

const TF_LIST = [
  { key:"1m",  label:"1M"  },
  { key:"5m",  label:"5M"  },
  { key:"15m", label:"15M" },
  { key:"30m", label:"30M" },
  { key:"1h",  label:"1H"  },
  { key:"4h",  label:"4H"  },
  { key:"1d",  label:"1D"  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}
function fmtPrice(p, digits) { return Number(p).toFixed(Math.min(digits || 2, 5)); }
function fmtAxisTime(ts, interval) {
  const d = new Date(ts);
  if (interval === "1d") return `${d.toLocaleDateString("en",{month:"short",day:"numeric"})}`;
  if (["4h","1h"].includes(interval)) {
    return `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,"0")}h`;
  }
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}
function labelInterval(ts, tf, idx, vis) {
  if (vis.length < 2) return false;
  const step = Math.max(1, Math.floor(vis.length / 6));
  return idx % step === 0;
}

// ── Main canvas draw function ───────────────────────────────────────────────
function drawFullChart({ canvas, candles, overlays, inst, panOffset, visibleCount, crosshair, dark }) {
  if (!canvas || candles.length < 3) return;
  const T = dark ? DARK : LIGHT;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth  || 375;
  const H = canvas.offsetHeight || 520;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, W, H);

  const PAD = { top:14, bottom:42, left:4, right:76 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top  - PAD.bottom;

  // Visible window
  const endIdx   = Math.min(candles.length, candles.length - panOffset + visibleCount);
  const startIdx = Math.max(0, endIdx - visibleCount);
  const vis      = candles.slice(startIdx, endIdx);
  if (vis.length < 2) return;

  const gap = cW / vis.length;
  const bW  = Math.max(1.5, gap * 0.68);
  const toX = (i) => PAD.left + i * gap + gap / 2;

  // Price range (include overlay prices + 12% margin)
  const allP = vis.flatMap(c => [c.high, c.low]);
  (overlays || []).forEach(o => {
    if (o.price    != null) allP.push(o.price);
    if (o.priceHigh != null) allP.push(o.priceHigh, o.priceLow);
    if (o.target   != null) allP.push(o.target);
    if (o.price1   != null) allP.push(o.price1, o.price2);
  });
  const rawMin = Math.min(...allP), rawMax = Math.max(...allP);
  const mg = (rawMax - rawMin) * 0.12;
  const minP = rawMin - mg, maxP = rawMax + mg;
  const pR   = maxP - minP || 1;
  const toY  = p => PAD.top + cH - ((p - minP) / pR) * cH;

  // ── Grid lines ─────────────────────────────────────────────────────────
  const GRID = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
  ctx.setLineDash([2,5]); ctx.strokeStyle = GRID; ctx.lineWidth = 1;
  for (let i = 1; i <= 7; i++) {
    const gy = PAD.top + (cH / 8) * i;
    ctx.beginPath(); ctx.moveTo(PAD.left, gy); ctx.lineTo(W - PAD.right, gy); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Label anti-overlap tracker
  const usedY = [];
  const fits  = (y, h=14) => usedY.every(r => Math.abs(r.y - y) > (r.h + h) / 2 + 3);
  const grab  = (y, h=14) => { usedY.push({y,h}); };

  // ── Draw AI Overlays ────────────────────────────────────────────────────
  const ovs = overlays || [];

  // 1. Liquidity zones (amber, behind everything)
  ovs.filter(o => o.type === "liquidity").forEach(o => {
    const y1 = toY(o.priceHigh), y2 = toY(o.priceLow);
    ctx.fillStyle = "rgba(245,158,11,0.08)";
    ctx.fillRect(PAD.left, y1, cW, y2-y1);
    ctx.setLineDash([4,3]);
    ctx.strokeStyle = "rgba(245,158,11,0.35)"; ctx.lineWidth = 1;
    ctx.strokeRect(PAD.left, y1, cW, y2-y1);
    ctx.setLineDash([]);
    const midY = (y1+y2)/2;
    if (fits(midY,10)) {
      ctx.font = `bold 8.5px ${FONT}`; ctx.fillStyle = "rgba(245,158,11,0.85)";
      ctx.fillText("Liquidity Zone", PAD.left+5, midY+3); grab(midY,10);
    }
  });

  // 2. Support zones (blue)
  ovs.filter(o => o.type === "support_zone").forEach(o => {
    const y1 = toY(o.priceHigh), y2 = toY(o.priceLow), midY = (y1+y2)/2;
    ctx.fillStyle = dark ? "rgba(59,130,246,0.10)" : "rgba(29,111,232,0.07)";
    ctx.fillRect(PAD.left, y1, cW, y2-y1);
    ctx.strokeStyle = "rgba(59,130,246,0.35)"; ctx.lineWidth = 1;
    ctx.strokeRect(PAD.left, y1, cW, y2-y1);
    if (fits(midY,10)) {
      ctx.font = `bold 8.5px ${FONT}`; ctx.fillStyle = "#3b82f6";
      ctx.fillText("Support Zone", PAD.left+5, midY+3); grab(midY,10);
    }
    if (fits(midY+0.1,20)) {
      ctx.fillStyle = "#3b82f6";
      roundRect(ctx, W-PAD.right+2, midY-9, PAD.right-3, 18, 3); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font=`bold 7.5px ${FONT}`; ctx.textAlign="center";
      ctx.fillText(fmtPrice(o.priceLow, inst.digits), W-PAD.right/2, midY+3);
      ctx.textAlign="left"; grab(midY,20);
    }
  });

  // 3. Channel (two parallel diagonal lines)
  ovs.filter(o => o.type === "channel").forEach(o => {
    const x0=PAD.left, x1=Math.min(toX(vis.length-3), W-PAD.right-10);
    ctx.strokeStyle = "rgba(198,161,91,0.45)"; ctx.lineWidth = 1.5; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(x0, toY(o.price1)); ctx.lineTo(x1, toY(o.price2)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, toY(o.price3)); ctx.lineTo(x1, toY(o.price4)); ctx.stroke();
    // Fill channel area
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(198,161,91,0.04)";
    ctx.beginPath();
    ctx.moveTo(x0, toY(o.price1)); ctx.lineTo(x1, toY(o.price2));
    ctx.lineTo(x1, toY(o.price4)); ctx.lineTo(x0, toY(o.price3));
    ctx.closePath(); ctx.fill();
    ctx.setLineDash([]);
    const midYLabel = (toY(o.price2)+toY(o.price4))/2;
    if (fits(midYLabel,10)) {
      ctx.font=`bold 8.5px ${FONT}`; ctx.fillStyle="rgba(198,161,91,0.9)";
      ctx.fillText("Channel", x1-60, midYLabel-4); grab(midYLabel,10);
    }
  });

  // 4. Trendlines (gold diagonal)
  ovs.filter(o => o.type === "trendline").forEach(o => {
    const x0=PAD.left, x1=Math.min(toX(vis.length-4), W-PAD.right-10);
    ctx.strokeStyle = DARK.gold; ctx.lineWidth = 1.8; ctx.setLineDash([7,4]);
    ctx.beginPath(); ctx.moveTo(x0, toY(o.price1)); ctx.lineTo(x1, toY(o.price2)); ctx.stroke();
    ctx.setLineDash([]);
    const lY = toY(o.price2) - 8;
    if (fits(lY,10)) {
      ctx.font=`bold 8.5px ${FONT}`; ctx.fillStyle=DARK.gold;
      ctx.fillText(o.label||"Trend Line", x0+5, lY); grab(lY,10);
    }
  });

  // 5. Resistance (red dashed)
  ovs.filter(o => o.type === "resistance").forEach(o => {
    const y = toY(o.price);
    ctx.strokeStyle = T.rust; ctx.lineWidth = 1.5; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W-PAD.right, y); ctx.stroke();
    ctx.setLineDash([]);
    const lY = y - 7;
    if (fits(lY,10)) {
      ctx.font=`bold 8.5px ${FONT}`; ctx.fillStyle=T.rust;
      ctx.fillText(o.label||"Resistance", PAD.left+5, lY); grab(lY,10);
    }
    if (fits(y,20)) {
      ctx.fillStyle=T.rust;
      roundRect(ctx, W-PAD.right+2, y-9, PAD.right-3, 18, 3); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font=`bold 7.5px ${FONT}`; ctx.textAlign="center";
      ctx.fillText(fmtPrice(o.price, inst.digits), W-PAD.right/2, y+3);
      ctx.textAlign="left"; grab(y,20);
    }
  });

  // 6. Breakout zone
  ovs.filter(o => o.type === "breakout").forEach(o => {
    const y1 = toY(o.priceHigh||o.price+inst.vol*0.5);
    const y2 = toY(o.priceLow ||o.price-inst.vol*0.5);
    ctx.fillStyle = "rgba(34,197,94,0.07)";
    ctx.fillRect(PAD.left, y1, cW, y2-y1);
    ctx.strokeStyle = T.sage; ctx.lineWidth = 1; ctx.setLineDash([4,3]);
    ctx.strokeRect(PAD.left, y1, cW, y2-y1);
    ctx.setLineDash([]);
    const midY = (y1+y2)/2;
    if (fits(midY,10)) {
      ctx.font=`bold 9px ${FONT}`; ctx.fillStyle=T.sage;
      ctx.fillText("BREAKOUT ZONE", PAD.left+5, midY+3); grab(midY,10);
    }
  });

  // 7. Entry zone (gold shaded)
  ovs.filter(o => o.type === "entry_zone").forEach(o => {
    const y1 = toY(o.priceHigh), y2 = toY(o.priceLow);
    ctx.fillStyle = "rgba(198,161,91,0.10)";
    ctx.fillRect(PAD.left, y1, cW, y2-y1);
    [y1,y2].forEach(y => {
      ctx.strokeStyle = DARK.gold; ctx.lineWidth = 1; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(PAD.left,y); ctx.lineTo(W-PAD.right,y); ctx.stroke();
      ctx.setLineDash([]);
    });
    const midY = (y1+y2)/2;
    if (fits(midY,10)) {
      ctx.font=`bold 8.5px ${FONT}`; ctx.fillStyle=DARK.gold;
      ctx.fillText("Entry Zone", PAD.left+5, midY+3); grab(midY,10);
    }
  });

  // 8. TP levels (green dotted)
  ovs.filter(o => o.type === "tp_level").forEach(o => {
    const y = toY(o.price);
    ctx.strokeStyle = T.sage; ctx.lineWidth = 1.5; ctx.setLineDash([5,3]);
    ctx.beginPath(); ctx.moveTo(PAD.left,y); ctx.lineTo(W-PAD.right,y); ctx.stroke();
    ctx.setLineDash([]);
    if (fits(y-7,10)) {
      ctx.font=`bold 8.5px ${FONT}`; ctx.fillStyle=T.sage;
      ctx.fillText(o.label||"TP", PAD.left+5, y-5); grab(y-7,10);
    }
    if (fits(y,20)) {
      ctx.fillStyle=T.sage;
      roundRect(ctx, W-PAD.right+2, y-9, PAD.right-3, 18, 3); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font=`bold 7.5px ${FONT}`; ctx.textAlign="center";
      ctx.fillText(fmtPrice(o.price, inst.digits), W-PAD.right/2, y+3);
      ctx.textAlign="left"; grab(y,20);
    }
  });

  // 9. SL level (red dotted)
  ovs.filter(o => o.type === "sl_level").forEach(o => {
    const y = toY(o.price);
    ctx.strokeStyle = T.rust; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(PAD.left,y); ctx.lineTo(W-PAD.right,y); ctx.stroke();
    ctx.setLineDash([]);
    if (fits(y+7,10)) {
      ctx.font=`bold 8.5px ${FONT}`; ctx.fillStyle=T.rust;
      ctx.fillText("Stop Loss", PAD.left+5, y+12); grab(y+7,10);
    }
    if (fits(y,20)) {
      ctx.fillStyle=T.rust;
      roundRect(ctx, W-PAD.right+2, y-9, PAD.right-3, 18, 3); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font=`bold 7.5px ${FONT}`; ctx.textAlign="center";
      ctx.fillText(fmtPrice(o.price, inst.digits), W-PAD.right/2, y+3);
      ctx.textAlign="left"; grab(y,20);
    }
  });

  // 10. Swing highs/lows
  ovs.filter(o => o.type === "swing_high").forEach(o => {
    const cx = toX(Math.min(o.idx||vis.length-8, vis.length-1));
    const y  = toY(o.price) - 10;
    ctx.fillStyle = T.rust; ctx.font=`bold 8px ${FONT}`;
    ctx.fillText("▼ SH", cx-8, y);
  });
  ovs.filter(o => o.type === "swing_low").forEach(o => {
    const cx = toX(Math.min(o.idx||vis.length-12, vis.length-1));
    const y  = toY(o.price) + 18;
    ctx.fillStyle = T.sage; ctx.font=`bold 8px ${FONT}`;
    ctx.fillText("▲ SL", cx-8, y);
  });

  // 11. Market structure labels
  ovs.filter(o => o.type === "market_structure").forEach(o => {
    const cx = toX(Math.min(o.idx||vis.length-5, vis.length-1));
    const y  = toY(o.price);
    const lbl = o.label || "BOS";
    ctx.font=`bold 9px ${FONT}`; ctx.fillStyle = DARK.gold;
    ctx.fillText(lbl, cx-10, y-5);
  });

  // 12. Direction arrow (curved bezier)
  ovs.filter(o => o.type === "direction_arrow").forEach(o => {
    const lastX = toX(vis.length-1);
    const lastY = toY(vis[vis.length-1]?.close || o.from);
    const endX  = Math.min(lastX + gap*5, W-PAD.right-12);
    const endY  = toY(o.target);
    const isBull = endY < lastY;
    ctx.strokeStyle = isBull ? T.sage : T.rust; ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(lastX, lastY);
    ctx.bezierCurveTo(lastX+(endX-lastX)*0.5, lastY, lastX+(endX-lastX)*0.5, endY, endX, endY);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = isBull ? T.sage : T.rust;
    ctx.beginPath();
    if (isBull) {
      ctx.moveTo(endX,endY); ctx.lineTo(endX-7,endY+5); ctx.lineTo(endX+1,endY+5);
    } else {
      ctx.moveTo(endX,endY); ctx.lineTo(endX-7,endY-5); ctx.lineTo(endX+1,endY-5);
    }
    ctx.closePath(); ctx.fill();
  });

  // 13. Projection (AI blue arrow with annotation box)
  ovs.filter(o => o.type === "projection").forEach(o => {
    const lastX = toX(vis.length-1);
    const lastY = toY(vis[vis.length-1]?.close || o.target);
    const endX  = Math.min(lastX+gap*4, W-PAD.right-12);
    const endY  = toY(o.target);
    ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(lastX,lastY);
    ctx.bezierCurveTo(lastX+(endX-lastX)*0.5,lastY,lastX+(endX-lastX)*0.5,endY,endX,endY);
    ctx.stroke();
    ctx.fillStyle = "#3b82f6"; ctx.beginPath();
    ctx.moveTo(endX,endY); ctx.lineTo(endX-7,endY-4); ctx.lineTo(endX-7,endY+4);
    ctx.closePath(); ctx.fill();
    // Annotation box
    const boxW=90, boxH=40;
    const bx=Math.max(PAD.left+4,Math.min(endX-boxW+10,W-PAD.right-boxW-2));
    let by = endY+7;
    if (by+boxH > H-PAD.bottom-2) by = endY-boxH-7;
    if (fits(by+boxH/2,boxH)) {
      ctx.fillStyle = dark ? "rgba(20,30,55,0.93)" : "rgba(235,244,255,0.96)";
      ctx.strokeStyle = "rgba(59,130,246,0.4)"; ctx.lineWidth = 1;
      roundRect(ctx,bx,by,boxW,boxH,5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#3b82f6"; ctx.font=`bold 7.5px ${FONT}`;
      ctx.fillText("AI Projection", bx+5, by+12);
      const textColor = dark ? "rgba(220,225,235,0.55)" : "rgba(18,18,42,0.5)";
      ctx.fillStyle = textColor; ctx.font=`7px ${FONT}`;
      ctx.fillText("Projected target zone.", bx+5, by+23);
      ctx.fillText(`${fmtPrice(o.target, inst.digits)}`, bx+5, by+32);
      grab(by+boxH/2,boxH);
    }
  });

  // 14. Current price line (gold)
  ovs.filter(o => o.type === "current_price").forEach(o => {
    const y = toY(o.price);
    ctx.strokeStyle = DARK.gold; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(PAD.left,y); ctx.lineTo(W-PAD.right,y); ctx.stroke();
    ctx.setLineDash([]);
    if (fits(y,20)) {
      ctx.fillStyle = DARK.gold;
      roundRect(ctx, W-PAD.right+2, y-9, PAD.right-3, 18, 3); ctx.fill();
      ctx.fillStyle = dark ? "#000" : "#fff";
      ctx.font=`bold 7.5px ${FONT}`; ctx.textAlign="center";
      ctx.fillText(fmtPrice(o.price, inst.digits), W-PAD.right/2, y+3);
      ctx.textAlign="left"; grab(y,20);
    }
  });

  // ── Draw Candles ────────────────────────────────────────────────────────
  vis.forEach((c, i) => {
    const x   = toX(i);
    const bull = c.close >= c.open;
    const yO  = toY(c.open), yC = toY(c.close), yH = toY(c.high), yL = toY(c.low);
    // Wick
    ctx.strokeStyle = bull ? T.sage : T.rust; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x,yH); ctx.lineTo(x,yL); ctx.stroke();
    // Body
    const top = Math.min(yO,yC), bh = Math.max(1.5, Math.abs(yO-yC));
    ctx.fillStyle = bull ? T.sage : T.rust;
    ctx.fillRect(x-bW/2, top, bW, bh);
  });

  // ── Price axis (right) ──────────────────────────────────────────────────
  const TEXT = dark ? "rgba(242,237,224,0.55)" : "rgba(15,20,25,0.5)";
  ctx.fillStyle = TEXT; ctx.font=`8.5px ${FONT}`; ctx.textAlign="right";
  const nL = 6;
  for (let i=0; i<=nL; i++) {
    const p = minP + (pR/nL)*i, y = toY(p);
    if (y < PAD.top+5 || y > H-PAD.bottom-2) continue;
    ctx.fillText(fmtPrice(p, inst.digits), W-PAD.right-3, y+3);
  }

  // ── Time axis (bottom) ──────────────────────────────────────────────────
  ctx.textAlign="center"; ctx.font=`8px ${FONT}`; ctx.fillStyle=TEXT;
  const tStep = Math.max(1, Math.floor(vis.length/6));
  vis.forEach((c, i) => {
    if (i % tStep !== 0) return;
    const lbl = fmtAxisTime(c.t, inst._tf||"1h");
    const x   = toX(i);
    if (x < 20 || x > W-PAD.right-10) return;
    ctx.fillText(lbl, x, H-8);
  });
  ctx.textAlign="left";

  // ── Pan progress bar ─────────────────────────────────────────────────────
  if (panOffset > 0 && candles.length > visibleCount) {
    const ratio = panOffset / Math.max(1, candles.length - visibleCount);
    const bLen = Math.max(30, cW*0.2);
    const bX = PAD.left + (cW-bLen) * Math.min(1, ratio);
    ctx.fillStyle = dark ? "rgba(198,161,91,0.25)" : "rgba(198,161,91,0.35)";
    roundRect(ctx, bX, H-PAD.bottom+7, bLen, 3, 1.5); ctx.fill();
  }

  // ── Crosshair ────────────────────────────────────────────────────────────
  if (crosshair) {
    const { x: cx, y: cy, candleIdx } = crosshair;
    const ch_color = T.crosshair;
    // Vertical line
    ctx.strokeStyle = ch_color; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(cx, PAD.top); ctx.lineTo(cx, H-PAD.bottom); ctx.stroke();
    // Horizontal line
    ctx.beginPath(); ctx.moveTo(PAD.left, cy); ctx.lineTo(W-PAD.right, cy); ctx.stroke();
    ctx.setLineDash([]);
    // Price bubble on Y axis
    const priceAtY = maxP - ((cy - PAD.top) / cH) * pR;
    ctx.fillStyle = ch_color;
    roundRect(ctx, W-PAD.right+2, cy-9, PAD.right-3, 18, 3); ctx.fill();
    ctx.fillStyle = dark ? "#000" : "#fff";
    ctx.font=`bold 7.5px ${FONT}`; ctx.textAlign="center";
    ctx.fillText(fmtPrice(priceAtY, inst.digits), W-PAD.right/2, cy+3);
    ctx.textAlign="left";
    // OHLC box for the hovered candle
    const hc = vis[candleIdx];
    if (hc) {
      const boxW=180, boxH=64, boxX=cx<W/2?cx+8:cx-boxW-8, boxY=PAD.top+6;
      ctx.fillStyle = dark ? "rgba(28,25,19,0.95)" : "rgba(247,249,249,0.97)";
      ctx.strokeStyle = dark ? "rgba(198,161,91,0.3)" : "rgba(198,161,91,0.4)";
      ctx.lineWidth = 1; ctx.setLineDash([]);
      roundRect(ctx,boxX,boxY,boxW,boxH,6); ctx.fill(); ctx.stroke();
      const bull = hc.close >= hc.open;
      ctx.font=`bold 9px ${FONT}`; ctx.fillStyle = bull ? T.sage : T.rust;
      ctx.fillText(`${new Date(hc.t).toLocaleString("en",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}`, boxX+8, boxY+14);
      ctx.font=`8px ${FONT}`; ctx.fillStyle = dark ? "rgba(242,237,224,0.8)" : "rgba(15,20,25,0.8)";
      ctx.fillText(`O: ${fmtPrice(hc.open,inst.digits)}   H: ${fmtPrice(hc.high,inst.digits)}`, boxX+8, boxY+28);
      ctx.fillText(`L: ${fmtPrice(hc.low,inst.digits)}   C: ${fmtPrice(hc.close,inst.digits)}`, boxX+8, boxY+40);
      ctx.fillText(`Chg: ${(hc.close-hc.open>=0?"+":"")}${(hc.close-hc.open).toFixed(inst.digits)}`, boxX+8, boxY+54);
    }
  }
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FullChartView({ inst, session, themeMode, onClose }) {
  const dark     = themeMode !== "light";
  const T        = dark ? DARK : LIGHT;

  const [timeframe, setTimeframe]       = useState("1h");
  const [candles,   setCandles]         = useState([]);
  const [loading,   setLoading]         = useState(true);
  const [crosshair, setCrosshair]       = useState(null);
  const [aiPanelOpen, setAiPanelOpen]   = useState(false);
  const [error, setError]               = useState(null);

  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);
  const panOffRef    = useRef(0);
  const visRef       = useRef(80);
  const [panOffset,  setPanOffset]      = useState(0);
  const [visibleCount, setVisibleCount] = useState(80);

  // Touch state refs (avoids stale closures)
  const touchRef = useRef({
    mode:    "none", // "pan" | "pinch" | "crosshair"
    startX:  0,
    startOff: 0,
    startVis: 80,
    pinchDist: 0,
    holdTimer: null,
    lastMoveX: 0,
    lastMoveY: 0,
  });

  // Keep refs in sync
  useEffect(() => { panOffRef.current = panOffset; }, [panOffset]);
  useEffect(() => { visRef.current    = visibleCount; }, [visibleCount]);

  // ── Fetch candles ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    setCrosshair(null);
    const ctrl = new AbortController();
    fetch(`/api/candles?symbol=${encodeURIComponent(inst.symbol)}&interval=${timeframe}&limit=300`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        if (!data.values || !data.values.length) { setLoading(false); return; }
        // API returns newest-first; reverse to oldest-first for canvas
        const vals = [...data.values].reverse().map(v => ({
          t:     new Date(v.datetime).getTime(),
          open:  parseFloat(v.open),
          high:  parseFloat(v.high),
          low:   parseFloat(v.low),
          close: parseFloat(v.close),
          _tf:   timeframe,
        }));
        setCandles(vals);
        setPanOffset(0);
        panOffRef.current = 0;
        setLoading(false);
      })
      .catch(e => { if (e.name !== "AbortError") { setError("Unable to load chart data."); setLoading(false); } });
    return () => ctrl.abort();
  }, [timeframe, inst.symbol]);

  // ── Live price polling (updates last candle close/high/low) ──────────────
  useEffect(() => {
    if (candles.length === 0) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/price?symbol=${encodeURIComponent(inst.symbol)}`);
        const d = await r.json();
        if (d.price && !cancelled) {
          setCandles(prev => {
            if (!prev.length) return prev;
            const last = { ...prev[prev.length-1] };
            last.close = d.price;
            last.high  = Math.max(last.high, d.price);
            last.low   = Math.min(last.low,  d.price);
            return [...prev.slice(0,-1), last];
          });
        }
      } catch {}
    };
    const id = setInterval(poll, 5000);
    poll();
    return () => { cancelled=true; clearInterval(id); };
  }, [candles.length > 0, inst.symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      // Tag candles with current timeframe for axis label formatting
      const tagged = candles.map(c => ({...c, _tf: timeframe}));
      drawFullChart({
        canvas, candles: tagged,
        overlays:      session?.overlays || [],
        inst,
        panOffset:     panOffRef.current,
        visibleCount:  visRef.current,
        crosshair,
        dark,
      });
    });
  }, [candles, session?.overlays, crosshair, dark, inst, timeframe]);

  useEffect(draw, [draw]);

  // ── Touch handlers ───────────────────────────────────────────────────────
  const pinchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  };

  const getCandleIdxFromX = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return -1;
    const rect  = canvas.getBoundingClientRect();
    const W     = rect.width;
    const PAD_L = 4, PAD_R = 76;
    const cW    = W - PAD_L - PAD_R;
    const end   = Math.min(candles.length, candles.length - panOffRef.current + visRef.current);
    const start = Math.max(0, end - visRef.current);
    const vis   = candles.slice(start, end);
    const gap   = cW / vis.length;
    const relX  = clientX - rect.left - PAD_L;
    return Math.max(0, Math.min(vis.length-1, Math.floor(relX / gap)));
  };

  const onTouchStart = (e) => {
    const ts = touchRef.current;
    clearTimeout(ts.holdTimer);
    ts.lastMoveX = e.touches[0].clientX;
    ts.lastMoveY = e.touches[0].clientY;

    if (e.touches.length === 2) {
      ts.mode      = "pinch";
      ts.pinchDist = pinchDist(e.touches);
      ts.startVis  = visRef.current;
      setCrosshair(null);
      return;
    }

    ts.mode     = "pan";
    ts.startX   = e.touches[0].clientX;
    ts.startOff = panOffRef.current;

    // Long-press activates crosshair (300ms hold)
    ts.holdTimer = setTimeout(() => {
      ts.mode = "crosshair";
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x    = ts.lastMoveX - rect.left;
      const y    = ts.lastMoveY - rect.top;
      const ci   = getCandleIdxFromX(ts.lastMoveX);
      setCrosshair({ x, y, candleIdx: ci });
    }, 300);
  };

  const onTouchMove = (e) => {
    const ts = touchRef.current;
    ts.lastMoveX = e.touches[0].clientX;
    ts.lastMoveY = e.touches[0].clientY;

    if (ts.mode === "pinch" && e.touches.length === 2) {
      clearTimeout(ts.holdTimer);
      const dist  = pinchDist(e.touches);
      const ratio = ts.pinchDist / dist;
      const next  = Math.round(ts.startVis * ratio);
      const clamped = Math.max(15, Math.min(250, next));
      setVisibleCount(clamped);
      visRef.current = clamped;
      draw();
      return;
    }

    if (ts.mode === "crosshair") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x    = ts.lastMoveX - rect.left;
      const y    = ts.lastMoveY - rect.top;
      const ci   = getCandleIdxFromX(ts.lastMoveX);
      setCrosshair({ x, y, candleIdx: ci });
      return;
    }

    if (ts.mode === "pan") {
      clearTimeout(ts.holdTimer);
      const dx    = ts.startX - ts.lastMoveX; // positive → scroll toward older candles
      const delta = Math.round(dx / Math.max(2, (canvasRef.current?.offsetWidth||375 - 80) / visRef.current));
      const maxOff = Math.max(0, candles.length - visRef.current);
      const next  = Math.max(0, Math.min(maxOff, ts.startOff + delta));
      setPanOffset(next);
      panOffRef.current = next;
      draw();
    }
  };

  const onTouchEnd = (e) => {
    const ts = touchRef.current;
    clearTimeout(ts.holdTimer);
    if (ts.mode === "pinch" && e.touches.length === 0) ts.mode = "none";
    else if (ts.mode === "crosshair" && e.touches.length === 0) {
      // Keep crosshair visible until next pan
    } else if (ts.mode === "pan") {
      ts.mode = "none";
      setCrosshair(null);
    }
  };

  // Dismiss crosshair on regular tap (no move)
  const onTap = () => {
    if (touchRef.current.mode === "none") setCrosshair(null);
  };

  // ── Overlays summary (for AI panel) ─────────────────────────────────────
  const activeOverlayTypes = [...new Set((session?.overlays||[]).map(o => o.type))];
  const overlayLabels = {
    support_zone:    "Support Zone",
    resistance:      "Resistance",
    trendline:       "Trend Line",
    channel:         "Channel",
    entry_zone:      "Entry Zone",
    tp_level:        "Take Profit",
    sl_level:        "Stop Loss",
    direction_arrow: "Direction",
    projection:      "AI Projection",
    breakout:        "Breakout Zone",
    swing_high:      "Swing High",
    swing_low:       "Swing Low",
    market_structure:"Market Structure",
    liquidity:       "Liquidity Zone",
    current_price:   "Live Price",
  };

  // ── Signal data for AI panel ─────────────────────────────────────────────
  const setup = session?.setup;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background: dark ? DARK.bg : LIGHT.bg,
      display:"flex", flexDirection:"column",
      fontFamily: FONT,
    }}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"10px 14px 8px",
        background: dark ? DARK.card : LIGHT.card,
        borderBottom:`1px solid ${dark?DARK.border:LIGHT.border}`,
        flexShrink:0,
      }}>
        <button
          onClick={onClose}
          style={{ background:"none", border:"none", cursor:"pointer", padding:4, color: dark?DARK.paper:LIGHT.paper, display:"flex" }}
        >
          <X size={20} />
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:15, color:dark?DARK.paper:LIGHT.paper, lineHeight:1.2 }}>{inst.symbol}</div>
          <div style={{ fontSize:10, color:dark?DARK.muted:LIGHT.muted }}>{inst.name}</div>
        </div>

        {/* Timeframe selector */}
        <div style={{ display:"flex", gap:4 }}>
          {TF_LIST.map(tf => (
            <button key={tf.key} onClick={() => setTimeframe(tf.key)} style={{
              padding:"5px 8px", borderRadius:7,
              border:`1px solid ${tf.key===timeframe ? DARK.gold : (dark?DARK.border:LIGHT.border)}`,
              background: tf.key===timeframe ? DARK.gold : "transparent",
              color: tf.key===timeframe ? (dark?"#000":"#000") : (dark?DARK.muted:LIGHT.muted),
              fontFamily:FONT, fontWeight:700, fontSize:10.5, cursor:"pointer",
            }}>
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Canvas chart ─────────────────────────────────────────────── */}
      <div style={{ flex:1, position:"relative", overflow:"hidden", touchAction:"none" }}>
        {loading && (
          <div style={{
            position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
            background: dark ? "rgba(15,14,11,0.85)" : "rgba(255,255,255,0.85)", zIndex:10,
          }}>
            <div style={{ textAlign:"center", color:DARK.gold }}>
              <div style={{ fontSize:12, fontWeight:700, marginTop:8 }}>Loading chart…</div>
            </div>
          </div>
        )}
        {error && !loading && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>
            <div style={{ textAlign:"center", color:dark?DARK.muted:LIGHT.muted, fontSize:13 }}>{error}<br/><span style={{ fontSize:11 }}>Showing simulated data</span></div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ width:"100%", height:"100%", display:"block" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={onTap}
        />

        {/* Session live badge */}
        {session && session.state !== "completed" && (
          <div style={{
            position:"absolute", top:10, left:14, display:"flex", alignItems:"center", gap:5,
            background: dark?"rgba(28,25,19,0.92)":"rgba(247,249,249,0.92)",
            border:`1px solid ${DARK.gold}44`, borderRadius:20, padding:"4px 10px",
          }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:DARK.gold, animation:"pulse 1.5s infinite" }} />
            <span style={{ fontWeight:700, fontSize:10, color:DARK.gold }}>Raina AI Active</span>
          </div>
        )}
      </div>

      {/* ── AI Analysis Panel (collapsible) ──────────────────────────── */}
      {session && (
        <div style={{
          flexShrink:0,
          background: dark ? DARK.card : LIGHT.card,
          borderTop:`1px solid ${dark?DARK.border:LIGHT.border}`,
          maxHeight: aiPanelOpen ? 260 : 46,
          overflow:"hidden",
          transition:"max-height 0.3s ease",
        }}>
          {/* Toggle header */}
          <button
            onClick={() => setAiPanelOpen(v=>!v)}
            style={{
              width:"100%", background:"none", border:"none", cursor:"pointer",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"13px 16px 12px",
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:DARK.gold }} />
              <span style={{ fontWeight:800, fontSize:12, color:dark?DARK.paper:LIGHT.paper }}>
                Raina AI Analysis
              </span>
              {session.setup && (
                <span style={{ background:`${DARK.gold}22`, color:DARK.gold, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6 }}>
                  {session.setup.confidence}% confidence
                </span>
              )}
            </div>
            <ChevronDown size={14} color={dark?DARK.muted:LIGHT.muted} style={{ transform:aiPanelOpen?"rotate(180deg)":"rotate(0)", transition:"transform 0.2s" }} />
          </button>

          {/* Panel content */}
          <div style={{ padding:"0 16px 16px" }}>
            {/* Active overlays */}
            {activeOverlayTypes.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                {activeOverlayTypes.map(type => (
                  <span key={type} style={{
                    background: dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",
                    color: dark?DARK.muted:LIGHT.muted, fontSize:9.5, fontWeight:600,
                    padding:"3px 8px", borderRadius:6,
                  }}>
                    {overlayLabels[type]||type}
                  </span>
                ))}
              </div>
            )}

            {/* Setup numbers */}
            {setup && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                {[
                  { label:"Bias", val:setup.bias, color:setup.bias==="BUY"?T.sage:T.rust },
                  { label:"Entry", val:setup.entry?.toFixed?.(inst.digits)||"—", color:dark?DARK.paper:LIGHT.paper },
                  { label:"Stop Loss", val:setup.stopLoss?.toFixed?.(inst.digits)||"—", color:T.rust },
                  { label:"TP 1", val:setup.tp1?.toFixed?.(inst.digits)||"—", color:T.sage },
                  { label:"TP 2", val:setup.tp2?.toFixed?.(inst.digits)||"—", color:T.sage },
                  { label:"R:R", val:`1:${setup.rr}`, color:dark?DARK.goldBright:LIGHT.goldBright },
                ].map((cell,i) => (
                  <div key={i} style={{ background:dark?DARK.bg:LIGHT.bg, borderRadius:8, padding:"8px 10px", border:`1px solid ${dark?DARK.border:LIGHT.border}` }}>
                    <div style={{ fontSize:8.5, color:dark?DARK.muted:LIGHT.muted, fontWeight:700, marginBottom:3 }}>{cell.label}</div>
                    <div style={{ fontSize:12, fontWeight:800, color:cell.color }}>{cell.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Latest activity */}
            {session.activities?.[0] && (
              <div style={{ marginTop:10, fontSize:10.5, color:dark?DARK.muted:LIGHT.muted, lineHeight:1.5 }}>
                <span style={{ color:DARK.gold, fontWeight:700, marginRight:6 }}>{session.activities[0].time}</span>
                {session.activities[0].text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
