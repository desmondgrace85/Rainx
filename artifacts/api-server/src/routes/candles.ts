/**
 * /api/candles — OHLCV data proxy for RainX charts.
 * Fetches from Yahoo Finance and returns newest-first [{datetime,open,high,low,close}].
 *
 * Query params:
 *   symbol   — instrument symbol, e.g. BTCUSD, EURUSD, XAUUSD
 *   interval — 1m | 5m | 15m | 30m | 1h | 4h | 1d
 *   limit    — max candles to return (default 300, max 500)
 *   before   — Unix timestamp (seconds) — return candles older than this (for history scroll)
 */
import { Router, Request, Response } from "express";

const router = Router();

// Map RainX symbols → Yahoo Finance symbols
function toYahooSymbol(raw: string): string {
  const sym = raw.toUpperCase().trim();

  // Already Yahoo format
  if (sym.includes("=X") || sym.includes("-") || sym.startsWith("^")) return sym;

  const CRYPTO_BASES = [
    "BTC","ETH","SOL","BNB","ADA","XRP","DOGE","DOT","MATIC","AVAX",
    "LINK","UNI","LTC","ATOM","FTM","NEAR","ALGO","TRX","ICP","VET",
    "SAND","MANA","AXS","CRO","SHIB",
  ];

  // Crypto pairs against USD
  if (sym.endsWith("USD") && CRYPTO_BASES.includes(sym.slice(0, -3))) {
    return `${sym.slice(0, -3)}-USD`;
  }
  if (sym.endsWith("USDT") && CRYPTO_BASES.includes(sym.slice(0, -4))) {
    return `${sym.slice(0, -4)}-USD`;
  }

  // Indices
  const INDICES: Record<string, string> = {
    SPX: "^GSPC", NDX: "^NDX", DJI: "^DJI", VIX: "^VIX",
    DAX: "^GDAXI", FTSE: "^FTSE", NKY: "^N225",
  };
  if (INDICES[sym]) return INDICES[sym];

  // Commodities
  const COMMODITIES: Record<string, string> = {
    XAUUSD: "GC=F", XAGUSD: "SI=F", WTIUSD: "CL=F",
    BRENTUSD: "BZ=F", NGAS: "NG=F",
  };
  if (COMMODITIES[sym]) return COMMODITIES[sym];

  // Forex — 6-char currency pairs
  if (sym.length === 6 && /^[A-Z]{6}$/.test(sym)) {
    return `${sym}=X`;
  }

  // Stocks — pass through
  return sym;
}

// Map interval → Yahoo Finance params
function getYFParams(interval: string, before?: number): Record<string, string> {
  const rangeMap: Record<string, string> = {
    "1m": "1d", "5m": "5d", "15m": "60d", "30m": "60d",
    "1h": "730d", "2h": "730d", "4h": "730d", "1d": "max",
  };

  if (before) {
    // Load-more history: fetch a chunk ending just before `before`
    const chunkSecs: Record<string, number> = {
      "1m": 86400, "5m": 5 * 86400, "15m": 30 * 86400, "30m": 30 * 86400,
      "1h": 365 * 86400, "2h": 365 * 86400, "4h": 365 * 86400, "1d": 10 * 365 * 86400,
    };
    const chunk = chunkSecs[interval] ?? 30 * 86400;
    const period2 = before - 60;          // just before the oldest known bar
    const period1 = period2 - chunk;
    return { interval, period1: String(period1), period2: String(period2) };
  }

  return { interval, range: rangeMap[interval] ?? "1mo" };
}

// Resample 1h candles into multi-hour candles when Yahoo doesn't support them.
function resampleToHours(bars: CandleBar[], hours: number): CandleBar[] {
  const groups = new Map<number, CandleBar[]>();
  for (const b of bars) {
    const slot = Math.floor(b.time / (hours * 3600)) * (hours * 3600);
    if (!groups.has(slot)) groups.set(slot, []);
    groups.get(slot)!.push(b);
  }
  const result: CandleBar[] = [];
  groups.forEach((group, slot) => {
    result.push({
      time:  slot,
      open:  group[0].open,
      high:  Math.max(...group.map(g => g.high)),
      low:   Math.min(...group.map(g => g.low)),
      close: group[group.length - 1].close,
    });
  });
  return result.sort((a, b) => a.time - b.time);
}

interface CandleBar { time: number; open: number; high: number; low: number; close: number; }

async function fetchFromYahoo(yahooSym: string, interval: string, before?: number): Promise<CandleBar[]> {
  const yfInterval = interval === "2h" || interval === "4h" ? "1h" : interval;
  const params = getYFParams(yfInterval, before);
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?${qs}&includePrePost=false&events=`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${yahooSym}`);

  const json = await res.json() as any;
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("No chart result from Yahoo Finance");

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const opens  = quote.open  || [];
  const highs  = quote.high  || [];
  const lows   = quote.low   || [];
  const closes = quote.close || [];

  const bars: CandleBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = opens[i], h = highs[i], l = lows[i], c = closes[i];
    if (o == null || h == null || l == null || c == null) continue;
    if (!isFinite(o) || !isFinite(h) || !isFinite(l) || !isFinite(c)) continue;
    bars.push({ time: timestamps[i], open: o, high: h, low: l, close: c });
  }

  return interval === "2h" ? resampleToHours(bars, 2)
    : interval === "4h" ? resampleToHours(bars, 4)
    : bars;
}

router.get("/", async (req: Request, res: Response) => {
  const { symbol, interval = "15m", limit = "300", before } = req.query as Record<string, string>;

  if (!symbol) {
    return res.status(400).json({ error: "symbol is required" });
  }

  const maxBars = Math.min(parseInt(limit, 10) || 300, 500);
  const beforeTs = before ? parseInt(before, 10) : undefined;
  const yahooSym = toYahooSymbol(symbol);
  const iv = (["1m","5m","15m","30m","1h","2h","4h","1d"].includes(interval) ? interval : "15m") as string;

  try {
    let bars = await fetchFromYahoo(yahooSym, iv, beforeTs);

    if (beforeTs) {
      bars = bars.filter(b => b.time < beforeTs);
    }

    // Take the newest `maxBars` bars; return newest-first so clients can `.reverse()`
    const trimmed = bars.slice(-maxBars).reverse();

    const values = trimmed.map(b => ({
      datetime: new Date(b.time * 1000).toISOString(),
      open:  b.open,
      high:  b.high,
      low:   b.low,
      close: b.close,
    }));

    return res.json({ values });
  } catch (err: any) {
    req.log?.warn({ err: err.message, symbol, yahooSym, interval }, "candles fetch failed");
    return res.status(502).json({ error: "Failed to fetch candle data", detail: err.message });
  }
});

export default router;
