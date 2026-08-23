import React, { useCallback, useEffect, useState } from "react";
import { ChevronRight, ExternalLink, RefreshCw, Newspaper } from "lucide-react";

const GOOGLE_NEWS_URL = "https://news.google.com/rss/search?q=(crypto%20OR%20bitcoin%20OR%20ethereum%20OR%20solana%20OR%20forex%20OR%20gold)&hl=en-US&gl=US&ceid=US:en";
const RSS_PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";
const CRYPTOCOMPARE_URL = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest";
const FALLBACK_NEWS_IMAGES = [
  "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=240&q=80",
  "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=240&q=80",
];

function timeAgo(value) {
  const raw = value instanceof Date ? value.getTime() : Number(value);
  const ts = Number.isFinite(raw) ? (raw > 1e12 ? raw : raw * 1000) : Date.parse(value || "");
  if (!Number.isFinite(ts)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();
}

function normaliseCryptoCompare(items) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item?.title)
    .slice(0, 8)
    .map((item, index) => ({
      id: item.id || item.url || item.title,
      title: stripHtml(item.title),
      description: stripHtml(item.body || item.description || ""),
      image: item.imageurl || FALLBACK_NEWS_IMAGES[index % FALLBACK_NEWS_IMAGES.length],
      publishedAt: item.published_on,
      url: item.url || "#",
      source: item.source_info?.name || item.source || "Space News",
    }));
}

function normaliseRss(items) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item?.title)
    .slice(0, 8)
    .map((item, index) => ({
      id: item.guid || item.link || `${item.title}-${index}`,
      title: stripHtml(item.title),
      description: stripHtml(item.description || ""),
      image: item.thumbnail || item.enclosure?.link || FALLBACK_NEWS_IMAGES[index % FALLBACK_NEWS_IMAGES.length],
      publishedAt: item.pubDate,
      url: item.link || "#",
      source: item.author || "Space News",
    }));
}

async function fetchJson(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}_rx=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function getLatestNews() {
  const configured = import.meta.env.VITE_SPACE_NEWS_URL;

  // Keep a configured backend if the project has one, but never let a broken
  // endpoint prevent the homepage from showing the live public feeds below.
  if (configured) {
    try {
      const payload = await fetchJson(configured);
      const configuredItems = normaliseCryptoCompare(payload?.Data || payload?.data || payload?.articles);
      const rssItems = normaliseRss(payload?.items);
      if (configuredItems.length) return configuredItems;
      if (rssItems.length) return rssItems;
    } catch {
      // Fall through to public feeds.
    }
  }

  try {
    const payload = await fetchJson(CRYPTOCOMPARE_URL);
    const items = normaliseCryptoCompare(payload?.Data || payload?.data || payload?.articles);
    if (items.length) return items;
  } catch {
    // Try the RSS feed below.
  }

  const rssPayload = await fetchJson(`${RSS_PROXY}${encodeURIComponent(GOOGLE_NEWS_URL)}`);
  const rssItems = normaliseRss(rssPayload?.items);
  if (!rssItems.length) throw new Error("No news returned");
  return rssItems;
}

export default function SpaceNewsSection() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus(items.length ? "refreshing" : "loading");
    try {
      const next = await getLatestNews();
      setItems(next);
      setStatus("ready");
    } catch {
      // Keep the last successful feed visible during temporary network failures.
      setStatus(items.length ? "ready" : "error");
    }
  }, [items.length]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 300000);
    return () => window.clearInterval(interval);
  }, [load]);

  return (
    <section style={{ margin: "18px 14px 26px" }}>
      <div style={{ background: "#FFFFFF", border: "1px solid #FFFFFF", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 18px rgba(15,14,11,.05)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 14px 10px", marginBottom: 0 }}>
        <div style={{ fontFamily: "Montserrat,sans-serif", fontWeight: 800, fontSize: 22, color: "#0F0E0B", letterSpacing: -0.4 }}>
          Space News
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={load}
            aria-label="Refresh space news"
            style={{ width: 34, height: 34, borderRadius: 11, border: "1px solid #E9E4D8", background: "#fff", color: "#8B8476", display: "grid", placeItems: "center", cursor: "pointer" }}
          >
            <RefreshCw size={14} style={{ animation: status === "refreshing" ? "rx-news-spin .9s linear infinite" : "none" }} />
          </button>
          <a
            href={GOOGLE_NEWS_URL}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 2, textDecoration: "none", color: "#C4931A", fontFamily: "Montserrat,sans-serif", fontSize: 12, fontWeight: 800 }}
          >
            See all <ChevronRight size={16} />
          </a>
        </div>
      </div>

      {status === "loading" && (
        <div style={{ display: "grid" }}>
          {[0, 1].map(i => (
            <div key={i} style={{ height: 96, margin: "0 10px", background: "linear-gradient(90deg,#fff,#f4f1e8,#fff)", borderBottom: i === 0 ? "1px solid #EEE9DD" : "none" }} />
          ))}
        </div>
      )}

      {status === "error" && (
        <div style={{ background: "transparent", padding: "20px 16px", textAlign: "center" }}>
          <Newspaper size={22} color="#B9AD93" />
          <div style={{ fontFamily: "Montserrat,sans-serif", fontWeight: 700, fontSize: 13, color: "#0F0E0B", marginTop: 7 }}>
            Space News is temporarily unavailable.
          </div>
          <div style={{ fontFamily: "Montserrat,sans-serif", fontSize: 11, color: "#8B8476", margin: "5px 0 12px" }}>
            The live feed could not be reached. Try again in a moment.
          </div>
          <button onClick={load} style={{ border: "none", background: "#F4D35E", color: "#0F0E0B", borderRadius: 10, padding: "9px 14px", fontWeight: 800, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      )}

      {status !== "loading" && items.length > 0 && (
        <div style={{ display: "grid" }}>
          {items.slice(0, 5).map((item, index) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", background: "transparent", borderBottom: index < Math.min(items.length, 5) - 1 ? "1px solid #EEE9DD" : "none", padding: "10px 14px" }}
            >
              <div style={{ width: 82, height: 76, flexShrink: 0, borderRadius: 14, overflow: "hidden", background: "linear-gradient(135deg,#F4D35E,#F5F0E4)", display: "grid", placeItems: "center" }}>
                <img
                  src={item.image || FALLBACK_NEWS_IMAGES[0]}
                  alt=""
                  loading="lazy"
                  onError={event => { event.currentTarget.src = FALLBACK_NEWS_IMAGES[0]; }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "Montserrat,sans-serif", fontSize: 9.5, fontWeight: 800, color: "#B08A18", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {item.source}
                  </span>
                  <span style={{ fontFamily: "Montserrat,sans-serif", fontSize: 9.5, color: "#A29A8A", whiteSpace: "nowrap" }}>
                    {timeAgo(item.publishedAt)}
                  </span>
                </div>
                <div style={{ fontFamily: "Montserrat,sans-serif", fontSize: 13, lineHeight: 1.28, fontWeight: 800, color: "#0F0E0B", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.title}
                </div>
                <div style={{ fontFamily: "Montserrat,sans-serif", fontSize: 10.5, lineHeight: 1.35, color: "#777061", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.description}
                </div>
              </div>
              <ExternalLink size={14} color="#B9AD93" style={{ flexShrink: 0 }} />
            </a>
          ))}
        </div>
      )}

      <style>{`@keyframes rx-news-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </section>
  );
}
