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

export default function FullChartView({ inst, session, themeMode = "light", onClose, livePrice = null }) {
  const TK = THEME[themeMode] || THEME.light;
  const isDark = themeMode === "dark";

  // Chart state
  const [activeTf, setActiveTf] = useState("15m");
  const [candles,  setCandles]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [price,    setPrice]    = useState(null);
  const [ohlc,     setOhlc]     = useState(null); // from crosshair
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [chartHeightRatio, setChartHeightRatio] = useState(0.7);
  const dragStartRef = useRef(null);
  const startRatioRef = useRef(0.7);

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
  const isUserScrolledRef  = useRef(false); // true when user scrolled into history
  const progScrollRef      = useRef(false); // flag: we triggered the scroll
  const loadingMoreRef     = useRef(false); // guard: prevent duplicate load-more fetches
  const activeTfRef        = useRef("15m"); // always holds latest timeframe for callbacks
  const loadMoreHistoryRef = useRef(null);  // ref to latest loadMoreHistory fn (avoids stale closures)

  // Keep activeTfRef in sync with activeTf state
  useEffect(() => { activeTfRef.current = activeTf; }, [activeTf]);

  // ── Fetch candles ─────────────────────────────────────────────────────────
  const fetchCandles = useCallback(async (tf) => {
    if (!inst?.symbol) return;
    setLoading(true);
    try {
      // Try 500 first; fall back to 300 if backend hasn't deployed new limit yet (returns 422)
      let res = await fetch(`${BASE_URL}/api/candles?symbol=${encodeURIComponent(inst.symbol)}&interval=${tf}&limit=500`);
      if (res.status === 422) {
        res = await fetch(`${BASE_URL}/api/candles?symbol=${encodeURIComponent(inst.symbol)}&interval=${tf}&limit=300`);
      }
      if (!res.ok) throw new Error(`candles ${res.status}`);
      const data = await res.json();
      // API returns newest-first; reverse to oldest-first
      const values = (data.values || []).slice().reverse();
      setCandles(values);
    } catch (err) {
      console.warn("[FullChartView] fetchCandles failed:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [inst?.symbol]);

  // ── Load more history when user scrolls past the left edge ───────────────
  const loadMoreHistory = useCallback(async () => {
    if (loadingMoreRef.current || !barsCache.current.length || !inst?.symbol) return;
    const oldest = barsCache.current[0];
    if (!oldest?.time) return;
    loadingMoreRef.current = true;
    try {
      const tf = activeTfRef.current;
      const res = await fetch(
        `${BASE_URL}/api/candles?symbol=${encodeURIComponent(inst.symbol)}&interval=${tf}&limit=300&before=${oldest.time}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const older = (data.values || []).slice().reverse();
      if (!older.length) return;
      const olderBars = toChartBars(older).filter(b => b.time < oldest.time);
      if (!olderBars.length) return;
      const combined = [...olderBars, ...barsCache.current];
      barsCache.current = combined;
      if (candleRef.current) {
        candleRef.current.setData(combined);
        if (volRef.current) {
          volRef.current.setData(combined.map(b => ({
            time:  b.time,
            value: Math.abs(b.high - b.low) * 1000,
            color: b.close >= b.open ? "rgba(29,111,232,0.25)" : "rgba(19,23,34,0.25)",
          })));
        }
      }
    } catch { /* ignore */ } finally {
      // Small delay before allowing another load-more, prevents rapid-fire fetches
      setTimeout(() => { loadingMoreRef.current = false; }, 1500);
    }
  }, [inst?.symbol]);

  // Keep loadMoreHistoryRef pointing at the latest version of loadMoreHistory
  useEffect(() => { loadMoreHistoryRef.current = loadMoreHistory; }, [loadMoreHistory]);

  useEffect(() => {
    // New timeframe — reset user scroll state so chart follows live again
    isUserScrolledRef.current = false;
        fetchCandles(activeTf);
    // Do NOT clear pollTimer here — managed by the live polling effect below
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
        autoScale: true,
        scaleMargins: { top: 0.12, bottom: 0.22 },
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
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale:  { axisPressedMouseMove: { time: true, price: true }, mouseWheel: true, pinch: true, vertTouchDrag: true },
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

    // Detect user manually scrolling into history; load more when near left edge
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (progScrollRef.current) return; // we caused this scroll — ignore
      isUserScrolledRef.current = true;
      // When the visible range starts fewer than 15 bars from the left edge, load more history
      if (range && typeof range.from === "number" && range.from < 15 && loadMoreHistoryRef.current) {
        loadMoreHistoryRef.current();
      }
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
      chartRef.current.timeScale().fitContent();
      // Small delay then scroll to realtime so latest candle is visible at the right edge
      setTimeout(() => {
        try { if (chartRef.current) chartRef.current.timeScale().scrollToRealTime(); } catch {}
      }, 80);
      setPrice(bars[bars.length - 1].close);
    } catch {}
  }, [candles]);

  // ── Live polling every 5s — stable deps so the interval actually fires ────
  useEffect(() => {
    if (!inst?.symbol) return;
    clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/candles?symbol=${encodeURIComponent(inst.symbol)}&interval=${activeTf}&limit=2`);
        if (!res.ok || !candleRef.current) return;
        const data = await res.json();
        // API returns newest-first; index 0 is the current (possibly forming) candle
        const latest = (data.values || [])[0];
        if (!latest || !candleRef.current || !latest.datetime) return;
        const barTime = Math.floor(new Date(latest.datetime).getTime() / 1000);
        if (!barTime || isNaN(barTime)) return;
        const bar = {
          time:  barTime,
          open:  +latest.open,
          high:  +latest.high,
          low:   +latest.low,
          close: +latest.close,
        };
        if (isNaN(bar.open) || isNaN(bar.close)) return;
        // Wait for initial data to be loaded before live-updating
        if (!barsCache.current.length) return;
        candleRef.current.update(bar);
        latestCandle.current = bar;
        setPrice(bar.close);
        // Only auto-scroll when user is NOT manually browsing history
        if (!isUserScrolledRef.current) {
          try {
            progScrollRef.current = true;
            if (chartRef.current) chartRef.current.timeScale().scrollToRealTime();
            setTimeout(() => { progScrollRef.current = false; }, 80);
          } catch { progScrollRef.current = false; }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollTimer.current);
  }, [activeTf, inst?.symbol]);

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
          // Use overlay scale so trendlines/channels don't compress the main candlestick scale
          priceScaleId: "ai-overlay",
        });
        ls.setData(data);
        lineRefs.current.push(ls);
      } catch {}
    };
    // Keep the overlay scale hidden so it doesn't show a second axis
    try {
      chartRef.current.priceScale("ai-overlay").applyOptions({ visible: false, autoScale: false, scaleMargins: { top: 0.5, bottom: 0.5 } });
    } catch {}

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
          addPL(o.price, RED, o.label || "Stop Loss", LineStyle.Solid, 2, true);
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
          if (o.from != null) {
            // Shaded zone from entry to target — green BUY, red SELL (on main price scale)
            const isBull   = !(o.bias === "sell" || o.bias === "SELL");
            const zoneTop  = Math.max(o.from, o.target);
            const zoneBot  = Math.min(o.from, o.target);
            const fillRgba = isBull ? "rgba(34,197,94,0.15)"  : "rgba(239,68,68,0.15)";
            const edgeRgba = isBull ? "rgba(34,197,94,0.50)"  : "rgba(239,68,68,0.50)";
            try {
              if (typeof chartRef.current.addBaselineSeries === "function") {
                const bs = chartRef.current.addBaselineSeries({
                  baseValue: { type: "price", price: zoneBot },
                  topLineColor: edgeRgba, topFillColor1: fillRgba, topFillColor2: fillRgba,
                  bottomLineColor: "transparent", bottomFillColor1: "transparent", bottomFillColor2: "transparent",
                  lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
                });
                bs.setData(bars.map(b => ({ time: b.time, value: zoneTop })));
                lineRefs.current.push(bs);
              } else {
                const tl = chartRef.current.addLineSeries({ color: edgeRgba, lineWidth: 1.5, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
                tl.setData(bars.map(b => ({ time: b.time, value: zoneTop })));
                lineRefs.current.push(tl);
              }
              const bl = chartRef.current.addLineSeries({ color: edgeRgba, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
              bl.setData(bars.map(b => ({ time: b.time, value: zoneBot })));
              lineRefs.current.push(bl);
            } catch {}
          } else {
            const col = (o.bias === "sell" || o.bias === "SELL") ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)";
            try {
              const ls = chartRef.current.addLineSeries({ color: col, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
              ls.setData(bars.map(b => ({ time: b.time, value: o.target })));
              lineRefs.current.push(ls);
            } catch {}
          }
          break;
        }
        default: break;
      }
    });
  }, [session?.overlays, candles, activeTf]);

  // ── Live price engine → update forming candle in real-time ────────────────
  useEffect(() => {
    if (livePrice == null || !candleRef.current || !barsCache.current.length) return;
    const last = latestCandle.current || barsCache.current[barsCache.current.length - 1];
    if (!last) return;
    const bar = {
      time:  last.time,
      open:  last.open,
      high:  Math.max(last.high, livePrice),
      low:   Math.min(last.low, livePrice),
      close: livePrice,
    };
    try {
      candleRef.current.update(bar);
      latestCandle.current = bar;
      // Update barsCache too so polling guard stays accurate
      const cache = barsCache.current;
      if (cache.length) cache[cache.length - 1] = bar;
      setPrice(livePrice);
      if (!isUserScrolledRef.current) {
        try {
          progScrollRef.current = true;
          if (chartRef.current) chartRef.current.timeScale().scrollToRealTime();
          setTimeout(() => { progScrollRef.current = false; }, 80);
        } catch { progScrollRef.current = false; }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrice]);

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
  const sessionSetup = session?.setupByTf?.["15m"] || session?.setupByTf?.["1h"] || session?.setupByTf?.["4h"] || session?.setup || null;
  const sessionState = session?.state;
  const stateColor   = sessionState === "watching" ? "#7A9E86" : sessionState === "completed" ? "#9C947F" : GOLD;

  // Analysis summary for the panel
  const aiRows = [
    { label: "Market Structure", value: session?.steps?.find(s => s.id === "structure")?.status === "done" ? (sessionSetup?.bias === "SELL" ? "Bearish" : "Bullish") : "Analyzing…", color: sessionSetup?.bias === "SELL" ? RED : BULL },
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
      <div style={{ flex: aiPanelOpen ? chartHeightRatio : 1, position: "relative", overflow: "hidden" }}>
        
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, background: TK.bg + "aa" }}>
            <div style={{ fontSize: 12, color: TK.muted, fontFamily: FONT }}>Loading chart data…</div>
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "100%", touchAction: "none" }} />
      </div>

      {/* ── Raina AI Analysis Panel ──────────────────────────────────────── */}
      {aiPanelOpen && (
        <>
          <div
            style={{
              height: 12,
              background: TK.bg,
              cursor: "row-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              zIndex: 10
            }}
            onMouseDown={(e) => {
              dragStartRef.current = e.clientY;
              startRatioRef.current = chartHeightRatio;
              document.body.style.userSelect = "none";
              
              const onMouseMove = (moveEvent) => {
                const delta = moveEvent.clientY - dragStartRef.current;
                const containerHeight = window.innerHeight; // approximate
                const ratioDelta = delta / containerHeight;
                setChartHeightRatio(Math.min(0.9, Math.max(0.3, startRatioRef.current + ratioDelta)));
              };
              
              const onMouseUp = () => {
                document.body.style.userSelect = "";
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
              };
              
              window.addEventListener("mousemove", onMouseMove);
              window.addEventListener("mouseup", onMouseUp);
            }}
            onTouchStart={(e) => {
              dragStartRef.current = e.touches[0].clientY;
              startRatioRef.current = chartHeightRatio;
              document.body.style.userSelect = "none";
              
              const onTouchMove = (moveEvent) => {
                const delta = moveEvent.touches[0].clientY - dragStartRef.current;
                const containerHeight = window.innerHeight; // approximate
                const ratioDelta = delta / containerHeight;
                setChartHeightRatio(Math.min(0.9, Math.max(0.3, startRatioRef.current + ratioDelta)));
              };
              
              const onTouchEnd = () => {
                document.body.style.userSelect = "";
                window.removeEventListener("touchmove", onTouchMove);
                window.removeEventListener("touchend", onTouchEnd);
              };
              
              window.addEventListener("touchmove", onTouchMove);
              window.addEventListener("touchend", onTouchEnd);
            }}
          >
            <div style={{ width: 40, height: 4, background: TK.border, borderRadius: 2 }} />
          </div>
          <div style={{
            flex: 1 - chartHeightRatio, background: TK.card, borderTop: `1px solid ${TK.border}`,
            padding: "12px 14px 16px", overflowY: "auto", minHeight: 0
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
      </>
      )}
    </div>
  );
}
