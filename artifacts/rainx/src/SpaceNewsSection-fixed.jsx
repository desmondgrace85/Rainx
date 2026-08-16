import React, { useCallback, useEffect, useState } from "react";
import { ChevronRight, Newspaper, RefreshCw } from "lucide-react";

const RSS_URL = "https://news.google.com/rss/search?q=(crypto%20OR%20bitcoin%20OR%20ethereum%20OR%20CPI%20OR%20FOMC)&hl=en-US&gl=US&ceid=US:en";
const NEWS_ALL_URL = "https://news.google.com/search?q=crypto%20bitcoin%20ethereum%20CPI%20FOMC&hl=en-US&gl=US&ceid=US:en";
const RSS_PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";
const CRYPTOCOMPARE_URL = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest";

function timeAgo(value) {
  const ts = value instanceof Date ? value.getTime() : (Number(value) > 1e12 ? Number(value) : Number(value) * 1000);
  if (!Number.isFinite(ts)) {
    const parsed = Date.parse(String(value || ""));
    if (!Number.isFinite(parsed)) return "";
    return timeAgo(new Date(parsed));
  }
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function fetchJson(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}_rx=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`News source returned ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function normaliseCryptoCompare(items) {
  return (Array.isArray(items) ? items : []).filter(i => i?.title).slice(0, 8).map(i => ({
    id: i.id || i.url || i.title,
    title: i.title,
    description: i.body || i.description || "",
    image: i.imageurl || "",
    publishedAt: i.published_on,
    url: i.url || NEWS_ALL_URL,
  }));
}

function normaliseRss(items) {
  return (Array.isArray(items) ? items : []).filter(i => i?.title).slice(0, 8).map((i, idx) => ({
    id: i.guid || i.link || `${i.title}-${idx}`,
    title: String(i.title).replace(/<[^>]*>/g, ""),
    description: String(i.description || "").replace(/<[^>]*>/g, ""),
    image: i.thumbnail || i.enclosure?.link || "",
    publishedAt: i.pubDate,
    url: i.link || NEWS_ALL_URL,
  }));
}

export default function SpaceNewsSection() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus(items.length ? "refreshing" : "loading");
    try {
      const configured = import.meta.env.VITE_SPACE_NEWS_URL;
      let next = [];

      // Prefer a configured feed, then fall back to two public feeds. This
      // prevents one unavailable provider from taking the whole news card down.
      if (configured) {
        try {
          const payload = await fetchJson(configured);
          next = normaliseCryptoCompare(payload?.Data || payload?.data || payload?.articles);
          if (!next.length) next = normaliseRss(payload?.items);
        } catch {}
      }

      if (!next.length) {
        try {
          const payload = await fetchJson(CRYPTOCOMPARE_URL);
          next = normaliseCryptoCompare(payload?.Data || payload?.data || payload?.articles);
        } catch {}
      }

      if (!next.length) {
        const payload = await fetchJson(RSS_PROXY + encodeURIComponent(RSS_URL));
        next = normaliseRss(payload?.items);
      }

      if (!next.length) throw new Error("No news returned");
      setItems(next);
      setStatus("ready");
    } catch {
      // Keep already-rendered news visible during a transient provider/cache failure.
      setStatus(items.length ? "ready" : "error");
    }
  }, [items.length]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 300000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <section style={{ margin: "18px 14px 26px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "Montserrat,sans-serif", fontWeight: 800, fontSize: 22, color: "#0F0E0B", letterSpacing: -0.4 }}>Crypto News</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <a href={NEWS_ALL_URL} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 2, color: "#D29F18", textDecoration: "none", fontFamily: "Montserrat,sans-serif", fontSize: 12, fontWeight: 800 }}>
            See all <ChevronRight size={17} />
          </a>
          <button onClick={load} aria-label="Refresh news" style={{ width: 30, height: 30, borderRadius: 10, border: "none", background: "transparent", color: "#A28F55", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <RefreshCw size={14} style={{ animation: status === "refreshing" ? "rx-news-spin .9s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      {status === "loading" && (
        <div style={{ display: "grid", gap: 10 }}>
          {[0, 1].map(i => <div key={i} style={{ height: 96, borderRadius: 18, background: "linear-gradient(90deg,#fff,#f4f1e8,#fff)", border: "1px solid #EEE9DD" }} />)}
        </div>
      )}

      {status === "error" && (
        <div style={{ background: "#fff", border: "1px solid #E9E4D8", borderRadius: 18, padding: "20px 16px", textAlign: "center" }}>
          <Newspaper size={22} color="#B9AD93" />
          <div style={{ fontFamily: "Montserrat,sans-serif", fontWeight: 700, fontSize: 13, color: "#0F0E0B", marginTop: 7 }}>News is temporarily unavailable.</div>
          <div style={{ fontFamily: "Montserrat,sans-serif", fontSize: 11, color: "#8B8476", margin: "5px 0 12px" }}>The live feed could not be reached. Try again in a moment.</div>
          <button onClick={load} style={{ border: "none", background: "#F4D35E", color: "#0F0E0B", borderRadius: 10, padding: "9px 14px", fontWeight: 800, cursor: "pointer" }}>Try again</button>
        </div>
      )}

      {status !== "loading" && items.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {items.slice(0, 5).map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", background: "#fff", border: "1px solid #EEE9DD", borderRadius: 18, padding: 10, boxShadow: "0 4px 18px rgba(15,14,11,.05)" }}>
              <div style={{ width: 82, height: 76, flexShrink: 0, borderRadius: 14, overflow: "hidden", background: "linear-gradient(135deg,#F4D35E,#F5F0E4)", display: "grid", placeItems: "center" }}>
                {item.image ? <img src={item.image} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Newspaper size={24} color="#8B6F22" />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <div style={{ fontFamily: "Montserrat,sans-serif", fontSize: 13, lineHeight: 1.28, fontWeight: 800, color: "#0F0E0B", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.title}</div>
                  <span style={{ fontFamily: "Montserrat,sans-serif", fontSize: 9.5, color: "#A29A8A", whiteSpace: "nowrap", flexShrink: 0 }}>{timeAgo(item.publishedAt)}</span>
                </div>
                <div style={{ fontFamily: "Montserrat,sans-serif", fontSize: 10.5, lineHeight: 1.35, color: "#777061", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      <style>{`@keyframes rx-news-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </section>
  );
}
