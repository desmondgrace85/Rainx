/**
 * LightweightChart.jsx
 * Professional candlestick chart powered by TradingView's lightweight-charts.
 * Blue bullish candles · Black bearish candles · White background · Gold AI overlays
 */
import React, { useEffect, useRef } from "react";
import { createChart, CrosshairMode, LineStyle } from "lightweight-charts";

const BULL_COLOR   = "#1D6FE8";   // RainX blue
const BEAR_COLOR   = "#131722";   // Near-black
const WICK_BEAR    = "#374151";
const GOLD         = "#D08F14";
const GOLD_ALPHA   = "rgba(208,143,20,0.15)";
const RED_LINE     = "#ef4444";
const GREEN_LINE   = "#22c55e";

/**
 * Convert raw tick candles (from ticksToCandles) to lightweight-charts format.
 * Input: { t (ms timestamp), open, high, low, close }
 */
function toChartBars(candles) {
  if (!candles?.length) return [];
  const seen = new Set();
  return candles
    .map(c => {
      const time = Math.floor((c.t || c.time || 0) / 1000);
      return { time, open: +c.open, high: +c.high, low: +c.low, close: +c.close };
    })
    .filter(b => {
      if (seen.has(b.time)) return false;
      seen.add(b.time);
      return b.time > 0 && isFinite(b.open);
    })
    .sort((a, b) => a.time - b.time);
}

/**
 * LightweightChart
 * Props:
 *  candles         — array of tick candles (from ticksToCandles)
 *  overlays        — AI overlay objects
 *  inst            — instrument { digits, symbol }
 *  containerHeight — pixel height (default 220)
 *  compact         — hide time axis / reduce labels
 *  isDark          — theme flag
 */
export default function LightweightChart({
  candles = [],
  overlays = [],
  inst = {},
  containerHeight = 220,
  compact = false,
  isDark = false,
  onLoadMore = null,
  bgColor: bgColorProp = null, // override the chart canvas background to match its surrounding card
}) {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const candleRef     = useRef(null);
  const lineRefs      = useRef([]);   // additional line series for trendlines
  const priceLineMap  = useRef([]);   // { series, priceLine }
  const prevBarsRef   = useRef([]);   // last rendered bars — for smart update() vs setData()
  const ohlcRangeRef  = useRef(null); // { min, max } of visible candle data — keeps scale pinned to OHLC
  const priceZoomRef  = useRef(1);    // 1 = fit-to-data; <1 = zoomed in; >1 = zoomed out (touch price-axis drag)
  const loadMoreRef   = useRef(onLoadMore);
  const loadingMoreRef = useRef(false);

  useEffect(() => { loadMoreRef.current = onLoadMore; }, [onLoadMore]);

  // ── Create chart once on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    // Chart canvas background was hardcoded to pure #fff/near-black, which
    // didn't match the app's actual cream-toned card background — that
    // mismatch is what showed up as a "white rectangle" behind the chart.
    const bgColor   = bgColorProp || (isDark ? "#111" : "#ffffff");
    const textColor = isDark ? "rgba(220,225,235,0.55)" : "rgba(18,18,42,0.5)";
    const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
    const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

    const chart = createChart(el, {
      attributionLogo: false,
      layout: {
        background: { color: bgColor },
        textColor,
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: gridColor, style: LineStyle.Solid },
        horzLines: { color: gridColor, style: LineStyle.Solid },
      },
      crosshair: {
        mode: compact ? CrosshairMode.Hidden : CrosshairMode.Normal,
        vertLine: { color: GOLD, labelBackgroundColor: GOLD },
        horzLine: { color: GOLD, labelBackgroundColor: GOLD },
      },
      rightPriceScale: {
        borderColor: borderCol,
        visible: true,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      leftPriceScale:  { visible: false },
      timeScale: {
        borderColor: borderCol,
        timeVisible: !compact,
        secondsVisible: false,
        visible: !compact,
        rightOffset: compact ? 0 : 5,
        barSpacing: compact ? 4 : 6,
        fixLeftEdge: false,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll:  compact ? false : { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale:   compact ? false : { axisPressedMouseMove: { time: true, price: true }, mouseWheel: true, pinch: true },
      width:  el.clientWidth  || 340,
      height: Math.max(el.clientHeight || 0, containerHeight, compact ? 60 : window.innerHeight * 0.22, compact ? 60 : 160),
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor:         BULL_COLOR,
      downColor:       BEAR_COLOR,
      borderUpColor:   BULL_COLOR,
      borderDownColor: BEAR_COLOR,
      wickUpColor:     BULL_COLOR,
      wickDownColor:   WICK_BEAR,
      // Pin auto-scale to candle OHLC range — prevents SL/TP price lines from
      // forcing the chart to zoom out and compress the candles.
      autoscaleInfoProvider: () => {
        const r = ohlcRangeRef.current;
        if (!r) return null;
        const zoom = priceZoomRef.current || 1;
        const center = (r.max + r.min) / 2;
        const halfSpan = ((r.max - r.min) / 2 || r.max * 0.005) * zoom;
        const pad = halfSpan * 0.12;
        return {
          priceRange: { minValue: center - halfSpan - pad, maxValue: center + halfSpan + pad },
          margins: { above: 0.08, below: 0.08 },
        };
      },
    });

    chartRef.current  = chart;
    candleRef.current = candleSeries;

    // Keep history loading identical on every chart surface. The consumer
    // owns the API cursor; this renderer only signals when the left edge is
    // reached.
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range || range.from >= 18 || !loadMoreRef.current || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      Promise.resolve(loadMoreRef.current()).finally(() => {
        setTimeout(() => { loadingMoreRef.current = false; }, 350);
      });
    });

    // Re-pin the price scale to whatever candles are actually on screen as
    // the user scrolls/zooms — otherwise the scale stays stuck to whatever
    // range was true when the chart first loaded.
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!prevBarsRef.current.length || compact) return;
      try {
        if (range && isFinite(range.from) && isFinite(range.to)) {
          const bars = prevBarsRef.current;
          const from = Math.max(0, Math.floor(range.from));
          const to = Math.min(bars.length - 1, Math.ceil(range.to));
          if (to > from) {
            const slice = bars.slice(from, to + 1);
            const lows = slice.map(b => b.low);
            const highs = slice.map(b => b.high);
            ohlcRangeRef.current = { min: Math.min(...lows), max: Math.max(...highs) };
          }
        }
      } catch {}
    });

    // ResizeObserver for responsive sizing
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      if (e && chartRef.current) {
        const w = e.contentRect.width || el.clientWidth || 340;
        const h = Math.max(e.contentRect.height, containerHeight, compact ? 60 : 160);
        chartRef.current.resize(w, h);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current     = null;
      candleRef.current    = null;
      lineRefs.current     = [];
      priceLineMap.current = [];
      prevBarsRef.current  = []; // reset so next mount does full setData
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, isDark, bgColorProp]);

  // ── Update candle data — smart: use update() for live ticks, setData() for full reloads
  useEffect(() => {
    if (!candleRef.current) return;
    const bars = toChartBars(candles);
    if (!bars.length) return;
    try {
      // Compute OHLC range from bars actually visible on screen, NOT the
      // whole loaded history. The old code used ALL loaded bars for the
      // non-compact chart, so a wider price range earlier in history (e.g.
      // gold dipping much lower weeks ago) stretched the y-axis far beyond
      // the current candles — making them look tiny/floating in empty space.
      let visible = compact ? bars.slice(-50) : bars.slice(-80);
      try {
        if (!compact && chartRef.current) {
          const range = chartRef.current.timeScale().getVisibleLogicalRange();
          if (range && isFinite(range.from) && isFinite(range.to)) {
            const from = Math.max(0, Math.floor(range.from));
            const to = Math.min(bars.length - 1, Math.ceil(range.to));
            if (to > from) visible = bars.slice(from, to + 1);
          }
        }
      } catch {}
      const lows    = visible.map(b => b.low);
      const highs   = visible.map(b => b.high);
      ohlcRangeRef.current = { min: Math.min(...lows), max: Math.max(...highs) };

      const prev = prevBarsRef.current;
      const isLiveUpdate =
        prev.length > 0 &&
        Math.abs(prev.length - bars.length) <= 2 &&          // similar length
        prev.length >= 2 && bars.length >= 2 &&
        prev[prev.length - 2]?.time === bars[bars.length - 2]?.time; // penultimate bar unchanged

        const previousFirst = prev[0]?.time;
        const previousLast = prev[prev.length - 1]?.time;
        const isPrepend = prev.length > 0 &&
          bars.length > prev.length &&
          bars[0]?.time < previousFirst &&
          bars[bars.length - 1]?.time === previousLast;
        const visibleRange = isPrepend && chartRef.current
          ? chartRef.current.timeScale().getVisibleLogicalRange()
          : null;

        if (isLiveUpdate) {
        // Only the last candle changed — push a live tick without full redraw
        const last = bars[bars.length - 1];
        // Keep range updated for live ticks too
        ohlcRangeRef.current = {
          min: Math.min(ohlcRangeRef.current.min, last.low),
          max: Math.max(ohlcRangeRef.current.max, last.high),
        };
        candleRef.current.update(last);
      } else {
        // New instrument or significant data change — full replace
        candleRef.current.setData(bars);
        if (chartRef.current) {
          if (isPrepend && visibleRange) {
            const added = bars.length - prev.length;
            chartRef.current.timeScale().setVisibleLogicalRange({
              from: visibleRange.from + added,
              to: visibleRange.to + added,
            });
          } else if (compact) {
            const last  = bars[bars.length - 1].time;
            const first = bars[Math.max(0, bars.length - 40)].time;
            chartRef.current.timeScale().setVisibleRange({ from: first, to: last });
          } else {
            chartRef.current.timeScale().scrollToRealTime();
          }
        }
      }
      prevBarsRef.current = bars;
    } catch {}
  }, [candles, compact]);

  // ── Draw AI overlays ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current || !chartRef.current) return;

    // 1. Remove all old price lines
    priceLineMap.current.forEach(({ series, pl }) => {
      try { series.removePriceLine(pl); } catch {}
    });
    priceLineMap.current = [];

    // 2. Remove old trendline series
    lineRefs.current.forEach(s => {
      try { chartRef.current.removeSeries(s); } catch {}
    });
    lineRefs.current = [];

    const bars = toChartBars(candles);
    if (!bars.length) return;

    const addPriceLine = (price, color, title, style = LineStyle.Dashed, width = 1, visible = true) => {
      if (!price || !isFinite(price)) return;
      try {
        const pl = candleRef.current.createPriceLine({
          price,
          color,
          lineWidth: width,
          lineStyle: style,
          axisLabelVisible: visible,
          title,
        });
        priceLineMap.current.push({ series: candleRef.current, pl });
      } catch {}
    };

    overlays.forEach(o => {
      switch (o.type) {
        case "current_price":
          addPriceLine(o.price, GOLD, "", LineStyle.Dashed, 1.5, true);
          break;

        case "resistance":
          addPriceLine(o.price, RED_LINE, o.label || "Resistance", LineStyle.Dashed, 1.5, true);
          break;

        case "support_zone": {
          addPriceLine(o.priceHigh, BULL_COLOR, "Support", LineStyle.Dotted, 1, false);
          addPriceLine(o.priceLow,  BULL_COLOR, "",         LineStyle.Dotted, 1, false);
          break;
        }

        case "liquidity":
          addPriceLine(o.priceHigh, GOLD, "Liq. High", LineStyle.LargeDashed, 1, false);
          addPriceLine(o.priceLow,  GOLD, "Liq. Low",  LineStyle.LargeDashed, 1, false);
          break;

        case "entry_zone":
          addPriceLine(o.priceHigh, GOLD, "Entry High", LineStyle.Dotted, 1.5, true);
          addPriceLine(o.priceLow,  GOLD, "Entry Low",  LineStyle.Dotted, 1.5, true);
          break;

        case "breakout":
          addPriceLine(o.priceLow,  "#8B5CF6", "Breakout Zone", LineStyle.Dashed, 1, false);
          break;

        case "tp_level":
          addPriceLine(o.price, GREEN_LINE, o.label || "TP", LineStyle.Dashed, 1, true);
          break;

        case "sl_level":
          addPriceLine(o.price, RED_LINE, o.label || "Stop Loss", LineStyle.Solid, 2, true);
          break;

        case "trendline": {
          // Trendline = diagonal line series with 2 time points
          const startBar = bars[0];
          const endBar   = bars[Math.max(0, bars.length - 6)];
          if (!startBar || !endBar) break;
          try {
            const ls = chartRef.current.addLineSeries({
              color: GOLD,
              lineWidth: 1.5,
              lineStyle: LineStyle.Dashed,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            });
            ls.setData([
              { time: startBar.time, value: o.price1 },
              { time: endBar.time,   value: o.price2 },
            ]);
            lineRefs.current.push(ls);
          } catch {}
          break;
        }

        case "channel": {
          const startBar = bars[0];
          const endBar   = bars[Math.max(0, bars.length - 6)];
          if (!startBar || !endBar || o.price1 == null) break;
          [
            [o.price1, o.price2, GOLD],
            [o.price3, o.price4, "rgba(208,143,20,0.5)"],
          ].forEach(([p1, p2, color]) => {
            if (p1 == null) return;
            try {
              const ls = chartRef.current.addLineSeries({
                color,
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
              });
              ls.setData([
                { time: startBar.time, value: p1 },
                { time: endBar.time,   value: p2 },
              ]);
              lineRefs.current.push(ls);
            } catch {}
          });
          break;
        }

        case "swing_high":
          addPriceLine(o.price, "rgba(29,111,232,0.7)", "↑ SH", LineStyle.Dotted, 1, false);
          break;

        case "swing_low":
          addPriceLine(o.price, "rgba(208,143,20,0.7)", "↓ SL", LineStyle.Dotted, 1, false);
          break;

        case "direction_arrow":
        case "projection":
          // Shaded price zone (entry → target) — green for BUY, red for SELL
          if (o.target && o.from != null && bars.length) {
            const isBull   = !(o.bias === "sell" || o.bias === "SELL");
            const zoneTop  = Math.max(o.from, o.target);
            const zoneBot  = Math.min(o.from, o.target);
            const fillRgba = isBull ? "rgba(34,197,94,0.15)"  : "rgba(239,68,68,0.15)";
            const edgeRgba = isBull ? "rgba(34,197,94,0.50)"  : "rgba(239,68,68,0.50)";
            const lastBar  = bars[bars.length - 1];
            const interval = bars.length >= 2 ? bars[bars.length - 1].time - bars[bars.length - 2].time : 60;
            const zoneData = (v) => [{ time: lastBar.time, value: v }, { time: lastBar.time + interval * 4, value: v }];
            try {
              if (typeof chartRef.current.addBaselineSeries === "function") {
                // v4+ BaselineSeries: fills between baseline price (zoneBot) and data value (zoneTop)
                const bs = chartRef.current.addBaselineSeries({
                  baseValue:         { type: "price", price: zoneBot },
                  topLineColor:       edgeRgba,
                  topFillColor1:      fillRgba,
                  topFillColor2:      fillRgba,
                  bottomLineColor:    "transparent",
                  bottomFillColor1:   "transparent",
                  bottomFillColor2:   "transparent",
                  lineWidth:          1,
                  priceLineVisible:   false,
                  lastValueVisible:   false,
                  crosshairMarkerVisible: false,
                });
                bs.setData(zoneData(zoneTop));
                lineRefs.current.push(bs);
              } else {
                // Fallback (older LW): top edge line only
                const tl = chartRef.current.addLineSeries({ color: edgeRgba, lineWidth: 1.5, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
                tl.setData(zoneData(zoneTop));
                lineRefs.current.push(tl);
              }
              // Bottom edge dashed line (always rendered)
              const bl = chartRef.current.addLineSeries({ color: edgeRgba, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
              bl.setData(zoneData(zoneBot));
              lineRefs.current.push(bl);
            } catch {}
          } else if (o.target && bars.length) {
            // projection only (no from) — soft dotted horizontal line at TP2
            const col = (o.bias === "sell" || o.bias === "SELL") ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)";
            try {
              const ls = chartRef.current.addLineSeries({ color: col, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
              ls.setData(bars.map(b => ({ time: b.time, value: o.target })));
              lineRefs.current.push(ls);
            } catch {}
          }
          break;

        default:
          break;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays, candles]);

  // ── Touch handlers: block vertical scroll on chart pane, allow on price scale strip ──
  // Uses native (non-passive) listeners so preventDefault() actually works.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || compact) return; // mini thumbnails aren't interactive
    const PRICE_SCALE_WIDTH = 65;
    let onScale = false;
    let startY = 0;
    let startZoom = 1;

    const onStart = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      const rect = el.getBoundingClientRect();
      let scaleWidth = PRICE_SCALE_WIDTH;
      try {
        const measured = chartRef.current?.priceScale("right")?.width();
        if (measured) scaleWidth = measured;
      } catch {}
      onScale = touch.clientX >= rect.right - scaleWidth;
      startY = touch.clientY;
      startZoom = priceZoomRef.current;
    };
    const onMove = (e) => {
      if (!onScale) { e.preventDefault(); return; }
      const touch = e.touches?.[0];
      if (!touch) return;
      e.preventDefault();
      const deltaY = touch.clientY - startY;
      // Drag up = zoom in (bigger candles), drag down = zoom out — matches
      // the MT5 / TradingView price-axis drag convention.
      const factor = Math.exp(deltaY / 150);
      priceZoomRef.current = Math.min(4, Math.max(0.15, startZoom * factor));
      try { chartRef.current?.applyOptions({}); } catch {}
    };
    const onEnd = () => { onScale = false; };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove",  onMove,  { passive: false });
    el.addEventListener("touchend",   onEnd,   { passive: true });
    el.addEventListener("touchcancel", onEnd,  { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  // re-attach if compact/isDark changes (chart remounts)
  }, [compact, isDark]);

  return (
    <>
      <style>{`
        .tv-lightweight-charts a[href*="tradingview"],
        .tv-lightweight-charts a[href*="lightweight-charts"],
        .lw-attribution { display:none !important; visibility:hidden !important; opacity:0 !important; pointer-events:none !important; }
      `}</style>
      <div
        ref={containerRef}
        style={{ width: "100%", height: containerHeight, minHeight: containerHeight, overflow: "hidden", position: "relative", touchAction: "none" }}
      />
    </>
  );
}
