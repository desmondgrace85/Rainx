import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Gift, UsersRound, CircleDollarSign, ChevronRight } from "lucide-react";
import { supabase } from "./supabaseClient";

const FONT = "'Montserrat', sans-serif";

function formatCount(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K`;
  return n.toLocaleString();
}

function goMore(sub = null) {
  const next = sub ? `#more/${encodeURIComponent(sub)}` : "#more";
  window.location.hash = next;
}

export default function MoreLandingOverride({ account }) {
  const [analytics, setAnalytics] = useState({ views: 0, followers: 0, likes: 0 });
  const [activeTab, setActiveTab] = useState("Posts");

  useEffect(() => {
    if (!account?.id) return;
    let cancelled = false;
    const since = new Date(Date.now() - 7 * 864e5).toISOString();

    const safe = (query) => query.then((r) => r, () => ({ data: [] }));

    Promise.all([
      safe(supabase.from("community_posts")
        .select("id,views,created_at")
        .eq("user_id", account.id)
        .gte("created_at", since)),
      safe(supabase.from("post_likes")
        .select("created_at")
        .eq("liker_id", account.id)
        .gte("created_at", since))
        .then((r) => (r.data || []).length ? r : safe(
          supabase.from("post_likes").select("created_at").eq("user_id", account.id).gte("created_at", since)
        )),
      safe(supabase.from("follows")
        .select("created_at")
        .eq("followed_id", account.id)
        .gte("created_at", since)),
    ]).then(([posts, likes, follows]) => {
      if (cancelled) return;
      const rows = posts.data || [];
      setAnalytics({
        views: rows.reduce((sum, row) => sum + Number(row.views || 0), 0),
        followers: (follows.data || []).length,
        likes: (likes.data || []).length,
      });
    });

    return () => { cancelled = true; };
  }, [account?.id]);

  const bars = useMemo(() => [42, 58, 36, 72, 49, 84, 61, 92, 68, 88], []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#FFFFFF",
        color: "#111418",
        fontFamily: FONT,
        padding: "0 26px 112px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ height: 78, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <button
          type="button"
          aria-label="Back"
          onClick={() => { window.location.hash = "#home"; }}
          style={{ position: "absolute", left: 4, top: 23, width: 40, height: 40, border: 0, background: "transparent", padding: 0, display: "grid", placeItems: "center", cursor: "pointer" }}
        >
          <ArrowLeft size={28} strokeWidth={2.1} />
        </button>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.7 }}>Trader’s Space</div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #E8EAED", marginBottom: 24 }}>
        {["Posts", "Space Talk"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              height: 58,
              border: 0,
              borderBottom: `3px solid ${activeTab === tab ? "#111418" : "transparent"}`,
              background: "transparent",
              color: activeTab === tab ? "#111418" : "#858A91",
              fontFamily: FONT,
              fontSize: 17,
              fontWeight: activeTab === tab ? 800 : 700,
              cursor: "pointer",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <section style={{ background: "#FFFFFF", borderRadius: 28, boxShadow: "0 2px 14px rgba(17,20,24,0.05)", padding: "26px 22px 24px", marginBottom: 22, border: "1px solid #F2F3F4" }}>
        <button
          type="button"
          onClick={() => goMore("analytics")}
          style={{ width: "100%", border: 0, background: "transparent", padding: 0, cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>Analytics</div>
            <ChevronRight size={26} strokeWidth={2.1} />
          </div>
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginTop: 24 }}>
          {[
            ["Post views", formatCount(analytics.views)],
            ["Net followers", formatCount(analytics.followers)],
            ["Likes", formatCount(analytics.likes)],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 7 }}>{label}</div>
              <div style={{ fontSize: 31, lineHeight: 1, fontWeight: 800, letterSpacing: -1.1 }}>{value}</div>
              <div style={{ marginTop: 10, fontSize: 14, color: "#329CE6", fontWeight: 700 }}>▲ 7d</div>
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => goMore("verification")}
        style={{
          width: "100%",
          padding: 0,
          border: 0,
          background: "transparent",
          borderRadius: 24,
          overflow: "hidden",
          cursor: "pointer",
          display: "block",
          marginBottom: 22,
        }}
      >
        <img
          src="/verified_banner.webp"
          alt="Get Verified"
          style={{ width: "100%", height: 116, display: "block", objectFit: "cover", objectPosition: "center" }}
        />
      </button>

      <section style={{ background: "#FFFFFF", borderRadius: 28, boxShadow: "0 2px 14px rgba(17,20,24,0.05)", padding: "26px 18px 22px", border: "1px solid #F2F3F4" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 6px 22px" }}>
          <div style={{ fontSize: 21, fontWeight: 800 }}>Monetisation</div>
          <ChevronRight size={26} strokeWidth={2.1} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button type="button" onClick={() => goMore("rewards")} style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", borderRadius: 21, overflow: "hidden" }}>
            <img src="/rewards_gold.webp" alt="Grab Rewards for your 10K+ posts views" style={{ width: "100%", aspectRatio: "700 / 827", display: "block", objectFit: "cover" }} />
          </button>
          <button type="button" onClick={() => goMore("rewards")} style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", borderRadius: 21, overflow: "hidden" }}>
            <img src="/rewards_black.webp" alt="monetize in the same orbit" style={{ width: "100%", aspectRatio: "700 / 840", display: "block", objectFit: "cover" }} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 18 }}>
          {[
            { label: "Gifts", icon: Gift },
            { label: "Referrals", icon: UsersRound },
            { label: "Space Talk\nEarnings", icon: CircleDollarSign },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => goMore("rewards")}
              style={{
                minHeight: 104,
                border: "1px solid #ECEEF0",
                borderRadius: 20,
                background: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                color: "#111418",
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "pre-line",
                cursor: "pointer",
              }}
            >
              <Icon size={28} strokeWidth={2.2} />
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goMore("rewards")}
          style={{
            width: "100%",
            marginTop: 22,
            height: 62,
            border: 0,
            borderRadius: 15,
            background: "#F1F2F3",
            color: "#111418",
            fontFamily: FONT,
            fontSize: 18,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          More ways to get paid
        </button>
      </section>
    </div>
  );
}
