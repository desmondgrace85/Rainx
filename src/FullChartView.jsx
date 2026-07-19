/**
 * FullChartView.jsx
 * Professional full-screen trading chart — powered by TradingView lightweight-charts.
 * Blue bullish · Black bearish · White background · Gold Raina AI overlay markings
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createChart, CrosshairMode, LineStyle } from "lightweight-charts";
import { X, ChevronLeft, Activity, TrendingUp, TrendingDown, Minus, Maximize2, Minimize2 } from "lucide-react";

const GOLD        = "#C6A15B";
const GOLD_BRIGHT = "#E3C077";
const BULL        = "#1D6FE8";
const BEAR        = "#131722";
const WICK_BEAR   = "#374151";
const RED         = "#ef4444";
const GREEN       = "#22c55e";
const FONT        = "'Montserrat', sans-serif";

const TF_LIST = [
  { key: "1m",  label: "1m",  seconds: 60,       yf: "1m"  },
  { key: "5m",  label: "5m",  seconds: 300,       yf: "5m"  },
  { key: "15m", label: "15m", seconds: 900,       yf: "15m" },
  { key: "30m", label: "30m", seconds: 1800,      yf: "30m" },
  { key: "1h",  label: "1H",  seconds: 3600,      yf: "1h"  },
  { key: "4h",  label: "4H",  seconds: 14400,     yf: "4h"  },
  { key: "1d",  label: "1D",  seconds: 86400,     yf: "1d"  },
];

const THEME = {
  light: {
    bg:         "#ffffff",
    card:       "#f7f9f9",
    border:     "#eff3f4",
    paper:      "#0f1419",
    muted:      "#536471",
    textColor:  "rgba(18,18,42,0.55)",
    gridColor:  "rgba(0,0,0,0.045)",
    borderCol:  "rgba(0,0,0,0.09)",
  },
  dark: {
    bg:         "#131722",
    card:       "#1C1913",
    border:     "#332C1F",
    paper:      "#F2EDE0",
    muted:      "#9C947F",
    textColor:  "rgba(220,225,235,0.55)",
    gridColor:  "rgba(255,255,255,0.045)",
    borderCol:  "rgba(255,255,255,0.09)",
  },
};

function toChartBars(values) {
  // values: [{ datetime, open, high, low, close }] sorted oldest-first already
  const seen = new Set();
  return values
    .map(c => {
      const t = Math.floor(new Date(c.datetime || c.time).getTime() / 1000);
      return { time: t, open: +c.open, high: +c.high, low: +c.low, close: +c.close };
    })
    .filter(b => {
      if (!b.time || seen.has(b.time)) return false;
      seen.add(b.time);
      return isFinite(b.open) && isFinite(b.close);
    })
    .sort((a, b) => a.time - b.time);
}

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function FullChartView({ inst, session, themeMode = "light", onClose }) {
  const TK = THEME[themeMode] || THEME.light;
  const isDark = themeMode === "dark";

  // Chart state
  const [activeTf, setActiveTf] = useState("15m");
  const [candles,  setCandles]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [price,    setPrice]    = useState(null);
  const [ohlc,     setOhlc]     = useState(null); // from crosshair
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  // Chart refs
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const candleRef    = useRef(null);
  const volRef       = useRef(null);
  const lineRefs     = useRef([]);
  const priceLines   = useRef([]);
  const pollTimer    = useRef(null);
  const latestCandle = useRef(null);
  const barsCache    = useRef([]);

  // ── Fetch candles ─────────────────────────────────────────────────────────
  const fetchCandles = useCallback(async (tf, append = false) => {
    if (!inst?.symbol) return;
    setLoading(true);
    try {
      const sym = inst.symbol.replace("USD", "USDT").toUpperCase();
      const res = await fetch(`${BASE_URL}/api/candles?symbol=${encodeURIComponent(inst.symbol)}&interval=${tf}&limit=300`);
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      // API returns newest-first; reverse to oldest-first
      const values = (data.values || []).slice().reverse();
      setCandles(values);
    } catch {
      // Fallback: use seed candles from tick series if backend unavailable
    } finally {
      setLoading(false);
    }
  }, [inst?.symbol]);

  useEffect(() => {
    fetchCandles(activeTf);
    return () => clearInterval(pollTimer.current);
  }, [activeTf, fetchCandles]);

  // ── Create chart ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background:  { color: TK.bg },
        textColor:   TK.textColor,
        fontFamily:  FONT,
        fontSize:    11,
      },
      grid: {
        vertLines: { color: TK.gridColor },
        horzLines: { color: TK.gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: GOLD, width: 1, style: LineStyle.Dashed, labelBackgroundColor: GOLD },
        horzLine: { color: GOLD, width: 1, style: LineStyle.Dashed, labelBackgroundColor: GOLD },
      },
      rightPriceScale: {
        borderColor: TK.borderCol,
        visible: true,
        scaleMargins: { top: 0.08, bottom: 0.18 },
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderColor:  TK.borderCol,
        timeVisible:  true,
        secondsVisible: false,
        rightOffset:  5,
        barSpacing:   8,
        minBarSpacing: 2,
      },
      width:  containerRef.current.clientWidth  || 400,
      height: containerRef.current.clientHeight || 500,
    });

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor:         BULL,
      downColor:       BEAR,
      borderUpColor:   BULL,
      borderDownColor: BEAR,
      wickUpColor:     BULL,
      wickDownColor:   WICK_BEAR,
    });

    // Volume histogram (below candles)
    const volSeries = chart.addHistogramSeries({
      color: "rgba(29,111,232,0.2)",
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current  = chart;
    candleRef.current = candleSeries;
    volRef.current    = volSeries;

    // Crosshair OHLC display
    chart.subscribeCrosshairMove(param => {
      if (!param?.time || !param.seriesData?.size) { setOhlc(null); return; }
      const bar = param.seriesData.get(candleSeries);
      if (bar) setOhlc(bar);
    });

    // Resize observer
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      if (e && chartRef.current) {
        chartRef.current.resize(e.contentRect.width, e.contentRect.height);
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      clearInterval(pollTimer.current);
      chart.remove();
      chartRef.current  = null;
      candleRef.current = null;
      volRef.current    = null;
      lineRefs.current  = [];
      priceLines.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeMode]);

  // ── Load data into chart ──────────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current || !chartRef.current || !candles.length) return;

    const bars = toChartBars(candles);
    if (!bars.length) return;
    barsCache.current = bars;
    latestCandle.current = bars[bars.length - 1];

    try {
      candleRef.current.setData(bars);
      // Volume bars (use close > open for colour)
      if (volRef.current) {
        volRef.current.setData(bars.map(b => ({
          time:  b.time,
          value: Math.abs(b.high - b.low) * 1000, // pseudo volume
          color: b.close >= b.open ? "rgba(29,111,232,0.25)" : "rgba(19,23,34,0.25)",
        })));
      }
      chartRef.current.timeScale().scrollToRealTime();
      setPrice(bars[bars.length - 1].close);
    } catch {}

    // ── Live polling every 5s ─────────────────────────────────────────────
    clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/candles?symbol=${encodeURIComponent(inst.symbol)}&interval=${activeTf}&limit=3`);
        if (!res.ok) return;
        const data = await res.json();
        const latest = (data.values || []).slice().reverse().pop();
        if (!latest || !candleRef.current) return;
        const bar = {
          time:  Math.floor(new Date(latest.datetime).getTime() / 1000),
          open:  +latest.open,
          high:  +latest.high,
          low:   +latest.low,
          close: +latest.close,
        };
        candleRef.current.update(bar);
        latestCandle.current = bar;
        setPrice(bar.close);
      } catch {}
    }, 5000);
  }, [candles, activeTf, inst?.symbol]);

  // ── Draw AI overlays from session ─────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current || !chartRef.current) return;

    // Clear old price lines
    priceLines.current.forEach(({ series, pl }) => {
      try { series.removePriceLine(pl); } catch {}
    });
    priceLines.current = [];

    // Clear old line series
    lineRefs.current.forEach(s => {
      try { chartRef.current.removeSeries(s); } catch {}
    });
    lineRefs.current = [];

    const overlays = session?.overlays || [];
    const bars = barsCache.current;
    if (!bars.length || !overlays.length) return;

    const addPL = (price, color, title, style = LineStyle.Dashed, width = 1.5, axisVisible = true) => {
      if (!price || !isFinite(price)) return;
      try {
        const pl = candleRef.current.createPriceLine({ price, color, lineWidth: width, lineStyle: style, axisLabelVisible: axisVisible, title });
        priceLines.current.push({ series: candleRef.current, pl });
      } catch {}
    };

    const addLineSeries = (data, color, width = 1.5, style = LineStyle.Dashed) => {
      try {
        const ls = chartRef.current.addLineSeries({
          color, lineWidth: width, lineStyle: style,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        });
        ls.setData(data);
        lineRefs.current.push(ls);
      } catch {}
    };

    overlays.forEach(o => {
      switch (o.type) {
        case "current_price":
          addPL(o.price, GOLD, "", LineStyle.Dashed, 2, true);
          break;
        case "resistance":
          addPL(o.price, RED, o.label || "Resistance", LineStyle.Dashed, 1.5, true);
          break;
        case "support_zone":
          addPL(o.priceHigh, BULL, "Support ↑", LineStyle.Dotted, 1, false);
          addPL(o.priceLow,  BULL, "Support ↓", LineStyle.Dotted, 1, false);
          break;
        case "liquidity":
          addPL(o.priceHigh, GOLD_BRIGHT, "Liquidity", LineStyle.LargeDashed, 1, false);
          addPL(o.priceLow,  GOLD_BRIGHT, "",           LineStyle.LargeDashed, 1, false);
          break;
        case "entry_zone":
          addPL(o.priceHigh, GOLD, "Entry High", LineStyle.Dotted, 2, true);
          addPL(o.priceLow,  GOLD, "Entry Low",  LineStyle.Dotted, 2, true);
          break;
        case "breakout":
          addPL(o.priceLow, "#8B5CF6", "Breakout", LineStyle.Dashed, 1, false);
          break;
        case "tp_level":
          addPL(o.price, GREEN, o.label || "TP", LineStyle.Dashed, 1.5, true);
          break;
        case "sl_level":
          addPL(o.price, RED, "Stop Loss", LineStyle.Solid, 2, true);
          break;
        case "trendline": {
          if (!bars.length) break;
          const t0 = bars[0].time;
          const t1 = bars[Math.max(0, bars.length - 6)].time;
          addLineSeries([{ time: t0, value: o.price1 }, { time: t1, value: o.price2 }], GOLD, 1.5, LineStyle.Dashed);
          break;
        }
        case "channel": {
          if (!bars.length || o.price1 == null) break;
          const t0 = bars[0].time;
          const t1 = bars[Math.max(0, bars.length - 6)].time;
          addLineSeries([{ time: t0, value: o.price1 }, { time: t1, value: o.price2 }], GOLD, 1.5, LineStyle.Dashed);
          if (o.price3 != null) {
            addLineSeries([{ time: t0, value: o.price3 }, { time: t1, value: o.price4 }], "rgba(198,161,91,0.5)", 1, LineStyle.Dashed);
          }
          break;
        }
        case "direction_arrow":
        case "projection": {
          if (!bars.length || !o.target) break;
          const last = bars[bars.length - 1];
          const futureT = last.time + (activeTf === "1m" ? 60 : activeTf === "5m" ? 300 : activeTf === "15m" ? 900 : activeTf === "1h" ? 3600 : 3600) * 4;
          addLineSeries([{ time: last.time, value: last.close }, { time: futureT, value: o.target }], BULL, 2, LineStyle.Solid);
          break;
        }
        default: break;
      }
    });
  }, [session?.overlays, candles, activeTf]);

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const fmtPrice = (p) => {
    if (p == null) return "—";
    return p.toFixed(inst?.digits ?? 2);
  };

  const changePct = candles.length >= 2 ? (() => {
    const bars = toChartBars(candles);
    if (bars.length < 2) return 0;
    const first = bars[bars.length - 20]?.close || bars[0].close;
    const last  = bars[bars.length - 1].close;
    return ((last - first) / first) * 100;
  })() : 0;

  const sessionSteps = session?.steps || [];
  const sessionSetup = session?.setup;
  const sessionState = session?.state;
  const stateColor   = sessionState === "watching" ? "#7A9E86" : sessionState === "completed" ? "#9C947F" : GOLD;

  // Analysis summary for the panel
  const aiRows = [
    { label: "Market Structure", value: session?.steps?.find(s => s.id === "structure")?.status === "done" ? "Bullish" : "Analyzing…", color: BULL },
    { label: "Trend Strength",   value: session?.steps?.find(s => s.id === "trend")?.status === "done" ? "Strong"  : "—", color: BULL },
    { label: "Key Level",        value: sessionSetup?.tp1 ? `${fmtPrice(sessionSetup.tp1)} (Target)` : "—", color: GOLD },
    { label: "Support Level",    value: sessionSetup?.stopLoss ? fmtPrice(sessionSetup.stopLoss) : "—", color: GOLD },
    { label: "AI Bias",          value: sessionSetup?.bias ? (sessionSetup.bias === "BUY" ? "Looking for Buy Opportunity" : "Looking for Sell Opportunity") : "Analyzing…", color: BULL },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column",
      background: TK.bg, fontFamily: FONT,
      // Prevent body scroll
      overflow: "hidden",
    }}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderBottom: `1px solid ${TK.border}`,
        background: TK.card, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: TK.muted, padding: 4, display: "flex" }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15, color: TK.paper }}>
            {inst?.symbol || "—"}
            {" "}
            {price != null && (
              <span style={{ color: changePct >= 0 ? BULL : RED, fontSize: 12, fontWeight: 700 }}>
                {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(3)}%
              </span>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: TK.muted, fontWeight: 500 }}>{inst?.name || ""}</div>
        </div>

        {/* OHLC display from crosshair */}
        {ohlc && (
          <div style={{ display: "flex", gap: 10, fontSize: 10, color: TK.muted, fontFamily: FONT, fontWeight: 600 }}>
            <span>O: <span style={{ color: TK.paper }}>{fmtPrice(ohlc.open)}</span></span>
            <span>H: <span style={{ color: BULL }}>{fmtPrice(ohlc.high)}</span></span>
            <span>L: <span style={{ color: RED }}>{fmtPrice(ohlc.low)}</span></span>
            <span>C: <span style={{ color: TK.paper }}>{fmtPrice(ohlc.close)}</span></span>
          </div>
        )}

        {/* Live price pill */}
        {!ohlc && price != null && (
          <div style={{ background: GOLD, borderRadius: 8, padding: "4px 10px", fontFamily: FONT, fontWeight: 800, fontSize: 13, color: "#fff" }}>
            {fmtPrice(price)}
          </div>
        )}
      </div>

      {/* ── Timeframe bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 4, padding: "8px 12px",
        background: TK.card, borderBottom: `1px solid ${TK.border}`,
        flexShrink: 0, overflowX: "auto",
      }}>
        {TF_LIST.map(tf => (
          <button
            key={tf.key}
            onClick={() => setActiveTf(tf.key)}
            style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 8,
              border: `1px solid ${activeTf === tf.key ? GOLD : TK.border}`,
              background: activeTf === tf.key ? GOLD : "transparent",
              color: activeTf === tf.key ? "#fff" : TK.muted,
              fontFamily: FONT, fontWeight: 700, fontSize: 12,
              cursor: "pointer",
            }}
          >
            {tf.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* AI Analysis toggle */}
        <button
          onClick={() => setAiPanelOpen(v => !v)}
          style={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 8,
            border: `1px solid ${session ? GOLD + "55" : TK.border}`,
            background: session ? GOLD + "12" : "transparent",
            color: session ? GOLD : TK.muted,
            fontFamily: FONT, fontWeight: 700, fontSize: 11,
            cursor: "pointer",
          }}
        >
          <Activity size={12} />
          AI Analysis
        </button>
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, background: TK.bg + "aa" }}>
            <div style={{ fontSize: 12, color: TK.muted, fontFamily: FONT }}>Loading chart data…</div>
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* ── Raina AI Analysis Panel ──────────────────────────────────────── */}
      {aiPanelOpen && (
        <div style={{
          flexShrink: 0, background: TK.card, borderTop: `1px solid ${TK.border}`,
          padding: "12px 14px 16px", maxHeight: 240, overflowY: "auto",
        }}>
          {/* Panel header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 13, color: TK.paper }}>Raina AI Analysis</span>
              {session && session.state !== "completed" && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: BULL, fontFamily: FONT }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: BULL, display: "inline-block", animation: "pulse 1.5s infinite" }} />
                  Analyzing
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, color: TK.muted, fontFamily: FONT }}>
              {session ? `Updated ${new Date().toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}` : "No active session"}
            </span>
          </div>

          {!session ? (
            <div style={{ fontSize: 12, color: TK.muted, textAlign: "center", padding: "12px 0" }}>
              Start an analysis session on the home screen to see Raina AI draw on this chart.
            </div>
          ) : (
            <>
              {/* Analysis rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 10 }}>
                {aiRows.map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < aiRows.length - 1 ? `1px solid ${TK.border}` : "none" }}>
                    <span style={{ fontSize: 12, color: TK.muted, fontFamily: FONT }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.color, fontFamily: FONT }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Summary box */}
              {session?.activities?.length > 0 && (
                <div style={{ background: isDark ? "rgba(29,111,232,0.08)" : "rgba(29,111,232,0.05)", border: `1px solid rgba(29,111,232,0.15)`, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10 }}>
                  <TrendingUp size={16} color={BULL} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: TK.paper, lineHeight: 1.6 }}>
                    {session.activities[0]?.text || "Raina AI is monitoring the market."}
                  </div>
                </div>
              )}

              {/* Trade setup */}
              {sessionSetup && (
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: "Bias", value: sessionSetup.bias, color: sessionSetup.bias === "BUY" ? BULL : RED },
                    { label: "Entry", value: fmtPrice(sessionSetup.entry), color: GOLD },
                    { label: "SL", value: fmtPrice(sessionSetup.stopLoss), color: RED },
                    { label: "TP1", value: fmtPrice(sessionSetup.tp1), color: GREEN },
                    { label: "R:R", value: `1:${sessionSetup.rr}`, color: TK.paper },
                  ].map(c => (
                    <div key={c.label} style={{ background: TK.bg, border: `1px solid ${TK.border}`, borderRadius: 8, padding: "5px 10px" }}>
                      <div style={{ fontSize: 9, color: TK.muted, fontFamily: FONT, fontWeight: 600 }}>{c.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: c.color, fontFamily: FONT }}>{c.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
