import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Gift,
  UsersRound,
  CircleDollarSign,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const FONT = "'Montserrat', sans-serif";

function formatCount(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K`;
  return n.toLocaleString();
}

function go(route) {
  window.location.hash = route;
}

async function loadCreatorAnalytics(accountId) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();

  const { data: posts = [] } = await supabase
    .from("community_posts")
    .select("id,views,created_at")
    .eq("user_id", accountId)
    .gte("created_at", since);

  const postIds = posts.map((p) => p.id).filter(Boolean);

  let likes = [];

  if (postIds.length) {
    const received = await supabase
      .from("post_likes")
      .select("id,post_id,created_at")
      .in("post_id", postIds)
      .gte("created_at", since);

    if (!received.error) likes = received.data || [];
  }

  if (!likes.length && postIds.length) {
    const fallback = await supabase
      .from("post_likes")
      .select("id,post_id,created_at")
      .in("post_id", postIds);

    if (!fallback.error) likes = fallback.data || [];
  }

  const { data: follows = [] } = await supabase
    .from("follows")
    .select("id,created_at")
    .eq("followed_id", accountId)
    .gte("created_at", since);

  return {
    views: posts.reduce(
      (sum, row) => sum + Number(row.views || 0),
      0
    ),
    followers: follows.length,
    likes: likes.length,
  };
}

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #F0F1F2",
  borderRadius: 18,
  boxShadow: "0 1px 8px rgba(17,20,24,0.055)",
};

export default function MoreLandingOverride({ account }) {
  const [analytics, setAnalytics] = useState({
    views: 0,
    followers: 0,
    likes: 0,
  });

  useEffect(() => {
    let cancelled = false;

    if (!account?.id) return undefined;

    loadCreatorAnalytics(account.id)
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [account?.id]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        boxSizing: "border-box",
        background: "#FFFFFF",
        color: "#111418",
        fontFamily: FONT,
        padding: "0 clamp(14px, 4vw, 24px) 32px",
        overflowX: "hidden",
      }}
    >
      <header
        style={{
          height: 58,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => go("#home")}
          style={{
            position: "absolute",
            left: -2,
            top: 9,
            width: 40,
            height: 40,
            border: 0,
            background: "transparent",
            display: "grid",
            placeItems: "center",
            color: "#111418",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={28} strokeWidth={2.15} />
        </button>

        <div
          style={{
            fontSize: 18,
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: -0.55,
          }}
        >
          Trader’s Space
        </div>
      </header>

      <div
        style={{
          height: 48,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderBottom: "1px solid #E7E8EA",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "2px solid #111418",
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          Posts
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#858A91",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          Space Talk
        </div>
      </div>

      <section
        style={{
          ...cardStyle,
          padding: "18px 18px 17px",
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          onClick={() => go("#more/analytics")}
          style={{
            width: "100%",
            padding: 0,
            border: 0,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#111418",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: -0.45,
            }}
          >
            Analytics
          </span>
          <ChevronRight size={25} strokeWidth={2.15} />
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            columnGap: 14,
            marginTop: 24,
          }}
        >
          {[
            ["Post views", formatCount(analytics.views)],
            ["Net followers", formatCount(analytics.followers)],
            ["Likes", formatCount(analytics.likes)],
          ].map(([label, value]) => (
            <div key={label} style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.3,
                  fontWeight: 700,
                  marginBottom: 7,
                  whiteSpace: "normal",
                }}
              >
                {label}
              </div>

              <div
                style={{
                  fontSize: 28,
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: -0.9,
                }}
              >
                {value}
              </div>

              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  lineHeight: 1,
                  color: "#329CE6",
                  fontWeight: 700,
                }}
              >
                ▲ 7d
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Slim banner only. No black card/wrapper is added around the asset. */}
      <button
        type="button"
        onClick={() => go("#more/verification")}
        aria-label="Get Verified"
        style={{
          display: "block",
          width: "100%",
          padding: 0,
          margin: "0 0 14px",
          border: 0,
          outline: "none",
          borderRadius: 16,
          background: "transparent",
          overflow: "hidden",
          cursor: "pointer",
          boxShadow: "none",
        }}
      >
        <img
          src="/verified_banner.webp"
          alt="Get Verified — Earn your badge & unlock exclusive rewards"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            objectFit: "contain",
            border: 0,
            outline: "none",
          }}
        />
      </button>

      <section
        style={{
          ...cardStyle,
          padding: "18px 18px 16px",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "0 2px 15px",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: -0.45,
            }}
          >
            Monetisation
          </div>

          <ChevronRight size={25} strokeWidth={2.15} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {[
            ["rewards_gold.webp", "Grab Rewards for your 10K+ posts views", "gold"],
            ["rewards_black.webp", "monetize in the same orbit", "black"],
          ].map(([src, alt, kind]) => (
            <button
              key={src}
              type="button"
              onClick={() => go("#more/rewards")}
              style={{
                display: "block",
                width: "100%",
                aspectRatio: "700 / 827",
                padding: 0,
                border: 0,
                outline: "none",
                borderRadius: 16,
                overflow: "hidden",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <img
                src={`/${src}`}
                alt={alt}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  border: 0,
                  outline: "none",
                  transform:
                    kind === "gold" ? "scale(1.018)" : "scale(1)",
                }}
              />
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
            marginTop: 12,
          }}
        >
          {[
            ["Gifts", Gift],
            ["Referrals", UsersRound],
            ["Space Talk\nEarnings", CircleDollarSign],
          ].map(([label, Icon]) => (
            <button
              key={label}
              type="button"
              onClick={() => go("#more/rewards")}
              style={{
                minWidth: 0,
                height: 88,
                border: "1px solid #E7E9EB",
                borderRadius: 14,
                background: "#F4F5F6",
                color: "#111418",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                fontFamily: FONT,
                fontSize: 13,
                lineHeight: 1.25,
                fontWeight: 600,
                whiteSpace: "pre-line",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <Icon size={25} strokeWidth={2.05} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go("#more/rewards")}
          style={{
            width: "100%",
            height: 40,
            marginTop: 14,
            border: 0,
            borderRadius: 10,
            background: "#F1F2F3",
            color: "#111418",
            fontFamily: FONT,
            fontSize: 15,
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
