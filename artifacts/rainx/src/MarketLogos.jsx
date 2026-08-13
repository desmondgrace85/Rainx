// MarketLogos.jsx — inline SVG data-URI logos for every RainX instrument.
// Used by the notification panel so signal / news notifications show a market
// "profile image" (just like community notifications show the actor's avatar),
// with a small BUY / SELL badge at the bottom-right corner.
//
// Logos are authored as compact SVG strings and encoded with encodeURIComponent
// so they work as <img src> values without shipping binary files.

const raw = (svg) => "data:image/svg+xml," + encodeURIComponent(svg);

// ─── Crypto ───────────────────────────────────────────────────────────────
const BTC = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#F7931A"/><path fill="#fff" d="M33.6 21.3c.4-2.8-1.7-4.3-4.6-5.3l.9-3.7-2.2-.5-.9 3.6-1.8-.4.9-3.6-2.2-.6-.9 3.7-1.4-.3v0-2.3-.6.6 2.4s1.9.4 1.9.5l-2 8-1.4-.3-3 .4-.3-3.7-.6.6 2.4s1.9.4 1.9.5l-2 8-1.4-.4-.9 3.7 2.2.5.9-3.7 1.8.4-.9 3.7 2.2.5.9-3.7c3.8.7 6.6.4 7.8-3 1-2.7-.1-4.3-2.1-5.3 1.5-.3 2.6-1.3 2.9-3.2zM28.4 29.6c-.7 2.7-5.3 1.2-6.8.9l1.2-4.8c1.5.4 6.3 1.1 5.6 3.9zm.7-7.4c-.6 2.5-4.5 1.2-5.8.9l1.1-4.4c1.2.3 5.3.9 4.7 3.5z"/></svg>`);
const ETH = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#627EEA"/><g fill="#fff" fill-rule="evenodd"><path opacity=".6" d="M24.4 6v12.2l10.3 4.6z"/><path d="M24.4 6L14.1 22.8l10.3-4.6z"/><path opacity=".6" d="M24.4 32.6v7.4l10.3-14.2z"/><path d="M24.4 40v-7.4L14.1 25.8z"/><path opacity=".2" d="M24.4 31l10.3-6-10.3-4.6z"/><path opacity=".6" d="M14.1 25l10.3 6V20.4z"/></g></svg>`);
const SOL = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#000"/><defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9945FF"/><stop offset="1" stop-color="#14F195"/></linearGradient></defs><path fill="url(#s)" d="M15 31.5l2.7-2.7h17.1l-2.7 2.7zM17.7 19.2L15 16.5h17.1l2.7 2.7zM12.9 25.3l2.7-2.6h17.1l-2.7 2.6z"/></svg>`);
const BNB = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#F3BA2F"/><path fill="#fff" d="M19.3 21.5L24 16.8l4.7 4.7 2.7-2.7L24 11.4l-7.4 7.4zM14 24l2.7-2.7L19.4 24l-2.7 2.7zm5.3 2.5L24 31.2l4.7-4.7 2.7 2.7L24 36.6l-7.4-7.4zM28.6 24l2.7-2.7L34 24l-2.7 2.7zM24 20.7l3.3 3.3L24 27.3 20.7 24z"/></svg>`);
const XRP = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#23292F"/><path fill="#fff" d="M32.8 14h3l-6.5 6.4c-2.5 2.5-6.6 2.5-9.1 0L13.7 14h3l4.9 4.9c1.7 1.7 4.5 1.7 6.2 0zM16.7 34h-3l6.5-6.4c2.5-2.5 6.6-2.5 9.1 0L35.8 34h-3l-4.9-4.9c-1.7-1.7-4.5-1.7-6.2 0z"/></svg>`);
const DOGE = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#C2A633"/><path fill="#fff" d="M26.5 14h-7v8.5h-3v3.5h3V34h7c5.2 0 8.5-3.8 8.5-10s-3.3-10-8.5-10zm0 16.5h-3.5v-5h5.5v-3.5h-5.5V17h3.5c3.1 0 5 2.8 5 6.8s-1.9 6.7-5 6.7z"/></svg>`);

// ─── Forex (flag-style circles) ───────────────────────────────────────────
const EUR = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#003399"/><g fill="#FFCC00"><circle cx="13" cy="13" r="1.5"/><circle cx="24" cy="9" r="1.5"/><circle cx="35" cy="13" r="1.5"/><circle cx="9" cy="24" r="1.5"/><circle cx="39" cy="24" r="1.5"/><circle cx="13" cy="35" r="1.5"/><circle cx="24" cy="39" r="1.5"/><circle cx="35" cy="35" r="1.5"/></g><path fill="none" stroke="#FFCC00" stroke-width="2.5" d="M16 24h14M16 20h12M16 28h12"/></svg>`);
const GBP = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#012169"/><path fill="#fff" d="M18 14v6.5h-4v3h4V28h-4v3h4v5h4v-5h12v-3H22v-4.5h12v-3H22V14z"/><path fill="#C8102E" d="M18.7 14v7.2H14v1.6h4.7V28H14v1.6h4.7V36h1.3v-7.4h11v-1.2h-11v-4.8h11v-1.2h-11V14z"/></svg>`);
const USD = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#B22234"/><g fill="#fff" stroke="#B22234" stroke-width="0.5"><path d="M24 10l2 6h6.5l-5.2 3.8 2 6L24 22l-5.3 3.8 2-6L15.5 16H22z"/></g><text x="24" y="38" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff" font-family="Arial">$</text></svg>`);
const JPY = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#fff"/><circle cx="24" cy="24" r="15" fill="#BC002D"/></svg>`);
const AUD = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#00008B"/><path fill="#fff" d="M24 10l1.5 4.5h4.8L26.4 17l1.4 4.5L24 18.5 20.2 21.5l1.4-4.5-3.9-2.5h4.8z"/><g fill="#fff"><circle cx="24" cy="30" r="1"/><circle cx="20" cy="32" r="0.8"/><circle cx="28" cy="32" r="0.8"/><circle cx="18" cy="35" r="0.6"/><circle cx="30" cy="35" r="0.6"/></g></svg>`);
const CAD = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#D80621"/><path fill="#fff" d="M24 16l2 5h5l-4 3 1.5 5L24 26l-4.5 3 1.5-5-4-3h5z" transform="scale(0.9) translate(2.7 2.5)"/></svg>`);
const CHF = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#D52B1E"/><path fill="#fff" d="M21 14h6v6h6v6h-6v6h-6v-6h-6v-6h6z"/></svg>`);
const NZD = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#00008B"/><g fill="#fff"><path d="M24 10l1.5 4.5h4.8L26.4 17l1.4 4.5L24 18.5 20.2 21.5l1.4-4.5-3.9-2.5h4.8z"/><circle cx="24" cy="28" r="1"/><circle cx="20" cy="31" r="0.7"/><circle cx="28" cy="31" r="0.7"/></g><text x="36" y="20" font-size="7" fill="#fff" font-family="Arial">NZ</text></svg>`);

// ─── Metals ───────────────────────────────────────────────────────────────
const XAU = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#1a1a1a"/><circle cx="24" cy="24" r="16" fill="none" stroke="#FFD700" stroke-width="3"/><path fill="#FFD700" d="M24 15l3 6 6.5.9-4.7 4.6 1.1 6.5L24 33l-5.9 3 1.1-6.5L14.5 25l6.5-.9z"/></svg>`);
const XAG = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#1a1a1a"/><circle cx="24" cy="24" r="16" fill="none" stroke="#C0C0C0" stroke-width="3"/><path fill="#C0C0C0" d="M24 15l3 6 6.5.9-4.7 4.6 1.1 6.5L24 33l-5.9 3 1.1-6.5L14.5 25l6.5-.9z"/></svg>`);

// ─── Energy ───────────────────────────────────────────────────────────────
const OIL = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#1a1a1a"/><path fill="#2D8C3C" d="M24 12c-5 5-8 9-8 14a8 8 0 0016 0c0-5-3-9-8-14z"/><path fill="#fff" opacity=".3" d="M21 20c-1.5 2-2.5 4-2.5 6a5.5 5.5 0 003 4.9c-1-1.4-1.5-3-1.5-4.9 0-2 1-4 2.5-6z"/></svg>`);

// ─── Indices ──────────────────────────────────────────────────────────────
const NAS = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#000"/><text x="24" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#00C7B2" font-family="Arial">N</text></svg>`);
const SPX = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#1a1a1a"/><text x="24" y="31" text-anchor="middle" font-size="14" font-weight="bold" fill="#F7BC2D" font-family="Arial">S&amp;P</text></svg>`);
const US30 = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#1a3a5c"/><text x="24" y="30" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff" font-family="Arial">DJ</text></svg>`);
const GER = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#1a1a1a"/><path fill="#fff" d="M12 20h24v2H12zm0 5h24v2H12z"/><path fill="#F7BC2D" d="M20 16h8v4h-8z"/></svg>`);

// ─── Default / news fallback ──────────────────────────────────────────────
const RAINX = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#0F0E0B"/><path fill="#F7BC2D" d="M24 13c-4 0-7 3-7 7 0 1 .2 2 .6 2.8L18 25c-2 1.5-2 4 0 5.5L24 35l6-4.5c2-1.5 2-4 0-5.5l.4-2.2c.4-.8.6-1.8.6-2.8 0-4-3-7-7-7z"/></svg>`);
const NEWS = raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#1C1913"/><rect x="13" y="15" width="22" height="18" rx="2" fill="none" stroke="#F7BC2D" stroke-width="2"/><path fill="#F7BC2D" d="M16 20h10v1.8H16zm0 4h16v1.8H16zm0 4h12v1.8H16z"/></svg>`);

// Map every instrument symbol to its logo.
export const MARKET_LOGOS = {
  BTCUSD: BTC, ETHUSD: ETH, SOLUSD: SOL, BNBUSD: BNB, XRPUSD: XRP, DOGEUSD: DOGE,
  EURUSD: EUR, GBPUSD: GBP, USDJPY: JPY, AUDUSD: AUD, USDCAD: CAD, USDCHF: CHF, NZDUSD: NZD,
  XAUUSD: XAU, XAGUSD: XAG,
  USOIL: OIL, UKOIL: OIL,
  NAS100: NAS, SPX500: SPX, US30: US30, GER40: GER,
};

// Friendly display name per symbol (used for "alt" and fallbacks).
export const MARKET_NAMES = {
  BTCUSD: "Bitcoin", ETHUSD: "Ethereum", SOLUSD: "Solana", BNBUSD: "BNB", XRPUSD: "XRP", DOGEUSD: "Dogecoin",
  EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY", AUDUSD: "AUD/USD", USDCAD: "USD/CAD", USDCHF: "USD/CHF", NZDUSD: "NZD/USD",
  XAUUSD: "Gold", XAGUSD: "Silver",
  USOIL: "WTI Oil", UKOIL: "Brent Oil",
  NAS100: "NASDAQ 100", SPX500: "S&P 500", US30: "Dow Jones", GER40: "DAX 40",
};

// Aliases so partial / lower-case symbol fragments still resolve.
const SYMBOL_ALIASES = {
  btc: "BTCUSD", bitcoin: "BTCUSD", eth: "ETHUSD", ethereum: "ETHUSD",
  sol: "SOLUSD", solana: "SOLUSD", bnb: "BNBUSD", xrp: "XRPUSD", ripple: "XRPUSD",
  doge: "DOGEUSD", dogecoin: "DOGEUSD",
  eur: "EURUSD", "eur/usd": "EURUSD", gbp: "GBPUSD", "gbp/usd": "GBPUSD",
  jpy: "USDJPY", "usd/jpy": "USDJPY", aud: "AUDUSD", "aud/usd": "AUDUSD",
  cad: "USDCAD", "usd/cad": "USDCAD", chf: "USDCHF", "usd/chf": "USDCHF",
  nzd: "NZDUSD", "nzd/usd": "NZDUSD",
  xau: "XAUUSD", gold: "XAUUSD", xag: "XAGUSD", silver: "XAGUSD",
  oil: "USOIL", wti: "USOIL", brent: "UKOIL",
  nas: "NAS100", nasdaq: "NAS100", "s&p": "SPX500", spx: "SPX500", "dow": "US30", dax: "GER40",
};

/**
 * Resolve a market logo for a notification entry.
 * Tries (in order):
 *   1. n.data.symbol  (set by pushNotification for in-app entries)
 *   2. n.symbol       (older shape)
 *   3. Parsing the title/body text for a known instrument name/symbol
 * Returns the data-URI string, or null when nothing matches (caller falls back
 * to a generic news / RainX icon).
 */
export function resolveMarketLogo(n) {
  const sym = n?.data?.symbol || n?.symbol || n?.data?.market;
  if (sym && MARKET_LOGOS[sym]) return { src: MARKET_LOGOS[sym], symbol: sym };
  if (sym) {
    const up = sym.toUpperCase();
    if (MARKET_LOGOS[up]) return { src: MARKET_LOGOS[up], symbol: up };
  }
  const text = `${n?.title || ""} ${n?.body || ""}`.toLowerCase();
  // Try exact symbol word match first.
  for (const s of Object.keys(MARKET_LOGOS)) {
    if (text.includes(s.toLowerCase())) return { src: MARKET_LOGOS[s], symbol: s };
  }
  // Then aliases / friendly names.
  for (const [alias, sym] of Object.entries(SYMBOL_ALIASES)) {
    if (text.includes(alias)) return { src: MARKET_LOGOS[sym], symbol: sym };
  }
  return null;
}

/**
 * Detect BUY / SELL direction from a notification entry.
 * Returns "buy", "sell", or null.
 */
export function resolveMarketDirection(n) {
  const text = `${n?.title || ""} ${n?.body || ""}`.toLowerCase();
  if (n?.data?.direction) {
    const d = String(n.data.direction).toLowerCase();
    if (d === "buy" || d === "long") return "buy";
    if (d === "sell" || d === "short") return "sell";
  }
  // Emoji + word signals used by the signal engine.
  if (text.includes("🟢") || text.includes("buy") || text.includes("long")) return "buy";
  if (text.includes("🔴") || text.includes("sell") || text.includes("short")) return "sell";
  return null;
}

/**
 * Decide whether a notification is a "market" notification (signal / trade
 * update / news) vs. a generic one.  Reuses classifyNotification logic but is
 * self-contained so it can live next to the logo resolver.
 */
export function isMarketNotification(n) {
  const type = String(n?.type || "").toLowerCase();
  if (["signal", "market", "trade", "update", "warning", "news"].includes(type)) return true;
  const text = `${n?.title || ""} ${n?.body || ""}`.toLowerCase();
  const kw = ["signal", "market", "trade", "update", "warning", "news", "stop loss", "take profit", "entry", "cpi", "nfp", "fomc", "forex", "crypto", "gold", "trading alert", "profit", "buy", "sell"];
  return kw.some((w) => text.includes(w));
}

export const FALLBACK_NEWS_LOGO = NEWS;
export const FALLBACK_RAINX_LOGO = RAINX;
