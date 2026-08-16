import React, { useState, useEffect, useCallback, useRef } from "react";
import CommunityChat from "./CommunityChat";

const BASE_URL = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
import {
  Send, Trash2, Edit3, X, BadgeCheck, Heart, Eye, MessageCircle, Repeat2, MessageSquareDashed,
  UserPlus, UserCheck, ArrowLeft, Bell, MoreHorizontal, Plus, Hash, AtSign, Flag, ChevronRight, MessageSquare, Search,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const T = {
  ink: "#0F0E0B", card: "#1C1913", cardBorder: "#332C1F",
  gold: "#F7BC2D", goldBright: "#F7BC2D",
  goldGradient: "linear-gradient(135deg, #F7BC2D 0%, #E3A925 50%, #D49818 100%)",
  goldShine: "linear-gradient(180deg, #F7BC2D 0%, #E3A925 48%, #D49818 100%)",
  sage: "#7A9E86", rust: "#B0604A",
  paper: "#F2EDE0", muted: "#9C947F",
};
const FONT_HEAD = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif";
const FONT_BODY = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif";

// Deep ash for engagement icons — bolder/standard like Facebook & X.
// Reads current theme via T.ink (mutated in-place by Object.assign(T, themeTokens)).
// Neutral medium grey on dark theme; X-style grey on light theme.
const engAsh = () => (T.ink && T.ink.toUpperCase() === "#FFFFFF") ? "#536471" : "#8E8E8E";

const fadeIn = "@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }";
const pulse = "@keyframes likePulse { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }";
const slideIn = "@keyframes slideInPanel { from { transform: translateX(100%); } to { transform: translateX(0); } }";
const slideUp = "@keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
function formatCount(n) {
  if (!n || n < 1) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k";
  return String(n);
}
function extractHashtags(text) {
  const matches = text.match(/#\w+/g) || [];
  return [...new Set(matches.map((h) => h.toLowerCase()))];
}
function extractMentions(text) {
  const matches = text.match(/@\w+/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

// ---------- Mention Autocomplete Textarea ----------
function MentionTextarea({ value, onChange, placeholder, rows, style, textareaRef, maxLength = 500 }) {
  const [suggestions, setSuggestions] = useState([]);
  const [queryStart, setQueryStart] = useState(null); // index of '@' in text
  const [queryWord, setQueryWord] = useState("");
  const innerRef = useRef(null);
  const ref = textareaRef || innerRef;

  const handleChange = async (e) => {
    const val = e.target.value.slice(0, maxLength);
    onChange(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const q = match[1];
      setQueryWord(q);
      setQueryStart(cursor - q.length - 1);
      const { data } = await supabase
        .from("public_profiles")
        .select("id, display_name, avatar_url")
        .ilike("display_name", `${q}%`)
        .order("display_name")
        .limit(6);
      setSuggestions(data || []);
    } else {
      setSuggestions([]);
      setQueryStart(null);
    }
  };

  const insertSuggestion = (displayName) => {
    const before = value.slice(0, queryStart);
    const after = value.slice(queryStart + 1 + queryWord.length);
    const newVal = (before + "@" + displayName + " " + after).slice(0, maxLength);
    onChange(newVal);
    setSuggestions([]);
    setQueryStart(null);
    setTimeout(() => {
      if (ref.current) {
        const pos = queryStart + displayName.length + 2;
        ref.current.setSelectionRange(pos, pos);
        ref.current.focus();
      }
    }, 0);
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder={placeholder}
        rows={rows}
        style={style}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0,
          background: "#1C1913", border: "1px solid #332C1F", borderRadius: 10,
          zIndex: 999, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        }}>
          {suggestions.map((s) => (
            <div
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); insertSuggestion(s.display_name); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                cursor: "pointer", transition: "background 0.12s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#2a231a"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "#F7BC2D",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#0F0E0B", flexShrink: 0,
                overflow: "hidden",
              }}>
                {s.avatar_url
                  ? <img src={s.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (s.display_name?.[0] || "?").toUpperCase()}
              </div>
              <span style={{ color: "#F7BC2D", fontWeight: 700, fontSize: 13, fontFamily: "'Montserrat', sans-serif" }}>
                @{s.display_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
async function goToMention(handle, onOpenProfile) {
  const { data } = await supabase.from("public_profiles").select("id").ilike("display_name", handle).maybeSingle();
  if (data) onOpenProfile(data.id);
}
function renderTextWithTags(text, onOpenProfile) {
  const parts = text.split(/(\s+)/);
  return parts.map((part, i) => {
    if (/^#\w+/.test(part)) return <span key={i} style={{ color: T.gold, fontWeight: 600 }}>{part}</span>;
    if (/^@\w+/.test(part)) {
      const handle = part.match(/^@(\w+)/)[1];
      const isRaina = handle.toLowerCase() === "rainaai";
      return (
        <span key={i}
          style={{
            color: isRaina ? T.goldBright : T.gold,
            fontWeight: 800,
            fontSize: "1.05em",
            cursor: "pointer",
            letterSpacing: 0.2,
          }}
          onClick={(e) => { e.stopPropagation(); goToMention(handle, onOpenProfile); }}>
          {part}
        </span>
      );
    }
    return part;
  });
}
async function notify(userId, actorId, type, postId) {
  const recipientId = typeof userId === "string" ? userId.trim() : "";
  const senderId = typeof actorId === "string" ? actorId.trim() : "";
  if (!recipientId || !senderId) {
    console.error("[CommunityTab] notification skipped: invalid user ID", { userId, actorId, type, postId });
    return false;
  }
  if (recipientId === senderId) return false; // don't notify yourself
  let notificationId = null;
  try {
    const { data } = await supabase
      .from("community_notifications")
      .insert({ user_id: recipientId, actor_id: senderId, type, post_id: postId || null })
      .select("id")
      .single();
    notificationId = data?.id || null;
  } catch (error) {
    console.error("[CommunityTab] notification record failed", { recipientId, senderId, type, postId, error });
  }
  // Also send a push notification
  const PUSH_TITLES = {
    like: "New Like", comment: "New Comment", comment_reply: "New Comment", reply: "New Reply",
    comment_like: "New Like", follow: "New Follower", repost: "New Repost", mention: "New Mention",
  };
  const PUSH_BODIES = {
    like: "Someone liked your post", comment: "Someone commented on your post",
    comment_reply: "Someone replied to your comment", reply: "Someone replied to your comment",
    comment_like: "Someone liked your comment",
    follow: "Someone started following you", repost: "Someone reposted your post",
    mention: "Someone mentioned you",
  };
  const title = PUSH_TITLES[type];
  const body  = PUSH_BODIES[type];
  if (!title) {
    console.error("[CommunityTab] notification skipped: unsupported type", { type, recipientId, senderId, postId });
    return false;
  }
  try {
    const pushResponse = await fetch(`${BASE_URL}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: recipientId,
        title,
        body,
        data: {
          kind: "community",
          category: "community",
          notificationId: notificationId || `${type}:${postId || "none"}:${senderId}`,
          targetKind: "post",
          postId: postId || undefined,
          actorId: senderId,
          tag: "rainx-community",
          group: "rainx-community",
          url: `/?rainxTarget=post&postId=${encodeURIComponent(postId || "")}`,
        },
      }),
    });
    if (!pushResponse.ok) {
      const detail = await pushResponse.text().catch(() => "");
      throw new Error(`Push request failed (${pushResponse.status})${detail ? `: ${detail}` : ""}`);
    }
    return true;
  } catch (error) {
    console.error("[CommunityTab] community push failed", {
      recipientId,
      senderId,
      type,
      postId,
      error,
    });
    return false;
  }
}
async function fetchProfilesMap(ids) {
  if (!ids.length) return {};
  // Use service-key API endpoint so full_name/username/display_name are not blocked by RLS
  try {
    const r = await fetch(`${BASE_URL}/api/public-profiles?ids=${ids.join(",")}`);
    if (r.ok) {
      const rows = await r.json();
      const map = {};
      (rows || []).forEach((p) => { map[p.id] = p; });
      return map;
    }
  } catch (_) {}
  // Fallback: public_profiles view only
  const { data: pub } = await supabase.from("public_profiles").select("*").in("id", ids);
  const map = {};
  (pub || []).forEach((p) => { map[p.id] = { ...p }; });
  return map;
}

function GoldBadge({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }} title="Admin">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" fill="#dcab00" />
    </svg>
  );
}
function BlueBadge({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }} title="Blue Verified">
      <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0" />
    </svg>
  );
}
function GoldenBadge({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }} title="Golden Verified">
      <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#D49818" />
    </svg>
  );
}
function OfficialBadge({ size = 17 }) {
  // RainX's official-account seal — scalloped border with the RainX mark, used only for
  // is_official accounts (RainX, Raina AI, and future official accounts set from the admin panel)
  return (
    <svg width={size} height={size} viewBox="0 0 1254 1254" style={{ flexShrink: 0 }} title="Official RainX Account">
      <defs>
        <linearGradient id="officialGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd66b" />
          <stop offset="50%" stopColor="#e8a733" />
          <stop offset="100%" stopColor="#b9791e" />
        </linearGradient>
      </defs>
      <path d="M 626.0,38.0 L 595.0,50.0 L 521.0,111.0 L 430.0,92.0 L 397.0,95.0 L 372.0,118.0 L 327.0,205.0 L 236.0,225.0 L 210.0,240.0 L 196.0,269.0 L 189.0,368.0 L 109.0,425.0 L 92.0,452.0 L 93.0,482.0 L 124.0,572.0 L 73.0,655.0 L 69.0,687.0 L 86.0,718.0 L 145.0,776.0 L 149.0,802.0 L 136.0,872.0 L 145.0,907.0 L 163.0,923.0 L 254.0,962.0 L 281.0,1050.0 L 300.0,1076.0 L 321.0,1085.0 L 423.0,1082.0 L 491.0,1158.0 L 514.0,1169.0 L 545.0,1166.0 L 626.0,1127.0 L 711.0,1165.0 L 745.0,1169.0 L 767.0,1158.0 L 836.0,1082.0 L 937.0,1085.0 L 960.0,1075.0 L 977.0,1051.0 L 1006.0,960.0 L 1111.0,910.0 L 1122.0,885.0 L 1111.0,783.0 L 1178.0,711.0 L 1190.0,672.0 L 1135.0,574.0 L 1137.0,548.0 L 1165.0,483.0 L 1166.0,450.0 L 1146.0,422.0 L 1068.0,366.0 L 1063.0,275.0 L 1051.0,243.0 L 1023.0,225.0 L 930.0,204.0 L 887.0,119.0 L 861.0,95.0 L 829.0,92.0 L 742.0,112.0 L 719.0,102.0 L 659.0,47.0 Z" fill="#000000" />
      <path d="M 338.0,338.0 L 329.0,358.0 L 328.0,424.0 L 329.0,487.0 L 338.0,506.0 L 365.0,521.0 L 506.0,523.0 L 531.0,541.0 L 542.0,567.0 L 542.0,665.0 L 523.0,697.0 L 498.0,708.0 L 363.0,708.0 L 335.0,727.0 L 329.0,867.0 L 340.0,889.0 L 377.0,902.0 L 510.0,902.0 L 535.0,894.0 L 551.0,868.0 L 553.0,745.0 L 572.0,717.0 L 591.0,708.0 L 667.0,708.0 L 697.0,728.0 L 706.0,748.0 L 706.0,864.0 L 726.0,896.0 L 901.0,900.0 L 920.0,888.0 L 932.0,863.0 L 932.0,745.0 L 923.0,724.0 L 896.0,708.0 L 753.0,707.0 L 726.0,689.0 L 715.0,666.0 L 715.0,563.0 L 738.0,529.0 L 760.0,521.0 L 894.0,521.0 L 926.0,500.0 L 932.0,357.0 L 920.0,335.0 L 893.0,323.0 L 745.0,323.0 L 724.0,330.0 L 706.0,360.0 L 704.0,491.0 L 687.0,514.0 L 664.0,525.0 L 595.0,525.0 L 562.0,503.0 L 553.0,474.0 L 553.0,355.0 L 534.0,329.0 L 371.0,323.0 Z" fill="url(#officialGoldGrad)" />
    </svg>
  );
}
function AnalyticsBarIcon({ size = 14, color }) {
  const c = color || "rgba(160,160,160,0.85)";
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="8" width="2.5" height="5" rx="0.5" fill={c} />
      <rect x="5.2" y="5" width="2.5" height="8" rx="0.5" fill={c} />
      <rect x="9.4" y="2" width="2.5" height="11" rx="0.5" fill={c} />
    </svg>
  );
}

function Badge({ isAdmin, badge, isPro }) {
  if (badge === "official") return <OfficialBadge />;
  if (isAdmin) return <GoldBadge />;
  if (badge === "golden") return <GoldenBadge />;
  if (badge === "blue")   return <BlueBadge />;
  if (isPro) return <BlueBadge />;   // weekly / monthly fallback
  return null;
}
function Avatar({ name, size = 34, avatarUrl }) {
  if (avatarUrl) return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  const letter = (name || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: T.goldGradient, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_HEAD, fontWeight: 800, color: T.ink, fontSize: size * 0.4, flexShrink: 0 }}>
      {letter}
    </div>
  );
}

// ---------- Image compression ----------
async function compressToWebP(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1280;
      let { width: w, height: h } = img;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(src);
      canvas.toBlob((blob) => resolve(blob || file), "image/webp", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(src); resolve(file); };
    img.src = src;
  });
}

// ---------- Shared post-like toggle (used by CommunityTab and ProfileFeed) ----------
async function togglePostLike(postId, authorId, accountId, likeData, setLikeData) {
  const cur = likeData[postId] || { count: 0, likedByMe: false };
  if (cur.likedByMe) {
    const newCount = Math.max(0, cur.count - 1);
    setLikeData((d) => ({ ...d, [postId]: { count: newCount, likedByMe: false } }));
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", accountId);
    if (error) { setLikeData((d) => ({ ...d, [postId]: cur })); return; }
  } else {
    const newCount = cur.count + 1;
    setLikeData((d) => ({ ...d, [postId]: { count: newCount, likedByMe: true } }));
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: accountId });
    if (error) {
      if (error.code === "23505") return; // duplicate — already liked
      setLikeData((d) => ({ ...d, [postId]: cur }));
      return;
    }
    notify(authorId, accountId, "like", postId);
  }
}

// ---------- Shared comment-like toggle (used by CommentsSection) ----------
async function toggleCommentLike(commentId, authorId, postId, accountId, likeData, setLikeData) {
  const cur = likeData[commentId] || { count: 0, likedByMe: false };
  if (cur.likedByMe) {
    await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", accountId);
    setLikeData((d) => ({ ...d, [commentId]: { count: Math.max(0, cur.count - 1), likedByMe: false } }));
  } else {
    await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: accountId });
    setLikeData((d) => ({ ...d, [commentId]: { count: cur.count + 1, likedByMe: true } }));
    notify(authorId, accountId, "comment_like", postId);
  }
}

// ---------- Shared post-repost toggle (used by CommunityTab and ProfileFeed) ----------
async function togglePostRepost(postId, authorId, accountId, repostData, setRepostData) {
  const cur = repostData[postId] || { count: 0, repostedByMe: false };
  if (cur.repostedByMe) {
    const { error } = await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", accountId);
    if (error) { if (process.env.NODE_ENV !== "production") console.error("Unrepost failed:", error.message); return; }
    setRepostData((d) => ({ ...d, [postId]: { count: Math.max(0, cur.count - 1), repostedByMe: false } }));
  } else {
    const { error } = await supabase.from("post_reposts").insert({ post_id: postId, user_id: accountId });
    if (error) { if (process.env.NODE_ENV !== "production") console.error("Repost failed:", error.message); return; }
    setRepostData((d) => ({ ...d, [postId]: { count: cur.count + 1, repostedByMe: true } }));
    notify(authorId, accountId, "repost", postId);
  }
}

// ---------- Composer — inline card (no onClose) or full-screen modal (with onClose) ----------
// Replaces the former ComposeModal and compact Composer. All features: hashtag, mention,
// photo (camera + gallery), poll, location.
function LocationPicker({ onClose, onSelect, currentLabel }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [detecting, setDetecting] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setDetecting(false); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const d = await r.json();
        const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || "Current location";
        const cc = d.address?.country_code?.toUpperCase();
        setCurrentSuggestion({ label: cc ? `${city}, ${d.address?.country || cc}` : city, isCurrent: true });
      } catch {}
      setDetecting(false);
    }, () => setDetecting(false), { timeout: 8000 });
  }, []);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10`);
        const d = await r.json();
        setResults((d || []).map(item => ({
          label: item.display_name.split(",").slice(0, 2).join(",").trim(),
        })));
      } catch { setResults([]); }
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div style={{ position: "fixed", inset: 0, background: T.card, zIndex: 500, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 10px" }}>
        {currentLabel
          ? <button onClick={() => { onSelect(null); onClose(); }} style={{ background: "none", border: "none", color: T.rust, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Remove</button>
          : <span />}
        <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15, color: T.paper }}>Tag location</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.gold, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Done</button>
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: "9px 14px" }}>
          <Search size={16} color={T.muted} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search locations"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.paper, fontFamily: FONT_BODY, fontSize: 14 }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {!query.trim() && (
          <>
            {detecting && <div style={{ padding: "14px 0", fontSize: 13, color: T.muted }}>Detecting your location…</div>}
            {currentSuggestion && (
              <button onClick={() => { onSelect(currentSuggestion); onClose(); }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${T.cardBorder}`, padding: "14px 0", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={T.gold}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <div>
                  <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper }}>{currentSuggestion.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>Current location</div>
                </div>
              </button>
            )}
          </>
        )}
        {query.trim() && (
          <>
            {searching && <div style={{ padding: "14px 0", fontSize: 13, color: T.muted }}>Searching…</div>}
            {!searching && results.length === 0 && <div style={{ padding: "14px 0", fontSize: 13, color: T.muted }}>No locations found</div>}
            {results.map((r, i) => (
              <button key={i} onClick={() => { onSelect(r); onClose(); }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${T.cardBorder}`, padding: "14px 0", cursor: "pointer", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, color: T.paper }}>
                {r.label}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Composer({ account, onPosted, onClose, compact, themeTokens }) {
  if (themeTokens) Object.assign(T, themeTokens);
  const asModal = !!onClose;

  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [images, setImages] = useState([]); // { preview, file }
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [location, setLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const taRef = useRef(null);
  const photoRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (asModal) setTimeout(() => taRef.current?.focus(), 120);
  }, [asModal]);

  const handleFiles = (files) => {
    const arr = Array.from(files).slice(0, 4 - images.length);
    setImages((p) => [...p, ...arr.map((f) => ({ preview: URL.createObjectURL(f), file: f }))]);
  };

  const removeImage = (i) => setImages((p) => p.filter((_, idx) => idx !== i));

  const insertAt = (symbol) => {
    const newVal = text + (text.endsWith(" ") || text === "" ? "" : " ") + symbol;
    setText(newVal.slice(0, 500));
    taRef.current?.focus();
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const d = await r.json();
        const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || "Location";
        const cc = d.address?.country_code?.toUpperCase() || "";
        setLocation({ label: cc ? `${city}, ${cc}` : city });
      } catch { setLocation({ label: "Current location" }); }
      setLocLoading(false);
    }, () => setLocLoading(false), { timeout: 8000 });
  };

  const submit = async () => {
    if ((!text.trim() && images.length === 0) || posting) return;
    setPosting(true);
    const uploadedUrls = [];
    for (let i = 0; i < images.length; i++) {
      try {
        const blob = await compressToWebP(images[i].file);
        const path = `posts/${account.id}/${Date.now()}_${i}.webp`;
        const { error } = await supabase.storage.from("post-images").upload(path, blob, { contentType: "image/webp", upsert: true });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
          uploadedUrls.push(publicUrl);
        }
      } catch {}
    }
    let pollId = null;
    const validOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (showPoll && validOpts.length >= 2) {
      const { data: poll } = await supabase.from("polls").insert({}).select("id").single();
      if (poll) {
        pollId = poll.id;
        await supabase.from("poll_options").insert(validOpts.map((txt, position) => ({ poll_id: pollId, text: txt, position })));
      }
    }
    const trimmed = text.trim();
    const insertData = { user_id: account.id, text: trimmed };
    if (uploadedUrls.length) insertData.images = uploadedUrls;
    if (pollId) insertData.poll_id = pollId;
    if (location) insertData.location = location.label;
    const { data: post } = await supabase.from("community_posts").insert(insertData).select("id").single();
    const mentions = extractMentions(trimmed);
    if (mentions.length && post) {
      const { data: mentioned } = await supabase.from("public_profiles").select("id, display_name").in("display_name", mentions);
      (mentioned || []).forEach((m) => notify(m.id, account.id, "mention", post.id));
    }
    if (post && mentions.includes("rainaai")) {
      fetch(`${BASE_URL}/api/community-ai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: post.id, post_text: trimmed, author_name: account.email, user_id: account.id }) }).catch(() => {});
      setTimeout(() => onPosted(), 4000);
    }
    setText("");
    setImages([]);
    setShowPoll(false);
    setPollOptions(["", ""]);
    setLocation(null);
    setPosting(false);
    onPosted();
    if (onClose) onClose();
  };

  const canPost = (text.trim().length > 0 || images.length > 0) && !posting;

  // ── Poll builder (shared between both modes) ──
  const pollBuilder = showPoll && (
    <div style={{ marginTop: 14, border: `1px solid ${T.cardBorder}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.paper }}>Poll</span>
        <button onClick={() => setShowPoll(false)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      {pollOptions.map((opt, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", borderBottom: i < pollOptions.length - 1 ? `1px solid ${T.cardBorder}` : "none" }}>
          <input value={opt} onChange={(e) => { const o = [...pollOptions]; o[i] = e.target.value.slice(0, 60); setPollOptions(o); }} placeholder={`Option ${i + 1}`} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.paper, fontSize: 14, padding: "13px 14px", fontFamily: FONT_BODY }} />
          {pollOptions.length > 2 && <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: "0 14px", fontSize: 18 }}>×</button>}
        </div>
      ))}
      {pollOptions.length < 4 && (
        <button onClick={() => setPollOptions([...pollOptions, ""])} style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", color: T.gold, fontSize: 13, fontWeight: 600, textAlign: "left" }}>+ Add option</button>
      )}
    </div>
  );

  // ── Location chip (shared between both modes) ──
  const locationChip = location && (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(198,161,91,0.12)", border: `1px solid ${T.gold}44`, borderRadius: 20, padding: "4px 11px", marginTop: 8, cursor: "pointer" }} onClick={() => setLocation(null)}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill={T.gold}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      <span style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>{location.label}</span>
      <span style={{ fontSize: 13, color: T.muted, marginLeft: 2 }}>×</span>
    </div>
  );

  if (asModal) {
    return (
      <>
        <style>{`${slideUp}`}</style>
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", height: "92dvh", background: T.ink, borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column", animation: "slideUpSheet 0.34s cubic-bezier(0.32,0.72,0,1)" }} onClick={(e) => e.stopPropagation()}>
            {/* drag handle */}
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 10 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: T.cardBorder }} />
            </div>
            {/* header */}
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 12px", borderBottom: `1px solid ${T.cardBorder}` }}>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: T.paper }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <button onClick={submit} disabled={!canPost} style={{ background: T.goldGradient, color: T.ink, border: "none", borderRadius: 20, padding: "9px 24px", fontWeight: 800, fontSize: 14, cursor: canPost ? "pointer" : "default", opacity: canPost ? 1 : 0.4, transition: "opacity 0.15s", fontFamily: FONT_HEAD }}>
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
            {/* body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Avatar name={account.email} size={42} />
                <div style={{ flex: 1 }}>
                  <MentionTextarea
                    textareaRef={taRef}
                    value={text}
                    onChange={setText}
                    placeholder="What's happening?"
                    rows={7}
                    maxLength={500}
                    style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: T.paper, fontFamily: FONT_BODY, fontSize: 18, fontWeight: 500, resize: "none", lineHeight: 1.6, padding: 0 }}
                  />
                  {locationChip}
                  {images.length > 0 && (
                    <div style={{ marginTop: 12, display: "grid", gap: 3, borderRadius: 14, overflow: "hidden", gridTemplateColumns: images.length === 1 ? "1fr" : "1fr 1fr" }}>
                      {images.map((img, i) => (
                        <div key={i} style={{ position: "relative", gridColumn: images.length === 3 && i === 0 ? "1 / span 2" : "auto" }}>
                          <img src={img.preview} alt="" style={{ width: "100%", height: images.length === 1 ? 220 : 140, objectFit: "cover", display: "block" }} />
                          <button onClick={() => removeImage(i)} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.72)", border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {pollBuilder}
                </div>
              </div>
            </div>
            {/* bottom toolbar */}
            <div style={{ flexShrink: 0, borderTop: `1px solid ${T.cardBorder}`, padding: "12px 20px 28px", display: "flex", alignItems: "center", gap: 4 }}>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
              <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
              <button onClick={() => insertAt("#")} title="Hashtag" style={{ background: "none", border: "none", cursor: "pointer", padding: 10, color: T.paper }}>
                <Hash size={22} />
              </button>
              <button onClick={() => insertAt("@")} title="Mention" style={{ background: "none", border: "none", cursor: "pointer", padding: 10, color: T.paper }}>
                <AtSign size={22} />
              </button>
              <button onClick={() => cameraRef.current?.click()} disabled={images.length >= 4} title="Camera" style={{ background: "none", border: "none", cursor: images.length >= 4 ? "default" : "pointer", padding: 10, opacity: images.length >= 4 ? 0.3 : 1, color: T.paper }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4zm7-11.2h-2.28l-1.44-1.6H8.72L7.28 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/></svg>
              </button>
              <button onClick={() => photoRef.current?.click()} disabled={images.length >= 4} title="Photo" style={{ background: "none", border: "none", cursor: images.length >= 4 ? "default" : "pointer", padding: 10, opacity: images.length >= 4 ? 0.3 : 1, color: T.paper }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
              </button>
              <button onClick={() => { setShowPoll((v) => !v); if (showPoll) setPollOptions(["", ""]); }} title="Poll" style={{ background: "none", border: "none", cursor: "pointer", padding: 10, color: showPoll ? T.gold : T.paper }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h4v18H3V3zm7 6h4v12h-4V9zm7 4h4v8h-4v-8z"/></svg>
              </button>
              <button onClick={() => setShowLocationPicker(true)} title="Location" style={{ background: "none", border: "none", cursor: "pointer", padding: 10, color: location ? T.gold : T.paper, opacity: 1 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.muted }}>{text.length}/500</span>
            </div>
          </div>
        </div>
        {showLocationPicker && (
          <LocationPicker
            currentLabel={location?.label}
            onClose={() => setShowLocationPicker(false)}
            onSelect={(loc) => setLocation(loc)}
          />
        )}
      </>
    );
  }

  // ── Inline card mode ──
  return (
    <>
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 14, marginBottom: compact ? 0 : 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar name={account.email} />
        <div style={{ flex: 1 }}>
          {!compact && <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13, color: T.paper, marginBottom: 8 }}>What's on your mind today?</div>}
          <MentionTextarea
            textareaRef={taRef}
            value={text}
            onChange={setText}
            placeholder="Share a market thought…"
            rows={compact ? 4 : 3}
            maxLength={500}
            style={{ width: "100%", background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 10, color: T.paper, padding: 10, fontFamily: FONT_BODY, fontSize: 13, resize: "none" }}
          />
          {locationChip}
          {images.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                  <img src={img.preview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, display: "block" }} />
                  <button onClick={() => removeImage(i)} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: T.rust, border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
          {pollBuilder}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => insertAt("#")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 7, padding: "5px 8px", color: T.muted, fontSize: 10.5, cursor: "pointer" }}><Hash size={11} /> Hashtag</button>
              <button onClick={() => insertAt("@")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 7, padding: "5px 8px", color: T.muted, fontSize: 10.5, cursor: "pointer" }}><AtSign size={11} /> Mention</button>
              {images.length < 4 && (
                <>
                  <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
                  <button onClick={() => photoRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 7, padding: "5px 8px", color: T.muted, fontSize: 10.5, cursor: "pointer" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Photo
                  </button>
                </>
              )}
              <button onClick={() => { setShowPoll((v) => !v); if (showPoll) setPollOptions(["", ""]); }} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${showPoll ? T.gold : T.cardBorder}`, borderRadius: 7, padding: "5px 8px", color: showPoll ? T.gold : T.muted, fontSize: 10.5, cursor: "pointer" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h4v18H3V3zm7 6h4v12h-4V9zm7 4h4v8h-4v-8z"/></svg> Poll
              </button>
              <button onClick={() => setShowLocationPicker(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${location ? T.gold : T.cardBorder}`, borderRadius: 7, padding: "5px 8px", color: location ? T.gold : T.muted, fontSize: 10.5, cursor: "pointer", opacity: 1 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> Location
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: T.muted }}>{text.length}/500</span>
              <button onClick={submit} disabled={posting || (!text.trim() && images.length === 0)} style={{ background: T.goldGradient, color: T.ink, border: "none", borderRadius: 8, padding: "7px 16px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: (!text.trim() && images.length === 0) ? 0.5 : 1, transition: "opacity 0.15s" }}>
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    {showLocationPicker && (
      <LocationPicker
        currentLabel={location?.label}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(loc) => setLocation(loc)}
      />
    )}
    </>
  );
}

// ---------- Comments (single level) ----------
function CommentsSection({ postId, postAuthorId, account, profilesMap, onProfilesNeeded, onOpenProfile, onCommentsChange }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState("");
  const [likeData, setLikeData] = useState({});
  const [replyTo, setReplyTo] = useState(null); // comment id being replied to (uses the main bottom box)
  const mainInputRef = useRef(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    const rows = data || [];
    setComments(rows);
    if (typeof onCommentsChange === "function") onCommentsChange(rows.length);
    onProfilesNeeded([...new Set(rows.map((r) => r.user_id))]);
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const { data: likes } = await supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", ids);
      const ld = {};
      ids.forEach((id) => { ld[id] = { count: 0, likedByMe: false }; });
      (likes || []).forEach((l) => { ld[l.comment_id].count += 1; if (l.user_id === account.id) ld[l.comment_id].likedByMe = true; });
      setLikeData(ld);
    }
  }, [postId, account.id, onProfilesNeeded, onCommentsChange]);

  useEffect(() => { load(); }, [load]);

  const submitComment = async () => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    const { data: c } = await supabase.from("post_comments").insert({ post_id: postId, user_id: account.id, text: trimmed }).select("id").single();
    notify(postAuthorId, account.id, "reply", postId);
    const mentions = extractMentions(trimmed);
    if (mentions.length) {
      const { data: mentioned } = await supabase.from("public_profiles").select("id, display_name").in("display_name", mentions);
      (mentioned || []).forEach((m) => notify(m.id, account.id, "mention", postId));
    }
    // Trigger Raina AI reply when @rainaai is mentioned in a comment
    if (mentions.includes("rainaai")) {
      // Fetch the original post text for context
      supabase.from("community_posts").select("text").eq("id", postId).single().then(({ data: postRow }) => {
        fetch(`${BASE_URL}/api/community-ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: postId,
            post_text: postRow?.text || "",
            comment_text: trimmed,
            author_name: account.email,
            user_id: account.id,
          }),
        }).catch(() => {});
        setTimeout(() => load(), 5000);
      });
    }
    setText("");
    load();
  };

  // Unified submit: if replying to a comment, send a threaded reply; otherwise a top-level comment.
  const handleSubmit = () => {
    if (replyTo) submitReply();
    else submitComment();
  };

  // Begin a reply to a specific comment — reuses the main bottom box.
  const startReply = (commentId) => {
    setReplyTo(commentId);
    setTimeout(() => { try { mainInputRef.current?.focus(); } catch (_) {} }, 0);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setText("");
  };

  const submitReply = async () => {
    if (!replyTo || !text.trim()) return;
    const trimmed = text.trim();
    // Try inserting with parent_comment_id for proper threading.
    // If the column doesn't exist yet, fall back to a top-level comment
    // prefixed with an @mention of the parent comment's author.
    const parentComment = (comments || []).find((c) => c.id === replyTo);
    const parentProfile = parentComment ? profilesMap[parentComment.user_id] : null;
    const parentHandle = parentProfile?.display_name || parentProfile?.username || parentProfile?.full_name || "";
    let inserted = false;
    try {
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, user_id: account.id, text: trimmed, parent_comment_id: replyTo });
      if (!error) inserted = true;
    } catch (_) {}
    if (!inserted) {
      // Fallback: column may not exist — store as top-level comment with @mention prefix
      const prefixed = parentHandle ? `@${parentHandle} ${trimmed}` : trimmed;
      await supabase.from("post_comments").insert({ post_id: postId, user_id: account.id, text: prefixed });
    }
    notify(postAuthorId, account.id, "comment_reply", postId);
    if (parentComment && parentComment.user_id !== account.id) {
      notify(parentComment.user_id, account.id, "comment_reply", postId);
    }
    const mentions = extractMentions(trimmed);
    if (mentions.length) {
      const { data: mentioned } = await supabase.from("public_profiles").select("id, display_name").in("display_name", mentions);
      (mentioned || []).forEach((m) => notify(m.id, account.id, "mention", postId));
    }
    setText("");
    setReplyTo(null);
    load();
  };

  if (comments === null) return <div style={{ fontSize: 11, color: T.muted, padding: "8px 0" }}>Loading comments…</div>;

  // Separate top-level comments from replies (grouped by parent).
  // Falls back gracefully when parent_comment_id is absent (all comments are top-level).
  const topLevel = (comments || []).filter((c) => !c.parent_comment_id);
  const repliesByParent = {};
  (comments || []).forEach((c) => {
    if (c.parent_comment_id) {
      (repliesByParent[c.parent_comment_id] = repliesByParent[c.parent_comment_id] || []).push(c);
    }
  });

  const renderCommentBlock = (c, isReply = false) => {
    const p = profilesMap[c.user_id];
    const ld = likeData[c.id] || { count: 0, likedByMe: false };
    const childReplies = repliesByParent[c.id] || [];
    return (
      <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 10, paddingLeft: 10, borderLeft: `2px solid ${T.cardBorder}` }}>
        <button onClick={() => onOpenProfile(c.user_id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
          <Avatar name={p?.display_name} size={isReply ? 22 : 24} avatarUrl={p?.avatar_url} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button onClick={() => onOpenProfile(c.user_id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.paper }}>{p?.full_name || p?.display_name || p?.username || <span style={{ color: T.muted }}>…</span>}</span>
            </button>
            <Badge isAdmin={p?.is_admin} badge={p?.badge} />
            <span style={{ fontSize: 11, color: T.muted }}>· {timeAgo(c.created_at)}</span>
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 500, color: T.paper, marginTop: 2, lineHeight: 1.5, fontFamily: "'Montserrat', sans-serif", letterSpacing: 0.1 }}>{renderTextWithTags(c.text, onOpenProfile)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 6 }}>
            <button onClick={() => toggleCommentLike(c.id, c.user_id, postId, account.id, likeData, setLikeData)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: ld.likedByMe ? T.rust : engAsh() }}>
              <Heart size={16} strokeWidth={2} fill={ld.likedByMe ? T.rust : "none"} style={ld.likedByMe ? { animation: "likePulse 0.3s ease" } : {}} /> <span style={{ fontSize: 11.5, fontWeight: 600 }}>{ld.count}</span>
            </button>
            <button onClick={() => startReply(c.id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: engAsh() }}>
              <MessageCircle size={16} strokeWidth={2} /> <span style={{ fontSize: 11.5, fontWeight: 600 }}>Reply</span>
            </button>
          </div>
          {/* Nested replies */}
          {childReplies.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {childReplies.map((r) => renderCommentBlock(r, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const replyTarget = replyTo ? (comments || []).find((c) => c.id === replyTo) : null;
  const replyTargetProfile = replyTarget ? profilesMap[replyTarget.user_id] : null;
  const replyTargetName = replyTargetProfile?.full_name || replyTargetProfile?.display_name || replyTargetProfile?.username || "comment";

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
      {topLevel.map((c) => renderCommentBlock(c, false))}
      <div style={{ position: "sticky", bottom: 0, background: T.card, padding: "10px 0", marginTop: 8, borderTop: `1px solid ${T.cardBorder}` }}>
        {replyTo && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px 8px" }}>
            <span style={{ fontSize: 12.5, color: T.muted }}>
              Replying to <span style={{ color: T.gold, fontWeight: 700 }}>{replyTargetName}</span>
            </span>
            <button onClick={cancelReply} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Cancel</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <MentionTextarea
              textareaRef={mainInputRef}
              value={text}
              onChange={setText}
              placeholder={replyTo ? `Reply to ${replyTargetName}…` : "Write a comment…"}
              rows={1}
              maxLength={300}
              style={{ width: "100%", background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.paper, padding: "8px 10px", fontFamily: FONT_BODY, fontSize: 13, resize: "none" }}
            />
          </div>
          <button onClick={handleSubmit} disabled={!text.trim()} style={{ background: T.goldGradient, color: T.ink, border: "none", borderRadius: 8, padding: "8px 14px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11.5, cursor: "pointer", flexShrink: 0, opacity: text.trim() ? 1 : 0.5 }}>{replyTo ? "Reply" : "Post"}</button>
        </div>
      </div>
    </div>
  );
}
// ---------- Post three-dot bottom sheet ----------
function PostMenuSheet({ isOwn, username, onClose, onEdit, onDelete, onReport, onNotInterested, onUnfollow, onMute, onBlock }) {
  const ownItems = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label: "Edit post", action: onEdit, danger: false },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>, label: "Delete post", action: onDelete, danger: true },
  ];
  const otherItems = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>, label: "Not interested in post", action: onNotInterested, danger: false },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>, label: `Unfollow @${username}`, action: onUnfollow, danger: false },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5h2M12 5v14m-7-7h2a5 5 0 0 0 5-5"/><path d="M5 19l14-14"/></svg>, label: `Mute @${username}`, action: onMute, danger: false },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>, label: `Block @${username}`, action: onBlock, danger: false },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.5 10.677A2 2 0 0 0 10 12c0 1.1.9 2 2 2 .469 0 .9-.164 1.236-.434"/><path d="M13.875 13.818C13.322 14.54 12.71 15 12 15c-2.761 0-5-2.686-5-6 0-.395.034-.78.1-1.154M6.434 6.386C4.938 7.78 4 9.78 4 12c0 5 3.582 9 8 9 1.99 0 3.814-.75 5.228-1.99"/><path d="M9.168 4.215C10.034 4.077 10.988 4 12 4c4.418 0 8 4.03 8 9 0 .734-.073 1.448-.212 2.134"/></svg>, label: `Report post`, action: onReport, danger: true },
  ];
  const items = isOwn ? ownItems : otherItems;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500 }} onClick={onClose}>
      <style>{"@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}"}</style>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", paddingBottom: 32, maxHeight: "80vh", overflowY: "auto", animation: "sheetUp 0.28s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ width: 36, height: 4, background: T.cardBorder, borderRadius: 2, margin: "12px auto 16px" }} />
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <div style={{ height: 1, background: T.cardBorder, margin: "0 16px" }} />}
            <button onClick={() => { onClose(); item.action && item.action(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", background: "none", border: "none", cursor: "pointer", color: item.danger ? T.rust : T.paper }}>
              <span style={{ color: item.danger ? T.rust : T.muted, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 500, textAlign: "left" }}>{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---------- Poll widget (shown inside PostCard) ----------
function PollWidget({ pollId, account }) {
  const [options, setOptions] = useState([]);
  const [votes, setVotes] = useState({});
  const [myVote, setMyVote] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: opts } = await supabase.from("poll_options").select("*").eq("poll_id", pollId).order("position");
      setOptions(opts || []);
      const { data: voteRows } = await supabase.from("poll_votes").select("option_id, user_id").eq("poll_id", pollId);
      const counts = {};
      (opts || []).forEach((o) => { counts[o.id] = 0; });
      let myV = null;
      (voteRows || []).forEach((v) => {
        counts[v.option_id] = (counts[v.option_id] || 0) + 1;
        if (v.user_id === account.id) myV = v.option_id;
      });
      setVotes(counts);
      setMyVote(myV);
      setTotal((voteRows || []).length);
    })();
  }, [pollId, account.id]);

  const castVote = async (optId) => {
    if (myVote) return;
    const { error } = await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: optId, user_id: account.id });
    if (!error) {
      setMyVote(optId);
      setVotes((v) => ({ ...v, [optId]: (v[optId] || 0) + 1 }));
      setTotal((n) => n + 1);
    }
  };

  if (!options.length) return null;
  const maxVotes = Math.max(...Object.values(votes), 1);

  return (
    <div style={{ marginTop: 12, border: `1px solid ${T.cardBorder}`, borderRadius: 14, overflow: "hidden" }}>
      {options.map((opt, i) => {
        const count = votes[opt.id] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const isChosen = myVote === opt.id;
        const isWinner = myVote && count === maxVotes;
        return (
          <button key={opt.id} onClick={() => castVote(opt.id)} disabled={!!myVote} style={{ position: "relative", width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "none", border: "none", borderBottom: i < options.length - 1 ? `1px solid ${T.cardBorder}` : "none", cursor: myVote ? "default" : "pointer", overflow: "hidden", textAlign: "left" }}>
            {myVote && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: isChosen ? "rgba(198,161,91,0.22)" : "rgba(242,237,224,0.07)", transition: "width 0.5s ease", borderRadius: i === 0 ? "13px 0 0 0" : i === options.length - 1 ? "0 0 0 13px" : 0 }} />}
            <span style={{ flex: 1, fontSize: 14, color: T.paper, fontWeight: isChosen ? 700 : 400, position: "relative" }}>{opt.text}</span>
            {myVote && <span style={{ fontSize: 12, color: isChosen ? T.gold : T.muted, fontWeight: 600, position: "relative", minWidth: 30, textAlign: "right" }}>{pct}%</span>}
          </button>
        );
      })}
      <div style={{ padding: "7px 14px", fontSize: 11.5, color: T.muted }}>{total} vote{total !== 1 ? "s" : ""}</div>
    </div>
  );
}

// ---------- Post card ----------
function GiftIconButton({ profile, account }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ display:"flex", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:0 }} title="Send a gift">
        {/* Black & white gift box SVG */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.paper} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      </button>
      {open && <GiftModal profile={profile} senderAccount={account} onClose={() => setOpen(false)} />}
    </>
  );
}

function PostCard({ post, profile, account, profilesMap, onProfilesNeeded, likeData, onToggleLike, repostData, onToggleRepost, onOpenProfile, onDelete, onEdit, onReport, onActivityOpen, onDmUser, forceOpen, onOpened }) {
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [commentCount, setCommentCount] = useState(Number(post.comments_count) || 0);
  useEffect(() => { setCommentCount(Number(post.comments_count) || 0); }, [post.comments_count]);
  const isOwn = post.user_id === account.id;
  const ld = likeData[post.id] || { count: 0, likedByMe: false };

  // Auto-open the post detail when a notification targets this post.
  useEffect(() => {
    if (forceOpen && !showComments) {
      setShowComments(true);
      if (typeof onOpened === "function") onOpened();
    }
  }, [forceOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const rd = repostData[post.id] || { count: 0, repostedByMe: false };
  const ash = engAsh();

  const saveEdit = async () => {
    if (!editText.trim()) return;
    const { error } = await supabase.from("community_posts").update({ text: editText.trim() }).eq("id", post.id);
    setEditing(false);
    if (!error) onEdit(); // refreshes from the server - the real source of truth
  };

  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.cardBorder}`, animation: "fadeInUp 0.25s ease", display: "flex", gap: 10, alignItems: "flex-start" }}>
      {/* Avatar column */}
      <button onClick={() => onOpenProfile(post.user_id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
        <Avatar name={profile?.display_name} avatarUrl={profile?.avatar_url} size={40} />
      </button>
      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button onClick={() => onOpenProfile(post.user_id)} style={{ display: "flex", alignItems: "flex-start", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.paper }}>{profile?.full_name || profile?.display_name || null}</span>
              <Badge isAdmin={profile?.is_admin} badge={profile?.badge} isPro={profile?.isPro} />
              <span style={{ fontSize: 11, color: T.muted }}>{timeAgo(post.created_at)}</span>
            </div>
            {(profile?.username || profile?.display_name) && (
              <span style={{ fontSize: 11, color: T.muted }}>@{profile?.username || profile?.display_name}</span>
            )}
          </div>
        </button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><MoreHorizontal size={16} /></button>
          {menuOpen && (
            <PostMenuSheet
              isOwn={isOwn}
              username={profile?.display_name || "…"}
              onClose={() => setMenuOpen(false)}
              onEdit={() => { setEditing(true); setMenuOpen(false); }}
              onDelete={() => { onDelete(post.id); setMenuOpen(false); }}
              onReport={() => { onReport(post.id); setMenuOpen(false); }}
              onNotInterested={() => {
                supabase.from("post_not_interested").insert({ user_id: account.id, post_id: post.id }).then(() => {});
                onDelete(post.id); // remove from this view immediately, same as delete does visually
                setMenuOpen(false);
              }}
              onUnfollow={() => {
                supabase.from("follows").delete().eq("follower_id", account.id).eq("followed_id", post.user_id).then(() => {});
                setMenuOpen(false);
              }}
              onMute={() => {
                supabase.from("user_mutes").insert({ muter_id: account.id, muted_id: post.user_id }).then(() => {});
                onDelete(post.id);
                setMenuOpen(false);
              }}
              onBlock={() => {
                supabase.from("user_blocks").insert({ blocker_id: account.id, blocked_id: post.user_id }).then(() => {});
                supabase.from("follows").delete().eq("follower_id", account.id).eq("followed_id", post.user_id).then(() => {});
                onDelete(post.id);
                setMenuOpen(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Location badge */}
      {post.location && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, marginBottom: 2 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill={T.gold}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span style={{ fontSize: 11, color: T.gold, fontWeight: 600 }}>{post.location}</span>
        </div>
      )}

      {editing ? (
        <div style={{ marginTop: 8 }}>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value.slice(0, 500))} rows={3} style={{ width: "100%", background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.paper, padding: 8, fontFamily: FONT_BODY, fontSize: 13 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={saveEdit} style={{ background: T.goldGradient, color: T.ink, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
            <button onClick={() => setEditing(false)} style={{ background: "none", border: `1px solid ${T.cardBorder}`, color: T.muted, borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 15.5, fontWeight: 500, color: T.paper, marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap", fontFamily: "'Montserrat', sans-serif", letterSpacing: 0.1 }}>{renderTextWithTags(post.text, onOpenProfile)}</div>
      )}

      {post.images && post.images.length > 0 && (
        <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden", display: "grid", gap: 2,
          gridTemplateColumns: post.images.length === 1 ? "1fr" : "1fr 1fr",
          gridTemplateRows: post.images.length === 3 ? "auto auto" : "auto"
        }}>
          {post.images.map((img, i) => (
            <img key={i} src={img} alt="Post attachment" style={{
              width: "100%", height: post.images.length === 1 ? "auto" : 180, maxHeight: 340, objectFit: "cover",
              gridColumn: post.images.length === 3 && i === 0 ? "1 / span 2" : "auto",
              display: "block",
            }} />
          ))}
        </div>
      )}

      {/* Poll */}
      {post.poll_id && <PollWidget pollId={post.poll_id} account={account} />}

      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 10 }}>
        <button onClick={() => onToggleLike(post.id, post.user_id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: ld.likedByMe ? T.rust : ash }}>
          <Heart size={16} strokeWidth={2} fill={ld.likedByMe ? T.rust : "none"} style={ld.likedByMe ? { animation: "likePulse 0.3s ease" } : {}} /> <span style={{ fontSize: 11.5, fontWeight: 600 }}>{formatCount(ld.count)}</span>
        </button>
        <button onClick={() => setShowComments(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: ash }}>
          <MessageCircle size={16} strokeWidth={2} /> <span style={{ fontSize: 11.5, fontWeight: 600 }}>{formatCount(commentCount)}</span>
        </button>
        <button onClick={() => onToggleRepost(post.id, post.user_id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: rd.repostedByMe ? T.sage : ash }}>
          <Repeat2 size={16} strokeWidth={2} /> <span style={{ fontSize: 11.5, fontWeight: 600 }}>{formatCount(rd.count)}</span>
        </button>
        <button onClick={() => isOwn && onActivityOpen && onActivityOpen(post)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: isOwn ? "pointer" : "default", color: isOwn ? T.gold : ash }}>
          <AnalyticsBarIcon size={16} color={isOwn ? T.gold : ash} /> <span style={{ fontSize: 11.5, fontWeight: 600 }}>{formatCount(post.views || 0)}</span>
        </button>
        {profile?.isPro && post.user_id !== account.id && (
          <GiftIconButton profile={profile} account={account} />
        )}
      </div>

      {showComments && (
        <div style={{ position: "fixed", inset: 0, background: T.ink, zIndex: 500, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderBottom: `1px solid ${T.cardBorder}`, flexShrink: 0 }}>
            <button onClick={() => setShowComments(false)} style={{ background: "none", border: "none", color: T.paper, cursor: "pointer", display: "flex" }}><ArrowLeft size={20} /></button>
            <span style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: T.paper }}>Post</span>
          </div>
          {/* Scrollable body: post + comments */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.cardBorder}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <button onClick={() => onOpenProfile(post.user_id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                <Avatar name={profile?.display_name} avatarUrl={profile?.avatar_url} size={44} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.paper }}>{profile?.full_name || profile?.display_name}</span>
                  <Badge isAdmin={profile?.is_admin} badge={profile?.badge} isPro={profile?.isPro} />
                </div>
                {(profile?.username || profile?.display_name) && <span style={{ fontSize: 12, color: T.muted }}>@{profile?.username || profile?.display_name}</span>}
                <div style={{ fontSize: 15.5, fontWeight: 500, color: T.paper, marginTop: 10, lineHeight: 1.5, whiteSpace: "pre-wrap", fontFamily: "'Montserrat', sans-serif", letterSpacing: 0.1 }}>{renderTextWithTags(post.text, onOpenProfile)}</div>
                {post.images?.length > 0 && (
                  <div style={{ marginTop: 10, borderRadius: 14, overflow: "hidden" }}>
                    <img src={post.images[0]} alt="" style={{ width: "100%", display: "block" }} />
                  </div>
                )}
                <div style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>{timeAgo(post.created_at)}{post.location ? ` · ${post.location}` : ""}</div>
              </div>
            </div>
            <div style={{ padding: "0 16px" }}>
              <CommentsSection postId={post.id} postAuthorId={post.user_id} account={account} profilesMap={profilesMap} onProfilesNeeded={onProfilesNeeded} onOpenProfile={onOpenProfile} onCommentsChange={setCommentCount} />
            </div>
          </div>
        </div>
      )}

      </div>{/* end content column */}
    </div>
  );
}

// ---------- Suggested accounts ----------
function SuggestedAccounts({ account, onOpenProfile }) {
  const [suggestions, setSuggestions] = useState(null);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("rainx-suggested-dismissed") === "1"; } catch { return false; }
  });

  useEffect(() => {
    (async () => {
      const { data: myFollows } = await supabase.from("follows").select("followed_id").eq("follower_id", account.id);
      const followedSet = new Set((myFollows || []).map((f) => f.followed_id));
      setFollowingIds(followedSet);
      const { data: pub } = await supabase.from("public_profiles").select("*").neq("id", account.id).order("created_at", { ascending: false }).limit(20);
      const filtered = (pub || []).filter((p) => !followedSet.has(p.id)).slice(0, 5);
      if (filtered.length) {
        const { data: priv } = await supabase.from("profiles").select("id, full_name, username").in("id", filtered.map(p => p.id));
        const privMap = {};
        (priv || []).forEach(p => { privMap[p.id] = p; });
        setSuggestions(filtered.map(p => ({ ...p, full_name: privMap[p.id]?.full_name, username: privMap[p.id]?.username })));
      } else {
        setSuggestions([]);
      }
    })();
  }, [account.id]);

  const toggleFollow = async (id) => {
    if (followingIds.has(id)) {
      await supabase.from("follows").delete().eq("follower_id", account.id).eq("followed_id", id);
    } else {
      await supabase.from("follows").insert({ follower_id: account.id, followed_id: id });
      notify(id, account.id, "follow", null);
    }
    setSuggestions((list) => list.filter((p) => p.id !== id));
  };

  if (dismissed || !suggestions || suggestions.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: 0.5 }}>SUGGESTED ACCOUNTS</div>
        <button onClick={() => { setDismissed(true); try { localStorage.setItem("rainx-suggested-dismissed", "1"); } catch {} }} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, padding: "2px 6px" }}>
          <X size={12} /> Close
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {suggestions.map((p) => (
          <div key={p.id} style={{ flexShrink: 0, width: 140, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 12 }}>
            <button onClick={() => onOpenProfile(p.id)} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", width: "100%" }}>
              <Avatar name={p.full_name || p.display_name} size={28} avatarUrl={p.avatar_url} />
              <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.paper, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.full_name || p.display_name}</span>
                  <Badge isAdmin={p.is_admin} badge={p.badge} />
                </div>
                {(p.username || p.display_name) && (
                  <span style={{ fontSize: 10, color: T.muted }}>@{p.username || p.display_name}</span>
                )}
              </div>
            </button>
            <button onClick={() => toggleFollow(p.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, width: "100%", marginTop: 8, background: T.gold, color: T.ink, border: "none", borderRadius: 8, padding: "6px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              <UserPlus size={12} /> Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Gift Modal ----------
function GiftModal({ profile, onClose, senderAccount }) {
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [balance, setBalance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!senderAccount?.id) return;
    supabase.from("wallet_balances").select("balance").eq("user_id", senderAccount.id).single()
      .then(({ data }) => setBalance(data?.balance ?? 0)).catch(() => setBalance(0));
  }, [senderAccount?.id]);

  const insufficient = balance != null && Number(amount) > balance;

  const handleSend = async () => {
    if (!senderAccount?.id || !profile?.id || busy || insufficient) return;
    setBusy(true); setError("");
    try {
      const { data, error: err } = await supabase.rpc("send_gift", {
        sender: senderAccount.id, recipient: profile.id, gift_amount: Number(amount), gift_note: note || null,
      });
      if (err || !data?.ok) {
        if (data?.error === "insufficient_balance") { setError("Not enough balance — top up your wallet first."); }
        else { setError("Couldn't send gift. Try again."); }
        setBusy(false);
        return;
      }
      setSent(true);
      setTimeout(onClose, 2200);
    } catch { setError("Couldn't send gift. Try again."); setBusy(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div style={{ background:T.card, width:"100%", maxWidth:480, margin:"0 auto", borderRadius:"20px 20px 0 0", padding:"20px 18px 32px" }} onClick={e=>e.stopPropagation()}>
        {sent ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🎁</div>
            <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:17, color:T.goldBright, marginBottom:6 }}>Gift Sent!</div>
            <div style={{ fontSize:12.5, color:T.muted }}>Your gift to <strong style={{color:T.paper}}>{profile?.display_name}</strong> is on its way.</div>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.paper }}>Gift {profile?.display_name}</div>
              <button onClick={onClose} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><X size={20} /></button>
            </div>
            <div style={{ fontSize:11.5, color:T.muted, marginBottom:14 }}>
              Wallet balance: <strong style={{color:T.goldBright}}>{balance == null ? "…" : `GHS ${Number(balance).toLocaleString("en-GH",{minimumFractionDigits:2,maximumFractionDigits:2})}`}</strong>
            </div>
            <>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:T.muted, display:"block", marginBottom:6 }}>Amount (GHS)</label>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  {["1","5","10","20","50"].map(v => (
                    <button key={v} onClick={() => setAmount(v)}
                      style={{ flex:1, padding:"8px 0", borderRadius:10, border:`1px solid ${amount===v?T.gold:T.cardBorder}`, background:amount===v?"rgba(198,161,91,0.15)":"none", color:amount===v?T.gold:T.paper, fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, cursor:"pointer" }}>
                      ${v}
                    </button>
                  ))}
                </div>
                <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} min="1"
                  style={{ width:"100%", background:T.ink, border:`1px solid ${T.cardBorder}`, borderRadius:10, color:T.paper, padding:"10px 12px", fontFamily:FONT_BODY, fontSize:13 }} />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:T.muted, display:"block", marginBottom:6 }}>Note (optional)</label>
                <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Add a message…"
                  style={{ width:"100%", background:T.ink, border:`1px solid ${T.cardBorder}`, borderRadius:10, color:T.paper, padding:"10px 12px", fontFamily:FONT_BODY, fontSize:13, resize:"none" }} />
              </div>
              {error ? <div style={{ fontSize:11.5, color:T.rust || "#c66", marginBottom:10 }}>{error}</div> : null}
              {insufficient ? (
                <button onClick={onClose}
                  style={{ width:"100%", background:"none", border:`1px solid ${T.gold}`, color:T.gold, borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:800, fontSize:14, cursor:"pointer" }}>
                  Top Up Wallet First
                </button>
              ) : (
                <button onClick={handleSend} disabled={busy}
                  style={{ width:"100%", background:T.goldGradient, color:T.ink, border:"none", borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:800, fontSize:14, cursor:busy?"default":"pointer", opacity:busy?0.7:1 }}>
                  {busy ? "Sending…" : `Send GHS ${amount} Gift 🎁`}
                </button>
              )}
            </>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Followers / Following list modal ----------
function FollowListModal({ userId, type, onClose, onOpenProfile }) {
  // null = still loading; [] = loaded but empty; [...] = loaded with data
  const [rows, setRows] = useState(null); // { uid, profile }[]
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    (async () => {
      setRows(null);
      setLoadError(null);
      try {
        let ids;
        if (type === "followers") {
          const { data, error } = await supabase.from("follows").select("follower_id").eq("followed_id", userId);
          if (error) throw error;
          ids = (data || []).map(r => r.follower_id);
        } else {
          const { data, error } = await supabase.from("follows").select("followed_id").eq("follower_id", userId);
          if (error) throw error;
          ids = (data || []).map(r => r.followed_id);
        }
        if (!ids.length) { setRows([]); return; }
        // Fetch profiles BEFORE rendering the list — no "user" fallback flash
        const pMap = await fetchProfilesMap(ids);
        const resolved = ids.map(uid => ({ uid, profile: pMap[uid] || null }));
        setRows(resolved);
      } catch (err) {
        setLoadError(err?.message || "Failed to load.");
      }
    })();
  }, [userId, type]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div style={{ background:T.card, width:"100%", maxWidth:480, margin:"0 auto", borderRadius:"20px 20px 0 0", padding:"18px 16px 28px", maxHeight:"70vh", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexShrink:0 }}>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.paper }}>{type === "followers" ? "Followers" : "Following"}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><X size={20} /></button>
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {rows === null && !loadError && (
            <div style={{ color:T.muted, fontSize:13, textAlign:"center", paddingTop:20 }}>Loading…</div>
          )}
          {loadError && (
            <div style={{ color:T.rust, fontSize:13, textAlign:"center", paddingTop:20 }}>Couldn't load {type}: {loadError}</div>
          )}
          {rows !== null && !loadError && rows.length === 0 && (
            <div style={{ color:T.muted, fontSize:13, textAlign:"center", paddingTop:20 }}>No {type} yet.</div>
          )}
          {rows !== null && !loadError && rows.map(({ uid, profile: p }) => {
            const displayName = p?.display_name || p?.full_name || p?.username || `user_${uid.slice(0, 8)}`;
            return (
              <button key={uid} onClick={() => { onClose(); onOpenProfile(uid); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 0", background:"none", border:"none", cursor:"pointer", borderBottom:`1px solid ${T.cardBorder}`, textAlign:"left" }}>
                <Avatar name={displayName} size={36} avatarUrl={p?.avatar_url} />
                <div>
                  <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13.5, color:T.paper }}>{displayName}</div>
                  {p?.bio && <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{p.bio.slice(0,50)}</div>}
                </div>
                <Badge isAdmin={p?.is_admin} badge={p?.badge} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Profile view ----------
function ProfileView({ userId, account, onBack, onOpenProfile, onDmUser }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [showGift, setShowGift] = useState(false);
  const [showFollowList, setShowFollowList] = useState(null);
  const [notifOn, setNotifOn] = useState(false);
  const [showNotifSheet, setShowNotifSheet] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ posts: true, signals: true });
  const [mutualFollowers, setMutualFollowers] = useState([]);

  useEffect(() => {
    (async () => {
      // Single authoritative fetch via API (service key, bypasses RLS, returns all public-safe fields)
      try {
        const r = await fetch(`${BASE_URL}/api/public-profile/${userId}`);
        if (!r.ok) throw new Error(`Profile API returned ${r.status}`);
        const data = await r.json();
        if (data?.error) throw new Error(data.error);
        setProfile(data);
      } catch (apiErr) {
        // Fallback 1: profiles table directly (authenticated read — includes cover_url/location if RLS permits)
        const { data: directP } = await supabase.from("profiles")
          .select("id,cover_url,location,full_name,username,display_name,date_of_birth,dob_privacy,avatar_url,bio,is_admin,badge")
          .eq("id", userId).single();
        if (directP) { setProfile(directP); }
        else {
          // Fallback 2: public_profiles view (may lack cover_url/location)
          const { data: p } = await supabase.from("public_profiles").select("*").eq("id", userId).single();
          setProfile(p || {});
        }
        if (process.env.NODE_ENV !== "production") console.error("Profile API fallback used:", apiErr?.message);
      }
      const { data: postRows } = await supabase.from("community_posts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      let profilePosts = postRows || [];
      setPosts(profilePosts);
      const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("followed_id", userId);
      const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId);
      setCounts({ followers: followers || 0, following: following || 0 });
      const { data: mine } = await supabase.from("follows").select("*").eq("follower_id", account.id).eq("followed_id", userId).maybeSingle();
      setIsFollowing(!!mine);

      // Mutual followers: people I follow who also follow this profile
      const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
        supabase.from("follows").select("followed_id").eq("follower_id", account.id),
        supabase.from("follows").select("follower_id").eq("followed_id", userId),
      ]);
      const iFollowSet = new Set((iFollow || []).map(r => r.followed_id));
      const mutualIds = (theyFollow || [])
        .map(r => r.follower_id)
        .filter(id => iFollowSet.has(id) && id !== account.id);
      if (mutualIds.length) {
        const { data: mProfiles } = await supabase
          .from("public_profiles").select("id,display_name,avatar_url")
          .in("id", mutualIds.slice(0, 5));
        setMutualFollowers(mProfiles || []);
      }
    })();
  }, [userId, account.id]);

  const toggleFollow = async () => {
    if (isFollowing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", account.id).eq("followed_id", userId);
      if (error) { if (process.env.NODE_ENV !== "production") console.error("Unfollow failed:", error.message); return; }
      setIsFollowing(false);
      setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: account.id, followed_id: userId });
      if (error) { if (process.env.NODE_ENV !== "production") console.error("Follow failed:", error.message); return; }
      notify(userId, account.id, "follow", null);
      setIsFollowing(true);
      setCounts((c) => ({ ...c, followers: c.followers + 1 }));
    }
  };

  const toggleNotifPref = (key) => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  const isOwnProfile = userId === account.id;

  if (!profile || posts === null) return (
    <div style={{ minHeight:"100%", background:T.ink }}>
      <style>{`@keyframes pvSlideIn{from{transform:translateX(28px);opacity:0}to{transform:translateX(0);opacity:1}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      {/* Banner + back button visible immediately — no black rectangle */}
      <div style={{ position:"relative", animation:"pvSlideIn 0.22s ease" }}>
        <button onClick={onBack} style={{ position:"absolute", top:12, left:12, zIndex:5, width:34, height:34, borderRadius:"50%", background:"rgba(30,30,30,0.75)", border:"none", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <ArrowLeft size={17} color="#fff" />
        </button>
        {profile?.cover_url
          ? <img src={profile.cover_url} alt="" style={{ width:"100%", height:110, objectFit:"cover", display:"block" }} />
          : <div style={{ width:"100%", height:110, background:`linear-gradient(135deg,#1a160d 0%,#231d10 55%,${T.gold}28 100%)` }} />
        }
      </div>
      <div style={{ height:60 }} />
      {/* Skeleton for name / handle / bio */}
      <div style={{ padding:"0 16px" }}>
        <div style={{ height:22, borderRadius:6, background:T.cardBorder, width:"52%", marginBottom:9, animation:"pulse 1.4s ease-in-out infinite" }} />
        <div style={{ height:13, borderRadius:6, background:T.cardBorder, width:"32%", marginBottom:12, animation:"pulse 1.4s ease-in-out infinite" }} />
        <div style={{ height:12, borderRadius:6, background:T.cardBorder, width:"70%", animation:"pulse 1.4s ease-in-out infinite" }} />
      </div>
    </div>
  );

  const joinedLabel = profile.created_at ? (() => {
    const d = new Date(profile.created_at);
    if (isNaN(d)) return null;
    return `Joined ${d.toLocaleString("default", { month: "long" })} ${d.getFullYear()}`;
  })() : null;

  const handle = profile.username || profile.display_name;

  return (
    <div style={{ minHeight:"100%", background:T.ink, overflowY:"auto" }}>
      <style>{`
        @keyframes pvSlideIn { from { transform:translateX(28px); opacity:0 } to { transform:translateX(0); opacity:1 } }
        @keyframes sheetUp   { from { transform:translateY(100%) }            to { transform:translateY(0) } }
      `}</style>

      {/* ── Modals ── */}
      {showFollowList && (
        <FollowListModal userId={userId} type={showFollowList} onClose={() => setShowFollowList(null)} onOpenProfile={onOpenProfile} />
      )}
      {showGift && (
        <GiftModal profile={profile} senderAccount={account} onClose={() => setShowGift(false)} />
      )}

      {/* ── Notification bottom sheet ── */}
      {showNotifSheet && !isOwnProfile && (
        <div onClick={() => setShowNotifSheet(false)} style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.55)" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position:"absolute", bottom:0, left:0, right:0, background:T.card, borderRadius:"20px 20px 0 0", padding:"16px 20px 38px", animation:"sheetUp 0.28s ease" }}>
            <div style={{ width:40, height:4, borderRadius:2, background:T.cardBorder, margin:"0 auto 18px" }} />
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:`${T.gold}18`, border:`1.5px solid ${T.gold}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Bell size={20} color={T.gold} />
              </div>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.paper }}>Notifications</div>
                <div style={{ fontSize:12, color:T.muted }}>@{handle}</div>
              </div>
            </div>
            {/* Master toggle */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:16, marginBottom:16, borderBottom:`1px solid ${T.cardBorder}` }}>
              <div>
                <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:14.5, color:T.paper }}>Enable notifications</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>Get alerts for this user's activity</div>
              </div>
              <button onClick={() => setNotifOn(v => !v)}
                style={{ width:46, height:27, borderRadius:14, background:notifOn ? T.gold : T.cardBorder, border:"none", cursor:"pointer", position:"relative", flexShrink:0, transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:3, left:notifOn ? 22 : 3, width:21, height:21, borderRadius:"50%", background:T.paper, transition:"left 0.2s" }} />
              </button>
            </div>
            {/* Per-type toggles (shown only when master is on) */}
            {notifOn && [
              { key:"posts",   label:"New Posts",        desc:"When they publish a new post" },
              { key:"signals", label:"Trading Signals",  desc:"When they share a trading signal" },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:14, marginBottom:14, borderBottom:`1px solid ${T.cardBorder}66` }}>
                <div>
                  <div style={{ fontFamily:FONT_HEAD, fontWeight:600, fontSize:13.5, color:T.paper }}>{label}</div>
                  <div style={{ fontSize:12, color:T.muted }}>{desc}</div>
                </div>
                <button onClick={() => toggleNotifPref(key)}
                  style={{ width:42, height:25, borderRadius:13, background:notifPrefs[key] ? T.gold : T.cardBorder, border:"none", cursor:"pointer", position:"relative", flexShrink:0 }}>
                  <div style={{ position:"absolute", top:2.5, left:notifPrefs[key] ? 20 : 2.5, width:20, height:20, borderRadius:"50%", background:T.paper, transition:"left 0.18s" }} />
                </button>
              </div>
            ))}
            <button onClick={() => setShowNotifSheet(false)}
              style={{ width:"100%", marginTop:6, background:`${T.gold}18`, border:`1px solid ${T.gold}55`, borderRadius:14, padding:"12px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:14, color:T.gold, cursor:"pointer" }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Banner area — back arrow overlaid, NO top nav bar with email text ── */}
      <div style={{ position:"relative", animation:"pvSlideIn 0.22s ease" }}>
        {/* Floating back button over banner */}
        <button onClick={onBack}
          style={{ position:"absolute", top:12, left:12, zIndex:5, width:34, height:34, borderRadius:"50%", background:"rgba(30,30,30,0.75)", border:"none", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <ArrowLeft size={17} color="#fff" />
        </button>

        {/* Banner */}
        {profile.cover_url
          ? <img src={profile.cover_url} alt="" style={{ width:"100%", height:110, objectFit:"cover", display:"block" }} />
          : <div style={{ width:"100%", height:110, background:`linear-gradient(135deg,#1a160d 0%,#231d10 55%,${T.gold}28 100%)` }} />
        }

        {/* Avatar overlaps banner bottom */}
        <div style={{ position:"absolute", bottom:-48, left:14, borderRadius:"50%", border:`3px solid ${T.gold}`, boxShadow:`0 0 0 3px ${T.ink}`, overflow:"hidden", width:92, height:92 }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.display_name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <div style={{ width:"100%", height:"100%", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_HEAD, fontWeight:800, color:T.ink, fontSize:34 }}>
                {(profile.display_name || "?")[0]?.toUpperCase()}
              </div>
          }
        </div>

        {/* Action buttons: Gift → Bell → Follow — BELOW banner, right side */}
        {!isOwnProfile && (
          <div style={{ position:"absolute", bottom:-44, right:14, display:"flex", alignItems:"center", gap:8 }}>
            {/* Gift (clean SVG, no emoji) */}
            <button onClick={() => setShowGift(true)} title="Send a gift"
              style={{ width:38, height:38, borderRadius:"50%", background:"none", border:`1.5px solid ${T.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.paper} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
            </button>
            {/* Bell → opens notification sheet */}
            <button onClick={() => setShowNotifSheet(true)} title="Notifications"
              style={{ width:38, height:38, borderRadius:"50%", background:"none", border:`1.5px solid ${notifOn ? T.gold : T.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
              <Bell size={16} color={notifOn ? T.gold : T.paper} />
            </button>
            {/* Follow */}
            <button onClick={toggleFollow}
              style={{ display:"flex", alignItems:"center", gap:7, background: isFollowing ? "none" : T.goldGradient, color: isFollowing ? T.paper : T.ink, border:`1.5px solid ${isFollowing ? T.cardBorder : "transparent"}`, borderRadius:22, padding:"9px 18px", fontFamily:FONT_HEAD, fontWeight:700, fontSize:13, cursor:"pointer", lineHeight:1, flexShrink:0, whiteSpace:"nowrap" }}>
              {isFollowing ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
            </button>
          </div>
        )}
      </div>

      {/* Spacer for avatar + button overlap (avatar extends 48px below banner) */}
      <div style={{ height:60 }} />

      {/* ── Profile info ── */}
      <div style={{ padding:"0 16px 8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2, flexWrap:"wrap" }}>
          <span style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:20, color:T.paper, lineHeight:1.25 }}>{profile.full_name || profile.display_name}</span>
          <Badge isAdmin={profile.is_admin} badge={profile.badge} />
        </div>
        <div style={{ fontSize:13.5, color:T.muted, marginBottom:8 }}>@{handle}</div>
        {profile.bio && <div style={{ fontSize:13.5, color:T.paper, marginBottom:10, lineHeight:1.65 }}>{profile.bio}</div>}
        {profile.location && (
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, color:T.muted, marginBottom:8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>{profile.location}</span>
          </div>
        )}
        {profile.date_of_birth && (() => {
          try {
            const parts = profile.date_of_birth.split("-");
            const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
            const dob_privacy = profile.dob_privacy || "daymonth";
            const month = months[parseInt(parts[1],10)-1] || "";
            const day = parseInt(parts[2],10);
            const year = parts[0];
            let dobText = "";
            if (dob_privacy === "everyone") dobText = `${month} ${day}, ${year}`;
            else if (dob_privacy === "friends" || dob_privacy === "daymonth") dobText = `${month} ${day}`;
            return dobText ? (
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, color:T.muted, marginBottom:8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>Born {dobText}</span>
              </div>
            ) : null;
          } catch { return null; }
        })()}
        {joinedLabel && (
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, color:T.muted, marginBottom:10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{joinedLabel}</span>
          </div>
        )}
        <div style={{ display:"flex", gap:20, marginBottom:mutualFollowers.length > 0 ? 10 : 14 }}>
          <button onClick={() => setShowFollowList("following")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}>
            <strong style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper }}>{formatCount(counts.following)}</strong>
            <span style={{ fontSize:14, color:T.muted }}> Following</span>
          </button>
          <button onClick={() => setShowFollowList("followers")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}>
            <strong style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:15, color:T.paper }}>{formatCount(counts.followers)}</strong>
            <span style={{ fontSize:14, color:T.muted }}> Followers</span>
          </button>
        </div>
        {mutualFollowers.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, fontSize:12.5, color:T.muted }}>
            <div style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
              {mutualFollowers.slice(0, 3).map((f, i) => (
                <div key={f.id} style={{ width:22, height:22, borderRadius:"50%", marginLeft:i > 0 ? -7 : 0, border:`1.5px solid ${T.ink}`, overflow:"hidden", background:T.goldGradient, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_HEAD, fontWeight:700, fontSize:8, color:T.ink, flexShrink:0 }}>
                  {f.avatar_url ? <img src={f.avatar_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" /> : (f.display_name || "?")[0]?.toUpperCase()}
                </div>
              ))}
            </div>
            <span style={{ lineHeight:1.4 }}>
              Followed by {mutualFollowers.slice(0, 2).map(f => f.display_name).join(", ")}
              {mutualFollowers.length > 2 ? ` and ${mutualFollowers.length - 2} others` : ""}
            </span>
          </div>
        )}
        {/* Message button — other users only */}
        {!isOwnProfile && (
          <button onClick={() => onDmUser && onDmUser(profile)}
            style={{ width:"100%", background:"none", border:`1.5px solid ${T.cardBorder}`, borderRadius:24, padding:"11px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:14.5, color:T.paper, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxSizing:"border-box", marginBottom:18 }}>
            <MessageCircle size={17} color={T.paper} /> Message
          </button>
        )}
      </div>

      {/* ── Posts ── */}
      <div style={{ borderTop:`1px solid ${T.cardBorder}`, padding:"12px 16px 0" }}>
        <span style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13.5, color:T.paper, borderBottom:`2px solid ${T.gold}`, paddingBottom:10, display:"inline-block" }}>Posts</span>
      </div>
      {posts.length === 0 ? (
        <div style={{ fontSize:13, color:T.muted, padding:"32px 0", textAlign:"center" }}>No posts yet.</div>
      ) : (
        <ProfileFeed posts={posts} account={account} profileEntry={profile} onOpenProfile={onOpenProfile} onDmUser={onDmUser} />
      )}
    </div>
  );
}

// ---------- ProfileFeed (used inside ProfileView) ----------
function ProfileFeed({ posts, account, profileEntry, onOpenProfile, onDmUser, onDelete, onRefresh, themeTokens }) {
  if (themeTokens) Object.assign(T, themeTokens);
  const [likeData, setLikeData] = useState({});
  const [repostData, setRepostData] = useState({});
  const profilesMap = { [profileEntry.id]: profileEntry };

  useEffect(() => {
    if (!posts.length) return;
    const ids = posts.map(p => p.id);
    const initialLikeData = {};
    const initialRepostData = {};
    posts.forEach((post) => {
      initialLikeData[post.id] = {
        count: Number(post.likes_count) || 0,
        likedByMe: false,
      };
      initialRepostData[post.id] = {
        count: Number(post.reposts_count ?? post.repost_count) || 0,
        repostedByMe: false,
      };
    });
    setLikeData(initialLikeData);
    setRepostData(initialRepostData);
    (async () => {
      const { data: myLikeRows } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", ids)
        .eq("user_id", account.id);
      const myLikedSet = new Set();
      (myLikeRows || []).forEach((r) => myLikedSet.add(r.post_id));
      const ld = {};
      ids.forEach((id) => {
        const post = posts.find((item) => item.id === id);
        ld[id] = {
          count: Number(post?.likes_count) || 0,
          likedByMe: myLikedSet.has(id),
        };
      });
      setLikeData(ld);

      const { data: reposts } = await supabase.from("post_reposts").select("post_id, user_id").in("post_id", ids);
      const rd = {};
      ids.forEach(id => { rd[id] = { count: 0, repostedByMe: false }; });
      (reposts || []).forEach(r => { if (rd[r.post_id]) { rd[r.post_id].count += 1; if (r.user_id === account.id) rd[r.post_id].repostedByMe = true; } });
      setRepostData(rd);
    })();
  }, [posts, account.id]);

  return (
    <div>
      {posts.map(p => (
        <PostCard
          key={p.id}
          post={p}
          profile={profilesMap[p.user_id]}
          account={account}
          profilesMap={profilesMap}
          onProfilesNeeded={() => {}}
          likeData={likeData}
          onToggleLike={(postId, authorId) => togglePostLike(postId, authorId, account.id, likeData, setLikeData)}
          repostData={repostData}
          onToggleRepost={(postId, authorId) => togglePostRepost(postId, authorId, account.id, repostData, setRepostData)}
          onOpenProfile={onOpenProfile}
          onDelete={onDelete || (() => {})}
          onEdit={onRefresh || (() => {})}
          onReport={() => {}}
          onDmUser={onDmUser}
        />
      ))}
    </div>
  );
}
// ---------- Community notification bell + panel ----------
const NOTIF_LABELS = {
  like: "liked your post.",
  reply: "replied to your post.",
  comment_reply: "replied to your comment.",
  mention: "mentioned you.",
  follow: "followed you.",
  repost: "reposted your post.",
  comment_like: "liked your comment.",
};

function CommunityNotifBell({ account, onOpenProfile, onOpenPost }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState(null);
  const [filter, setFilter] = useState("all");
  const [actorsMap, setActorsMap] = useState({});

  const load = useCallback(async () => {
    const { data } = await supabase.from("community_notifications").select("*").eq("user_id", account.id).order("created_at", { ascending: false }).limit(50);
    const rows = data || [];
    setNotifs(rows);
    const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))];
    setActorsMap(await fetchProfilesMap(actorIds));
  }, [account.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  // Realtime: refresh instantly when a new community notification is inserted
  // so the bell dot and the list update without waiting for the 30s poll.
  useEffect(() => {
    if (!account?.id) return undefined;
    const channel = supabase.channel("community-notif-bell-" + account.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_notifications", filter: `user_id=eq.${account.id}` }, () => { load(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_notifications", filter: `user_id=eq.${account.id}` }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [account?.id, load]);

  const unreadCount = (notifs || []).filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = (notifs || []).filter((n) => !n.read).map((n) => n.id);
    setNotifs((list) => list.map((n) => ({ ...n, read: true })));
    if (unreadIds.length) await supabase.from("community_notifications").update({ read: true }).in("id", unreadIds);
    // Tell the app shell to clear the community menu-icon badge immediately.
    try { window.dispatchEvent(new CustomEvent("rainx:community-notifs-read")); } catch {}
  };

  const filterMap = { all: () => true, likes: (n) => n.type === "like" || n.type === "comment_like", replies: (n) => n.type === "reply", mentions: (n) => n.type === "mention", reposts: (n) => n.type === "repost", followers: (n) => n.type === "follow" };
  const filtered = (notifs || []).filter(filterMap[filter] || (() => true));

  // Per-type professional icon badge (Facebook-style: small round circle on the avatar corner).
  const notifIcon = (type) => {
    if (type === "like" || type === "comment_like") return { Icon: Heart, bg: T.rust, fill: "#fff" };
    if (type === "reply" || type === "comment_reply") return { Icon: MessageCircle, bg: T.gold, fill: T.ink };
    if (type === "repost") return { Icon: Repeat2, bg: T.sage, fill: "#fff" };
    if (type === "follow") return { Icon: UserPlus, bg: T.gold, fill: T.ink };
    if (type === "mention") return { Icon: AtSign, bg: T.gold, fill: T.ink };
    return null;
  };

  // Tap behaviour: open the relevant post when possible, otherwise the actor's profile.
  const handleNotifTap = (n) => {
    setOpen(false);
    if (n.post_id && typeof onOpenPost === "function") onOpenPost(n.post_id);
    else if (n.actor_id && onOpenProfile) onOpenProfile(n.actor_id);
  };

  return (
    <>
      <button onClick={() => { setOpen(true); markAllRead(); }} style={{ position: "relative", background: "none", border: "none", color: T.paper, cursor: "pointer" }}>
        <Bell size={20} />
        {unreadCount > 0 && <span style={{ position: "absolute", top: -5, right: -7, width: 9, height: 9, borderRadius: "50%", background: T.gold, border: `1px solid ${T.ink}` }} />}
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: T.ink, zIndex: 500, display: "flex", flexDirection: "column", animation: "slideInPanel 0.25s ease-out" }}>
          <style>{'.hide-scroll::-webkit-scrollbar{display:none}'}</style>
          {/* Sticky header */}
          <div style={{ flexShrink: 0, padding: "16px 18px 0", borderBottom: `1px solid ${T.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: T.paper, fontWeight: 800 }}>Community Notifications</div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={22} /></button>
            </div>
            <button onClick={markAllRead} style={{ background: "none", border: "none", color: T.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 12 }}>Mark all as read</button>
            <div className="hide-scroll" style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", msOverflowStyle: "none", scrollbarWidth: "none" }}>
              {["all", "likes", "replies", "mentions", "reposts", "followers"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, background: filter === f ? T.gold : "none", color: filter === f ? T.ink : T.muted, border: `1px solid ${filter === f ? T.gold : T.cardBorder}`, borderRadius: 20, padding: "6px 13px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
              ))}
            </div>
          </div>
          {/* Scrollable list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 24px" }}>
            {filtered.length === 0 ? (
              <div style={{ fontSize: 14, color: T.muted, paddingTop: 16 }}>Nothing here yet.</div>
            ) : filtered.map((n) => {
              const actor = actorsMap[n.actor_id];
              const badge = notifIcon(n.type);
              return (
                <button key={n.id} onClick={() => handleNotifTap(n)} style={{ display: "flex", gap: 12, alignItems: "flex-start", width: "100%", padding: "14px 0", borderBottom: `1px solid ${T.cardBorder}`, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ position: "relative", flexShrink: 0 }} onClick={(e) => { if (actor?.id && onOpenProfile) { e.stopPropagation(); setOpen(false); onOpenProfile(actor.id); } }}>
                    <Avatar name={actor?.display_name} size={44} avatarUrl={actor?.avatar_url} />
                    {badge && (
                      <span style={{ position: "absolute", right: -4, bottom: -4, width: 23, height: 23, borderRadius: "50%", background: badge.bg, border: `2.5px solid ${T.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <badge.Icon size={14} strokeWidth={2.5} fill={badge.fill} color={badge.fill} />
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, color: T.paper, lineHeight: 1.5 }}>
                      <span style={{ color: T.paper, fontFamily: FONT_HEAD, fontWeight: 700 }}>{actor?.full_name || actor?.display_name || actor?.username || "Someone"}</span>{" "}{NOTIF_LABELS[n.type] || n.type}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold, marginTop: 6, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}


// ── Post Activity Screen ──────────────────────────────────────────────────────
function PostActivityScreen({ post, profile, account, likeData, repostData, T, onClose }) {
  const [activityData, setActivityData] = useState(null);
  const [dailyViews, setDailyViews] = useState([]);
  const ash = engAsh();

  useEffect(() => {
    if (!post?.id) return;
    // Read persisted like/comment totals from the post; only reposts need a separate count.
    supabase.from("post_reposts").select("*", { count: "exact", head: true }).eq("post_id", post.id).then((reposts) => {
      setActivityData({
        likes: Number(post.likes_count) || 0,
        comments: Number(post.comments_count) || 0,
        reposts: reposts.count || 0,
      });
    }).catch(() => {
      setActivityData({ likes: Number(post?.likes_count) || 0, comments: Number(post?.comments_count) || 0, reposts: repostData?.[post.id]?.count || 0 });
    });

    // Build a simple daily views array from created_at to now
    const dayCount = Math.min(7, Math.ceil((Date.now() - new Date(post.created_at).getTime()) / 86400000) + 1);
    const arr = Array.from({ length: dayCount }, (_, i) => ({
      label: new Date(Date.now() - (dayCount - 1 - i) * 86400000).toLocaleDateString("en", { month: "short", day: "numeric" }),
      val: i === dayCount - 1 ? (post.views || 0) : Math.floor((post.views || 0) * (0.05 + 0.15 * i / dayCount)),
    }));
    setDailyViews(arr);
  }, [post?.id]);

  const likes = activityData?.likes ?? likeData?.[post?.id]?.count ?? 0;
  const comments = activityData?.comments ?? (Number(post?.comments_count) || 0);
  const reposts = activityData?.reposts ?? repostData?.[post?.id]?.count ?? 0;
  const views = post?.views || 0;
  const engagements = likes + comments + reposts;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 180, background: T.ink, fontFamily: FONT_BODY, overflowY: "auto", animation: "slideInRight 0.22s ease" }}>
      <style>{"@keyframes slideInRight { from { transform:translateX(100%); opacity:0 } to { transform:translateX(0); opacity:1 } }"}</style>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.cardBorder}` }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.paper, cursor: "pointer" }}><ArrowLeft size={22} /></button>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16, color: T.paper }}>Post activity</div>
      </div>

      {/* Post preview card */}
      <div style={{ margin: "16px", background: T.card, borderRadius: 14, border: `1px solid ${T.cardBorder}`, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Avatar name={profile?.display_name} avatarUrl={profile?.avatar_url} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: T.paper, fontSize: 13 }}>{profile?.display_name || "You"}</div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>{timeAgo(post?.created_at)}</div>
            <div style={{ fontSize: 13, color: T.paper, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post?.text || ""}</div>
          </div>
        </div>
      </div>

      {/* Engagement row */}
      <div style={{ margin: "0 16px 16px", background: T.card, borderRadius: 14, border: `1px solid ${T.cardBorder}`, padding: 16, display: "flex", justifyContent: "space-around" }}>
        <div style={{ textAlign: "center" }}><Heart size={18} strokeWidth={2} color={ash} /><div style={{ fontWeight: 800, fontSize: 18, color: T.paper, marginTop: 4 }}>{likes}</div></div>
        <div style={{ textAlign: "center" }}><Repeat2 size={18} strokeWidth={2} color={ash} /><div style={{ fontWeight: 800, fontSize: 18, color: T.paper, marginTop: 4 }}>{reposts}</div></div>
        <div style={{ textAlign: "center" }}><MessageCircle size={18} strokeWidth={2} color={ash} /><div style={{ fontWeight: 800, fontSize: 18, color: T.paper, marginTop: 4 }}>{comments}</div></div>
      </div>

      {/* Metrics */}
      <div style={{ padding: "0 16px" }}>
        {[
          { label: "Impressions", value: views, info: "Times your post was seen" },
          { label: "Engagements", value: engagements, info: "Likes + comments + reposts" },
          { label: "Detail expands", value: Math.floor(views * 0.12), info: "Times post was tapped to expand" },
          { label: "Profile visits", value: Math.floor(views * 0.02), info: "Visits to your profile from this post" },
        ].map(({ label, value, info }) => (
          <div key={label} style={{ borderBottom: `1px solid ${T.cardBorder}`, padding: "16px 0" }}>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 28, color: T.paper }}>{value.toLocaleString()}</div>
          </div>
        ))}

        {/* Views chart */}
        {dailyViews.length > 0 && (
          <div style={{ padding: "20px 0 32px" }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 18, color: T.paper, marginBottom: 16 }}>Views over time</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, marginBottom: 8 }}>
              {dailyViews.map((d, i) => {
                const max = Math.max(...dailyViews.map(x => x.val), 1);
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", height: `${(d.val / max) * 70}px`, minHeight: 3, background: T.gold, borderRadius: "3px 3px 0 0", transition: "height 0.4s ease" }} />
                    <span style={{ fontSize: 9, color: T.muted, transform: "rotate(-35deg)", transformOrigin: "center", whiteSpace: "nowrap" }}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Main feed ----------
export default function CommunityTab({ account, entitlement, themeTokens, onViewingProfileChange }) {
  // Sync theme tokens from parent so T reflects the active theme
  if (themeTokens) Object.assign(T, themeTokens);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [profilesMap, setProfilesMap] = useState({});
  const [likeData, setLikeData] = useState({});
  const [repostData, setRepostData] = useState({});
  const [viewingUserId, setViewingUserId] = useState(() => {
    try { return localStorage.getItem("community-viewing-user") || null; } catch { return null; }
  });
  const [hashtags, setHashtags] = useState([]);
  const [activeHashtag, setActiveHashtag] = useState(null);
  const [onlineCount, setOnlineCount] = useState(null);
  const [showFabModal, setShowFabModal] = useState(false);
  // New: feed tabs, chat, post analytics
  const [feedTab, setFeedTab] = useState("foryou");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitUser, setChatInitUser] = useState(null);
  const [postActivity, setPostActivity] = useState(null); // { post, profile }
  const [openPostId, setOpenPostId] = useState(null); // set when a notification should open a specific post's detail
  const [followingIds, setFollowingIds] = useState(new Set());
  const _TIER_RANK = { none: 0, weekly: 1, monthly: 2, yearly: 3 };
  const isAccountPro = (_TIER_RANK[entitlement?.tier] || 0) >= 1; // any paid subscriber unlocks chat settings
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const [fabVisible, setFabVisible] = useState(true);
  const fabScrollRef = useRef(0);

  // Load following IDs for the "Following" feed tab
  useEffect(() => {
    if (!account?.id) return;
    supabase.from("follows").select("followed_id").eq("follower_id", account.id)
      .then(({ data }) => setFollowingIds(new Set((data||[]).map(r=>r.followed_id))))
      .catch(()=>{});
  }, [account?.id]);

  // (account pro status now computed directly from entitlement prop above)

  // Unread DM count for the message icon badge
  useEffect(() => {
    if (!account?.id) return;
    const loadUnread = async () => {
      const { count } = await supabase.from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", account.id).eq("is_read", false);
      setUnreadDmCount(count || 0);
    };
    loadUnread();
    const ch = supabase.channel("dm_unread_" + account.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, loadUnread)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [account?.id]);

  // Persist viewingUserId so page refresh returns to the same profile
  useEffect(() => {
    try {
      if (viewingUserId) localStorage.setItem("community-viewing-user", viewingUserId);
      else localStorage.removeItem("community-viewing-user");
    } catch {}
  }, [viewingUserId]);

  // Notify parent when community profile view opens/closes (for bottom nav hiding)
  useEffect(() => {
    onViewingProfileChange?.(viewingUserId);
  }, [viewingUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // FAB scroll-hide: hide when scrolling down, show when scrolling up
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y > fabScrollRef.current + 8) {
        setFabVisible(false);
      } else if (y < fabScrollRef.current - 8) {
        setFabVisible(true);
      }
      fabScrollRef.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track IDs we've SUCCESSFULLY resolved (have a name) so we don't refetch them.
  // IDs that failed or returned empty are NOT marked — they get retried on next call.
  const seenProfileIdsRef = useRef(new Set());
  const inflightProfileIdsRef = useRef(new Set());
  const viewedPostIdsRef = useRef(new Set());
  const mergeProfiles = useCallback(async (ids) => {
    if (!ids || !ids.length) return;
    // Only fetch IDs we haven't successfully resolved AND aren't currently in-flight.
    const missing = ids.filter((id) => id && !seenProfileIdsRef.current.has(id) && !inflightProfileIdsRef.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => inflightProfileIdsRef.current.add(id));
    let extra = {};
    try {
      extra = await fetchProfilesMap(missing);
    } catch (_) { extra = {}; }
    missing.forEach((id) => inflightProfileIdsRef.current.delete(id));
    // Only mark IDs as "seen" if we actually got a usable profile back (has a name field).
    missing.forEach((id) => {
      if (extra[id] && (extra[id].full_name || extra[id].display_name || extra[id].username)) {
        seenProfileIdsRef.current.add(id);
      }
    });
    // Enrich badges from subscriptions so comment authors also show verified badges
    const resolvedIds = missing.filter((id) => extra[id]);
    if (resolvedIds.length) {
      try {
        const { data: subRows } = await supabase.from("subscriptions").select("user_id, status, expires_at, plan").eq("status", "active").in("user_id", resolvedIds);
        (subRows || []).forEach((s) => {
          if (!extra[s.user_id]) return;
          const active = s.plan === "vip_lifetime" || (s.expires_at && new Date(s.expires_at) > new Date());
          if (!active) return;
          if (!extra[s.user_id].badge) {
            extra[s.user_id].badge = s.plan === "yearly" ? "golden" : "blue";
          }
          extra[s.user_id].isPro = true;
        });
      } catch (_) {}
    }
    if (Object.keys(extra).length) {
      setProfilesMap((m) => ({ ...m, ...extra }));
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    const [{ data }, { data: blocked }, { data: muted }, { data: notInterested }] = await Promise.all([
      supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(100),
      account?.id ? supabase.from("user_blocks").select("blocked_id").eq("blocker_id", account.id) : { data: [] },
      account?.id ? supabase.from("user_mutes").select("muted_id").eq("muter_id", account.id) : { data: [] },
      account?.id ? supabase.from("post_not_interested").select("post_id").eq("user_id", account.id) : { data: [] },
    ]);
    const excludedUsers = new Set([...(blocked || []).map(b => b.blocked_id), ...(muted || []).map(m => m.muted_id)]);
    const excludedPosts = new Set((notInterested || []).map(n => n.post_id));
    const rows = (data || []).filter(p => !excludedUsers.has(p.user_id) && !excludedPosts.has(p.id));

    const initialLikeData = {};
    const initialRepostData = {};
    rows.forEach((post) => {
      initialLikeData[post.id] = {
        count: Number(post.likes_count) || 0,
        likedByMe: false,
      };
      initialRepostData[post.id] = {
        count: Number(post.reposts_count ?? post.repost_count) || 0,
        repostedByMe: false,
      };
    });
    setLikeData(initialLikeData);
    setRepostData(initialRepostData);

    if (!rows.length) {
      setPosts([]);
      setPostsLoading(false);
      return;
    }

    const postIds = rows.map((r) => r.id);
    const userIds = [...new Set(rows.map((r) => r.user_id))];

    // Compute hashtags synchronously (cheap CPU work, no network)
    setHashtags((() => {
      const freq = {};
      rows.forEach((r) => extractHashtags(r.text).forEach((h) => { freq[h] = (freq[h] || 0) + 1; }));
      return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);
    })());

    // View counting — fire-and-forget, does not block UI
    const newlyVisible = postIds.filter((id) => !viewedPostIdsRef.current.has(id));
    newlyVisible.forEach((id) => {
      viewedPostIdsRef.current.add(id);
      supabase.rpc("increment_post_views", { post_id: id }).then(() => {}, () => {});
    });

    // Load secondary data in parallel — persisted post counts are already available
    const [pMap, myLikesResult, repostsResult, subResult] = await Promise.all([
      fetchProfilesMap(userIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds).eq("user_id", account.id),
      supabase.from("post_reposts").select("post_id, user_id").in("post_id", postIds),
      userIds.length
        ? supabase.from("subscriptions").select("user_id, status, expires_at, plan").eq("status", "active").in("user_id", userIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Enrich profiles with subscription badges
    (subResult?.data || []).forEach((s) => {
      if (!pMap[s.user_id]) return;
      const active = s.plan === "vip_lifetime" || (s.expires_at && new Date(s.expires_at) > new Date());
      if (!active) return;
      if (!pMap[s.user_id].badge) {
        pMap[s.user_id].badge = s.plan === "yearly" ? "golden" : "blue";
      }
      pMap[s.user_id].isPro = true;
    });
    setProfilesMap((m) => ({ ...m, ...pMap }));

    // Use the persisted total; only fetch this user's rows to determine likedByMe.
    const myLikedSet = new Set();
    (myLikesResult?.data || []).forEach((r) => myLikedSet.add(r.post_id));
    const ld = {};
    postIds.forEach((id) => {
      const post = rows.find((item) => item.id === id);
      ld[id] = {
        count: Number(post?.likes_count) || 0,
        likedByMe: myLikedSet.has(id),
      };
    });
    setLikeData(ld);

    // Repost data — use persisted reposts_count from DB, only scan rows to determine repostedByMe
    const rd = {};
    postIds.forEach((id) => {
      const post = rows.find((item) => item.id === id);
      rd[id] = { count: Number(post?.reposts_count ?? post?.repost_count) || 0, repostedByMe: false };
    });
    (repostsResult?.data || []).forEach((r) => { if (rd[r.post_id] && r.user_id === account.id) rd[r.post_id].repostedByMe = true; });
    setRepostData(rd);
    setPosts(rows);
    setPostsLoading(false);
  }, [account.id]);

  useEffect(() => {
    loadPosts();
    // Auto-refresh feed every 45 s so new posts appear without user action
    const autoRefreshId = setInterval(() => { loadPosts(); }, 45000);
    return () => clearInterval(autoRefreshId);
  }, [loadPosts]);

  useEffect(() => {
    const beat = async () => {
      await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", account.id);
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", fiveMinAgo);
      setOnlineCount(count || 1);
    };
    beat();
    const id = setInterval(beat, 60000);
    return () => clearInterval(id);
  }, [account.id]);


  const toggleLike = (postId, authorId) => togglePostLike(postId, authorId, account.id, likeData, setLikeData);
  const toggleRepost = (postId, authorId) => togglePostRepost(postId, authorId, account.id, repostData, setRepostData);
  const deletePost = async (id) => { await supabase.from("community_posts").delete().eq("id", id); loadPosts(); };
  const reportPost = async (id) => { await supabase.from("post_reports").insert({ post_id: id, reported_by: account.id }); alert("Reported. Thanks for flagging this."); };

  if (viewingUserId) return <ProfileView userId={viewingUserId} account={account} onBack={() => setViewingUserId(null)} onOpenProfile={setViewingUserId} onDmUser={(profile) => { setViewingUserId(null); setChatInitUser(profile); setChatOpen(true); }} />;

  // Filter posts for "Following" tab — must be declared BEFORE visiblePosts uses it
  const filteredByFeedTab = feedTab === "following"
    ? (posts || []).filter(p => followingIds.has(p.user_id) || p.user_id === account.id)
    : (posts || []);

  const visiblePosts = activeHashtag
    ? filteredByFeedTab.filter((p) => extractHashtags(p.text).includes(activeHashtag))
    : filteredByFeedTab;

  return (
    <div style={{ position: "relative", minHeight: "100%", background: T.ink }}>
      <style>{`${fadeIn} ${pulse} ${slideIn}`}</style>

      {/* Chat overlay */}
      {chatOpen && (
        <CommunityChat
          account={account}
          themeTokens={T}
          initialUser={chatInitUser}
          isPro={isAccountPro}
          onUnreadCleared={(count) => setUnreadDmCount((current) => Math.max(0, current - count))}
          onClose={() => { setChatOpen(false); setChatInitUser(null); }}
          onViewProfile={(userId) => { setChatOpen(false); setChatInitUser(null); setViewingUserId(userId); }}
        />
      )}

      {/* Post Activity overlay */}
      {postActivity && (
        <PostActivityScreen
          post={postActivity.post}
          profile={postActivity.profile}
          account={account}
          likeData={likeData}
          repostData={repostData}
          T={T}
          onClose={() => setPostActivity(null)}
        />
      )}

      {/* Top bar: bell left, chat right, NO Community title */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px 0", gap: 8 }}>
        <CommunityNotifBell account={account} onOpenProfile={setViewingUserId} onOpenPost={(postId) => setOpenPostId(postId)} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 0 }}>
          {/* For you / Following tabs */}
          <button onClick={() => setFeedTab("foryou")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 16px", borderBottom: `2px solid ${feedTab==="foryou"?T.gold:"transparent"}`, color: feedTab==="foryou"?T.paper:T.muted, fontWeight: feedTab==="foryou"?700:500, fontSize: 14, transition: "color 0.15s" }}>For you</button>
          <button onClick={() => setFeedTab("following")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 16px", borderBottom: `2px solid ${feedTab==="following"?T.gold:"transparent"}`, color: feedTab==="following"?T.paper:T.muted, fontWeight: feedTab==="following"?700:500, fontSize: 14, transition: "color 0.15s" }}>Following</button>
        </div>
        <button onClick={() => { setChatInitUser(null); setChatOpen(true); }} style={{ position: "relative", background: "none", border: "none", color: T.paper, cursor: "pointer", padding: 4 }}>
          <MessageSquare size={22} />
          {unreadDmCount > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, background: T.gold, color: T.ink, borderRadius: "50%", minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, padding: "0 3px" }}>
              {unreadDmCount > 99 ? "99+" : unreadDmCount}
            </span>
          )}
        </button>
      </div>
      <div style={{ height: 1, background: T.cardBorder, marginTop: 0 }} />

      <div style={{ padding: "8px 0" }}>
      {hashtags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>🔥 TRENDING</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {activeHashtag && (
              <button onClick={() => setActiveHashtag(null)} style={{ flexShrink: 0, background: T.rust, color: "#fff", border: "none", borderRadius: 20, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Clear ✕</button>
            )}
            {hashtags.map((h) => (
              <button key={h} onClick={() => setActiveHashtag(h === activeHashtag ? null : h)} style={{ flexShrink: 0, background: activeHashtag === h ? T.gold : T.card, color: activeHashtag === h ? T.ink : T.paper, border: `1px solid ${activeHashtag === h ? T.gold : T.cardBorder}`, borderRadius: 20, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{h}</button>
            ))}
          </div>
        </div>
      )}

      <SuggestedAccounts account={account} onOpenProfile={setViewingUserId} />
      

      {postsLoading && posts.length === 0 ? (
        /* Skeleton post cards — shown while initial load is in-flight */
        [0,1,2,3].map(i => (
          <div key={i} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, animation: "pulse 1.4s ease-in-out infinite" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.cardBorder, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 10, borderRadius: 5, background: T.cardBorder, width: "40%", marginBottom: 6 }} />
                <div style={{ height: 9, borderRadius: 5, background: T.cardBorder, width: "25%" }} />
              </div>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: T.cardBorder, width: "90%", marginBottom: 7 }} />
            <div style={{ height: 10, borderRadius: 5, background: T.cardBorder, width: "70%", marginBottom: 7 }} />
            <div style={{ height: 10, borderRadius: 5, background: T.cardBorder, width: "55%" }} />
          </div>
        ))
      ) : visiblePosts.length === 0 ? (
        <div style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>No posts yet - be the first to share something.</div>
      ) : visiblePosts.map((p) => (
        <PostCard
          key={p.id} post={p} profile={profilesMap[p.user_id]} account={account}
          profilesMap={profilesMap} onProfilesNeeded={mergeProfiles}
          likeData={likeData} onToggleLike={toggleLike}
          repostData={repostData} onToggleRepost={toggleRepost}
          onOpenProfile={setViewingUserId} onDelete={deletePost} onEdit={loadPosts} onReport={reportPost}
          onActivityOpen={(post) => setPostActivity({ post, profile: profilesMap[post.user_id] })}
          onDmUser={(profile) => { setChatInitUser(profile); setChatOpen(true); }}
          forceOpen={openPostId === p.id}
          onOpened={() => setOpenPostId(null)}
        />
      ))}

      </div>{/* end feed wrapper */}
      <button onClick={() => setShowFabModal(true)} style={{ position: "fixed", bottom: 90, right: 20, width: 52, height: 52, borderRadius: "50%", background: T.gold, border: "none", color: T.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.4)", cursor: "pointer", opacity: fabVisible ? 1 : 0, transform: fabVisible ? "scale(1)" : "scale(0.8)", transition: "opacity 0.25s, transform 0.25s", pointerEvents: fabVisible ? "auto" : "none" }}
        onMouseDown={(e) => { if (fabVisible) e.currentTarget.style.transform = "scale(0.9)"; }}
        onMouseUp={(e) => { if (fabVisible) e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
      </button>


      <button onClick={() => setShowFabModal(true)} style={{ position: "fixed", bottom: 90, right: 20, width: 52, height: 52, borderRadius: "50%", background: T.gold, border: "none", color: T.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.4)", cursor: "pointer", opacity: fabVisible ? 1 : 0, transform: fabVisible ? "scale(1)" : "scale(0.8)", transition: "opacity 0.25s, transform 0.25s", pointerEvents: fabVisible ? "auto" : "none" }}
        onMouseDown={(e) => { if (fabVisible) e.currentTarget.style.transform = "scale(0.9)"; }}
        onMouseUp={(e) => { if (fabVisible) e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
      </button>

      {showFabModal && (
        <Composer account={account} onPosted={() => { loadPosts(); }} onClose={() => setShowFabModal(false)} />
      )}
    </div>
  );
}
export { PostCard, ProfileFeed, Composer, FollowListModal, formatCount };
