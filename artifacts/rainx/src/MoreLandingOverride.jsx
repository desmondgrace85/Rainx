import React, { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Gift, UsersRound, CircleDollarSign } from "lucide-react";
import { supabase } from "./supabaseClient";

const FONT = "'Montserrat', sans-serif";
const ASSET = {
  verified: "/verified_banner_slim.png",
  gold: "/rewards_gold_ref.png",
  black: "/rewards_black_ref.png",
};

function formatCount(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K`;
  return n.toLocaleString();
}
function go(route) { window.location.hash = route; }

async function loadCreatorAnalytics(accountId) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: posts = [] } = await supabase.from("community_posts")
    .select("id,views,created_at").eq("user_id", accountId).gte("created_at", since);
  const postIds = posts.map((p) => p.id).filter(Boolean);
  let likes = [];
  if (postIds.length) {
    const received = await supabase.from("post_likes")
      .select("id,post_id,created_at").in("post_id", postIds).gte("created_at", since);
    if (!received.error) likes = received.data || [];
  }
  if (!likes.length && postIds.length) {
    const fallback = await supabase.from("post_likes").select("id,post_id,created_at").in("post_id", postIds);
    if (!fallback.error) likes = fallback.data || [];
  }
  const { data: follows = [] } = await supabase.from("follows")
    .select("id,created_at").eq("followed_id", accountId).gte("created_at", since);
  return {
    views: posts.reduce((sum, row) => sum + Number(row.views || 0), 0),
    followers: follows.length,
    likes: likes.length,
  };
}

const cardStyle = {
  background: "#FFFFFF", border: "1px solid #F0F1F2", borderRadius: 20,
  boxShadow: "0 1px 8px rgba(17,20,24,0.045)",
};

export default function MoreLandingOverride({ account }) {
  const [analytics, setAnalytics] = useState({ views: 0, followers: 0, likes: 0 });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const old = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehaviorY,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehaviorY,
    };
    html.style.overscrollBehaviorY = "none";
    body.style.overscrollBehaviorY = "none";
    body.style.overflow = "hidden";

    let cancelled = false;
    if (account?.id) {
      loadCreatorAnalytics(account.id).then((data) => {
        if (!cancelled) setAnalytics(data);
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
      html.style.overflow = old.htmlOverflow;
      html.style.overscrollBehaviorY = old.htmlOverscroll;
      body.style.overflow = old.bodyOverflow;
      body.style.overscrollBehaviorY = old.bodyOverscroll;
    };
  }, [account?.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#FFFFFF", color: "#111418", fontFamily: FONT, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: "100%", boxSizing: "border-box", overflowY: "auto", overflowX: "hidden",
        overscrollBehaviorY: "none", WebkitOverflowScrolling: "touch", touchAction: "pan-y", scrollbarWidth: "none",
        padding: "0 28px 28px",
      }}>
        <header style={{ height: 74, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button type="button" aria-label="Back" onClick={() => go("#home")} style={{ position: "absolute", left: -5, top: 18, width: 42, height: 42, border: 0, background: "transparent", display: "grid", placeItems: "center", color: "#111418", padding: 0 }}>
            <ArrowLeft size={29} strokeWidth={2.15} />
          </button>
          <div style={{ fontSize: 22, lineHeight: 1, fontWeight: 800, letterSpacing: -0.75 }}>Trader’s Space</div>
        </header>

        <div style={{ height: 54, display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #E7E8EA", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "3px solid #111418", fontSize: 17, fontWeight: 800 }}>Posts</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#858A91", fontSize: 17, fontWeight: 700 }}>Space Talk</div>
        </div>

        <section style={{ ...cardStyle, padding: "22px 26px 20px", marginBottom: 18 }}>
          <button type="button" onClick={() => go("#more/analytics")} style={{ width: "100%", padding: 0, border: 0, background: "transparent", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#111418", textAlign: "left" }}>
            <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5 }}>Analytics</span>
            <ChevronRight size={27} strokeWidth={2.15} />
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 20, marginTop: 24 }}>
            {[["Post views", formatCount(analytics.views)], ["Net followers", formatCount(analytics.followers)], ["Likes", formatCount(analytics.likes)]].map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, lineHeight: 1.25, fontWeight: 700, marginBottom: 7, whiteSpace: "nowrap" }}>{label}</div>
                <div style={{ fontSize: 31, lineHeight: 1, fontWeight: 800, letterSpacing: -1.1 }}>{value}</div>
                <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1, color: "#329CE6", fontWeight: 700 }}>▲ 7d</div>
              </div>
            ))}
          </div>
        </section>

        <button type="button" onClick={() => go("#more/verification")} aria-label="Get Verified" style={{ display: "block", width: "100%", padding: 0, margin: "0 0 18px", border: 0, outline: "none", background: "transparent", overflow: "visible" }}>
          <img src={ASSET.verified} alt="Get Verified — Earn your badge & unlock exclusive rewards" draggable="false" style={{ display: "block", width: "100%", height: "auto", border: 0, outline: "none" }} />
        </button>

        <section style={{ ...cardStyle, padding: "22px 28px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5 }}>Monetisation</div>
            <ChevronRight size={27} strokeWidth={2.15} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <button type="button" onClick={() => go("#more/rewards")} style={imageButtonStyle}>
              <img src={ASSET.gold} alt="Grab Rewards for your 10K+ posts views" draggable="false" style={imageStyle} />
            </button>
            <button type="button" onClick={() => go("#more/rewards")} style={imageButtonStyle}>
              <img src={ASSET.black} alt="monetize in the same orbit" draggable="false" style={imageStyle} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 14 }}>
            {[["Gifts", Gift], ["Referrals", UsersRound], ["Space Talk\nEarnings", CircleDollarSign]].map(([label, Icon]) => (
              <button key={label} type="button" onClick={() => go("#more/rewards")} style={{ minWidth: 0, border: 0, background: "transparent", color: "#111418", display: "flex", flexDirection: "column", alignItems: "center", padding: 0, fontFamily: FONT }}>
                <span style={{ width: "100%", height: 58, border: "1px solid #E4E6E8", borderRadius: 14, background: "#F5F6F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={21} strokeWidth={2.05} />
                </span>
                <span style={{ marginTop: 7, fontSize: 11.5, lineHeight: 1.2, fontWeight: 600, whiteSpace: "pre-line", textAlign: "center" }}>{label}</span>
              </button>
            ))}
          </div>

          <button type="button" onClick={() => go("#more/rewards")} style={{ width: "100%", height: 42, marginTop: 18, border: 0, borderRadius: 12, background: "#F1F2F3", color: "#111418", fontFamily: FONT, fontSize: 15, fontWeight: 800 }}>More ways to get paid</button>
        </section>
      </div>
    </div>
  );
}

const imageButtonStyle = { display: "block", width: "100%", padding: 0, border: 0, outline: "none", borderRadius: 0, overflow: "visible", background: "transparent" };
const imageStyle = { display: "block", width: "100%", height: "auto", aspectRatio: "292 / 331", objectFit: "cover", objectPosition: "center", border: 0, outline: "none" };
