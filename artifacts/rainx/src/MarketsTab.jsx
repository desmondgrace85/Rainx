import React, { useState } from "react";
import FullChartView from "./FullChartView";
import { T, FONT_HEAD, INSTRUMENTS, isMarketOpen, TIMEFRAMES, BiasChip } from "./shared";

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

export { MiniSparkline };

// ---------- Markets tab ----------
function MarketsTab({ seriesMap, signalsMap, activeSymbol, onSelect, themeMode }) {
  const [fullChartInst, setFullChartInst] = useState(null);
  return (
    <div style={{ padding: 16 }}>
      {fullChartInst && (
        <FullChartView
          inst={fullChartInst}
          session={null}
          themeMode={themeMode || "dark"}
          onClose={() => setFullChartInst(null)}
        />
      )}
      <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: T.goldBright, fontWeight: 800, marginBottom: 12 }}>All markets</div>
      {INSTRUMENTS.map((i) => {
        const arr = seriesMap[i.symbol] || [];
        const price = arr.length ? arr[arr.length - 1].price : 0;
        const prevPrice = arr.length > 1 ? arr[0].price : price;
        const changePct = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
        const isUp = changePct >= 0;
        const open = isMarketOpen(i.cls);
        const combo = signalsMap[i.symbol] || {};
        return (
          <div key={i.symbol} style={{ background: T.card, border: `2px solid ${i.symbol === activeSymbol ? T.gold : T.cardBorder}`, boxShadow: i.symbol === activeSymbol ? `0 0 0 3px ${T.gold}22, 0 8px 20px rgba(0,0,0,.12)` : "none", borderRadius: 12, padding: "12px 14px", marginBottom: 8, color: T.paper }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              <div style={{ flexShrink: 0 }}>
                <MiniSparkline data={arr.slice(-50)} width={72} height={30} />
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, minWidth: 80 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: T.paper }}>{price ? price.toFixed(Math.min(i.digits, 5)) : "—"}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: isUp ? T.sage : T.rust }}>
                  {isUp ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                </div>
                <div style={{ fontSize: 10, color: open ? T.sage : T.rust, fontWeight: 500, marginTop: 1 }}>{open ? "Open" : "Closed"}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFullChartInst(i); }}
                  style={{ marginTop: 5, background: "transparent", border: `1px solid ${T.gold}55`, borderRadius: 6, padding: "3px 9px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 9.5, color: T.gold, cursor: "pointer" }}
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

export default MarketsTab;
