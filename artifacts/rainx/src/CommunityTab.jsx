import React, { useState, useEffect, useCallback, useRef } from "react";
import CommunityChat from "./CommunityChat";
import {
  Send, Trash2, Edit3, X, BadgeCheck, Heart, Eye, MessageCircle, Repeat2, MessageSquareDashed,
  UserPlus, UserCheck, ArrowLeft, Bell, MoreHorizontal, Plus, Hash, AtSign, Flag, ChevronRight, MessageSquare,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const T = {
  ink: "#0F0E0B", card: "#1C1913", cardBorder: "#332C1F",
  gold: "#C6A15B", goldBright: "#E3C077", sage: "#7A9E86", rust: "#B0604A",
  paper: "#F2EDE0", muted: "#9C947F",
};
const FONT_HEAD = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif";
const FONT_BODY = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif";

const fadeIn = "@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }";
const pulse = "@keyframes likePulse { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }";
const slideIn = "@keyframes slideInPanel { from { transform: translateX(100%); } to { transform: translateX(0); } }";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
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
                width: 28, height: 28, borderRadius: "50%", background: "#C6A15B",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#0F0E0B", flexShrink: 0,
                overflow: "hidden",
              }}>
                {s.avatar_url
                  ? <img src={s.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (s.display_name?.[0] || "?").toUpperCase()}
              </div>
              <span style={{ color: "#E3C077", fontWeight: 700, fontSize: 13, fontFamily: "'Montserrat', sans-serif" }}>
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
  const { data } = await supabase.from("public_profiles").select("id").eq("display_name", handle).maybeSingle();
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
            color: isRaina ? T.goldBright : T.sage,
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
  if (userId === actorId) return; // don't notify yourself
  try { await supabase.from("community_notifications").insert({ user_id: userId, actor_id: actorId, type, post_id: postId || null }); } catch {}
}
async function fetchProfilesMap(ids) {
  if (!ids.length) return {};
  const { data } = await supabase.from("public_profiles").select("*").in("id", ids);
  const map = {};
  (data || []).forEach((p) => { map[p.id] = p; });
  return map;
}

function GoldBadge({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }} title="Admin">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" fill="#dcab00" />
    </svg>
  );
}
function BlueBadge({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }} title="Blue Verified">
      <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0" />
    </svg>
  );
}
function GoldenBadge({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }} title="Golden Verified">
      <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#E3C077" />
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
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, #8a6f34)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_HEAD, fontWeight: 800, color: T.ink, fontSize: size * 0.4, flexShrink: 0 }}>
      {letter}
    </div>
  );
}

// ---------- Composer ----------
function Composer({ account, onPosted, compact }) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const taRef = useRef(null);

  const insertAt = (symbol) => {
    const newVal = text + (text.endsWith(" ") || text === "" ? "" : " ") + symbol;
    setText(newVal.slice(0, 500));
    taRef.current?.focus();
  };

  const submit = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    const trimmed = text.trim();
    const { data: post } = await supabase.from("community_posts").insert({ user_id: account.id, text: trimmed }).select("id").single();
    const mentions = extractMentions(trimmed);
    if (mentions.length && post) {
      const { data: mentioned } = await supabase.from("public_profiles").select("id, display_name").in("display_name", mentions);
      (mentioned || []).forEach((m) => notify(m.id, account.id, "mention", post.id));
    }
    // Trigger Raina AI reply when @rainaai is mentioned
    if (post && mentions.includes("rainaai")) {
      fetch("/api/community-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id, post_text: trimmed, author_name: account.email, user_id: account.id }),
      }).catch(() => {});
      // Reload after a short delay so the AI comment appears
      setTimeout(() => onPosted(), 4000);
    }
    setText("");
    setPosting(false);
    onPosted();
  };

  return (
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => insertAt("#")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 7, padding: "5px 8px", color: T.muted, fontSize: 10.5, cursor: "pointer" }}><Hash size={11} /> Hashtag</button>
              <button onClick={() => insertAt("@")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${T.cardBorder}`, borderRadius: 7, padding: "5px 8px", color: T.muted, fontSize: 10.5, cursor: "pointer" }}><AtSign size={11} /> Mention</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: T.muted }}>{text.length}/500</span>
              <button onClick={submit} disabled={posting || !text.trim()} style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 8, padding: "7px 16px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: !text.trim() ? 0.5 : 1, transition: "opacity 0.15s" }}>
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// ---------- Comments (single level) ----------
function CommentsSection({ postId, postAuthorId, account, profilesMap, onProfilesNeeded, onOpenProfile }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState("");
  const [likeData, setLikeData] = useState({});

  const load = useCallback(async () => {
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    const rows = data || [];
    setComments(rows);
    onProfilesNeeded([...new Set(rows.map((r) => r.user_id))]);
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const { data: likes } = await supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", ids);
      const ld = {};
      ids.forEach((id) => { ld[id] = { count: 0, likedByMe: false }; });
      (likes || []).forEach((l) => { ld[l.comment_id].count += 1; if (l.user_id === account.id) ld[l.comment_id].likedByMe = true; });
      setLikeData(ld);
    }
  }, [postId, account.id, onProfilesNeeded]);

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
        fetch("/api/community-ai", {
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

  const toggleCommentLike = async (commentId, authorId) => {
    const cur = likeData[commentId] || { count: 0, likedByMe: false };
    if (cur.likedByMe) {
      await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", account.id);
      setLikeData((d) => ({ ...d, [commentId]: { count: Math.max(0, cur.count - 1), likedByMe: false } }));
    } else {
      await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: account.id });
      setLikeData((d) => ({ ...d, [commentId]: { count: cur.count + 1, likedByMe: true } }));
      notify(authorId, account.id, "comment_like", postId);
    }
  };

  if (comments === null) return <div style={{ fontSize: 11, color: T.muted, padding: "8px 0" }}>Loading comments…</div>;

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
      {comments.map((c) => {
        const p = profilesMap[c.user_id];
        const ld = likeData[c.id] || { count: 0, likedByMe: false };
        return (
          <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 10, paddingLeft: 10, borderLeft: `2px solid ${T.cardBorder}` }}>
            <Avatar name={p?.display_name} size={24} avatarUrl={p?.avatar_url} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: T.paper }}>{p?.display_name || "user"}</span>
                <Badge isAdmin={p?.is_admin} badge={p?.badge} />
                <span style={{ fontSize: 9.5, color: T.muted }}>· {timeAgo(c.created_at)}</span>
              </div>
              <div style={{ fontSize: 12, color: T.paper, marginTop: 2, lineHeight: 1.5 }}>{renderTextWithTags(c.text, onOpenProfile)}</div>
              <button onClick={() => toggleCommentLike(c.id, c.user_id)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: ld.likedByMe ? T.rust : T.muted, marginTop: 4 }}>
                <Heart size={11} fill={ld.likedByMe ? T.rust : "none"} style={ld.likedByMe ? { animation: "likePulse 0.3s ease" } : {}} /> <span style={{ fontSize: 10.5 }}>{ld.count}</span>
              </button>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <MentionTextarea
            value={text}
            onChange={setText}
            placeholder="Write a reply…"
            rows={1}
            maxLength={300}
            style={{ width: "100%", background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.paper, padding: "8px 10px", fontFamily: FONT_BODY, fontSize: 12, resize: "none" }}
          />
        </div>
        <button onClick={submitComment} disabled={!text.trim()} style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 8, padding: "8px 14px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11.5, cursor: "pointer", flexShrink: 0 }}>Reply</button>
      </div>
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

function PostCard({ post, profile, account, profilesMap, onProfilesNeeded, likeData, onToggleLike, repostData, onToggleRepost, onOpenProfile, onDelete, onEdit, onReport, onActivityOpen, onDmUser }) {
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const isOwn = post.user_id === account.id;
  const ld = likeData[post.id] || { count: 0, likedByMe: false };
  const rd = repostData[post.id] || { count: 0, repostedByMe: false };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    const { error } = await supabase.from("community_posts").update({ text: editText.trim() }).eq("id", post.id);
    setEditing(false);
    if (!error) onEdit(); // refreshes from the server - the real source of truth
  };

  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.cardBorder}`, animation: "fadeInUp 0.25s ease", display: "flex", gap: 10 }}>
      {/* Avatar column */}
      <button onClick={() => onOpenProfile(post.user_id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
        <Avatar name={profile?.display_name} avatarUrl={profile?.avatar_url} size={40} />
      </button>
      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button onClick={() => onOpenProfile(post.user_id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.paper }}>{profile?.display_name || "user"}</span>
          <Badge isAdmin={profile?.is_admin} badge={profile?.badge} isPro={profile?.isPro} />
          <span style={{ fontSize: 11, color: T.muted }}>{timeAgo(post.created_at)}</span>
        </button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((v) => !v)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><MoreHorizontal size={16} /></button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: 22, background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 8, overflow: "hidden", zIndex: 10, minWidth: 100 }}>
              {isOwn ? (
                <>
                  <button onClick={() => { setEditing(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "none", border: "none", padding: "8px 10px", color: T.paper, fontSize: 11.5, cursor: "pointer" }}><Edit3 size={12} /> Edit</button>
                  <button onClick={() => { onDelete(post.id); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "none", border: "none", padding: "8px 10px", color: T.rust, fontSize: 11.5, cursor: "pointer" }}><Trash2 size={12} /> Delete</button>
                </>
              ) : (
                <button onClick={() => { onReport(post.id); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "none", border: "none", padding: "8px 10px", color: T.rust, fontSize: 11.5, cursor: "pointer" }}><Flag size={12} /> Report</button>
              )}
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div style={{ marginTop: 8 }}>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value.slice(0, 500))} rows={3} style={{ width: "100%", background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.paper, padding: 8, fontFamily: FONT_BODY, fontSize: 13 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={saveEdit} style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
            <button onClick={() => setEditing(false)} style={{ background: "none", border: `1px solid ${T.cardBorder}`, color: T.muted, borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 14, fontWeight: 400, color: T.paper, marginTop: 8, lineHeight: 1.65, whiteSpace: "pre-wrap", fontFamily: FONT_BODY, letterSpacing: 0.1 }}>{renderTextWithTags(post.text, onOpenProfile)}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 10 }}>
        <button onClick={() => onToggleLike(post.id, post.user_id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: ld.likedByMe ? T.rust : T.muted }}>
          <Heart size={14} strokeWidth={1.5} fill={ld.likedByMe ? T.rust : "none"} style={ld.likedByMe ? { animation: "likePulse 0.3s ease" } : {}} /> <span style={{ fontSize: 11.5 }}>{ld.count}</span>
        </button>
        <button onClick={() => setShowComments((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: showComments ? T.gold : T.muted }}>
          <MessageCircle size={14} strokeWidth={1.5} /> <span style={{ fontSize: 11.5 }}>{post.comment_count || ""}</span>
        </button>
        <button onClick={() => onToggleRepost(post.id, post.user_id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: rd.repostedByMe ? T.sage : T.muted }}>
          <Repeat2 size={14} strokeWidth={1.5} /> <span style={{ fontSize: 11.5 }}>{rd.count}</span>
        </button>
        <button onClick={() => isOwn && onActivityOpen && onActivityOpen(post)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: isOwn ? "pointer" : "default", color: isOwn ? T.gold : T.muted }}>
          <AnalyticsBarIcon size={14} color={isOwn ? T.gold : "rgba(120,120,120,0.7)"} /> <span style={{ fontSize: 11.5 }}>{post.views || 0}</span>
        </button>
        {/* Gift button for premium/subscribed users */}
        {profile?.isPro && post.user_id !== account.id && (
          <GiftIconButton profile={profile} account={account} />
        )}
      </div>

      {showComments && <CommentsSection postId={post.id} postAuthorId={post.user_id} account={account} profilesMap={profilesMap} onProfilesNeeded={onProfilesNeeded} onOpenProfile={onOpenProfile} />}
      
      {post.images && post.images.length > 0 && (
        <div style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", display: "grid", gap: 2, 
          gridTemplateColumns: post.images.length === 1 ? "1fr" : post.images.length === 2 ? "1fr 1fr" : "1fr 1fr",
          gridTemplateRows: post.images.length === 3 ? "1fr 1fr" : "auto"
        }}>
          {post.images.map((img, i) => (
            <img key={i} src={img} alt="Post attachment" style={{ 
              width: "100%", height: post.images.length === 1 ? "auto" : 200, objectFit: "cover",
              gridColumn: post.images.length === 3 && i === 0 ? "1 / span 2" : "auto"
            }} />
          ))}
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

  useEffect(() => {
    (async () => {
      const { data: myFollows } = await supabase.from("follows").select("followed_id").eq("follower_id", account.id);
      const followedSet = new Set((myFollows || []).map((f) => f.followed_id));
      setFollowingIds(followedSet);
      const { data } = await supabase.from("public_profiles").select("*").neq("id", account.id).order("created_at", { ascending: false }).limit(10);
      setSuggestions((data || []).filter((p) => !followedSet.has(p.id)).slice(0, 5));
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

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>SUGGESTED ACCOUNTS</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {suggestions.map((p) => (
          <div key={p.id} style={{ flexShrink: 0, width: 140, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 12 }}>
            <button onClick={() => onOpenProfile(p.id)} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", width: "100%" }}>
              <Avatar name={p.display_name} size={28} avatarUrl={p.avatar_url} />
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.paper, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.display_name}</span>
                <Badge isAdmin={p.is_admin} badge={p.badge} />
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
  const [method, setMethod] = useState(null); // "mobile" | "crypto" | "card"
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    setSent(true);
    setTimeout(onClose, 2200);
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
            {/* Payment method selection */}
            {!method ? (
              <>
                <div style={{ fontSize:12, color:T.muted, marginBottom:12 }}>Choose a payment method:</div>
                {[
                  { id:"mobile", label:"Mobile Money", desc:"MTN, Vodafone, AirtelTigo", emoji:"📱" },
                  { id:"crypto", label:"Cryptocurrency", desc:"BTC, ETH, USDT", emoji:"₿" },
                  { id:"card", label:"Debit / Credit Card", desc:"Visa, Mastercard", emoji:"💳" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setMethod(opt.id)}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:14, background:T.ink, border:`1px solid ${T.cardBorder}`, borderRadius:14, padding:"14px 16px", cursor:"pointer", marginBottom:10, textAlign:"left" }}>
                    <div style={{ fontSize:24, flexShrink:0 }}>{opt.emoji}</div>
                    <div>
                      <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13.5, color:T.paper }}>{opt.label}</div>
                      <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{opt.desc}</div>
                    </div>
                    <ChevronRight size={16} color={T.muted} style={{ marginLeft:"auto" }} />
                  </button>
                ))}
              </>
            ) : (
              <>
                <button onClick={() => setMethod(null)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:T.muted, cursor:"pointer", marginBottom:14, fontSize:12 }}>
                  <ArrowLeft size={14} /> Back
                </button>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:11, color:T.muted, display:"block", marginBottom:6 }}>Amount (USD)</label>
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
                <button onClick={handleSend}
                  style={{ width:"100%", background:`linear-gradient(135deg,${T.gold},${T.goldBright})`, color:T.ink, border:"none", borderRadius:12, padding:"13px 0", fontFamily:FONT_HEAD, fontWeight:800, fontSize:14, cursor:"pointer" }}>
                  Send ${amount} Gift 🎁
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Followers / Following list modal ----------
function FollowListModal({ userId, type, onClose, onOpenProfile }) {
  const [list, setList] = useState(null);
  const [profilesMap, setProfilesMap] = useState({});

  useEffect(() => {
    (async () => {
      let rows;
      if (type === "followers") {
        const { data } = await supabase.from("follows").select("follower_id").eq("followed_id", userId);
        rows = (data || []).map(r => r.follower_id);
      } else {
        const { data } = await supabase.from("follows").select("followed_id").eq("follower_id", userId);
        rows = (data || []).map(r => r.followed_id);
      }
      setList(rows);
      const pMap = await fetchProfilesMap(rows);
      setProfilesMap(pMap);
    })();
  }, [userId, type]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div style={{ background:T.card, width:"100%", maxWidth:480, margin:"0 auto", borderRadius:"20px 20px 0 0", padding:"18px 16px 28px", maxHeight:"70vh", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexShrink:0 }}>
          <div style={{ fontFamily:FONT_HEAD, fontWeight:800, fontSize:16, color:T.goldBright }}>{type === "followers" ? "Followers" : "Following"}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><X size={20} /></button>
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {list === null ? (
            <div style={{ color:T.muted, fontSize:13, textAlign:"center", paddingTop:20 }}>Loading…</div>
          ) : list.length === 0 ? (
            <div style={{ color:T.muted, fontSize:13, textAlign:"center", paddingTop:20 }}>No {type} yet.</div>
          ) : list.map(uid => {
            const p = profilesMap[uid];
            return (
              <button key={uid} onClick={() => { onClose(); onOpenProfile(uid); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 0", background:"none", border:"none", cursor:"pointer", borderBottom:`1px solid ${T.cardBorder}`, textAlign:"left" }}>
                <Avatar name={p?.display_name} size={36} avatarUrl={p?.avatar_url} />
                <div>
                  <div style={{ fontFamily:FONT_HEAD, fontWeight:700, fontSize:13.5, color:T.paper }}>{p?.display_name || "user"}</div>
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
  const [showFollowList, setShowFollowList] = useState(null); // "followers" | "following"

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("public_profiles").select("*").eq("id", userId).single();
      setProfile(p);
      const { data: postRows } = await supabase.from("community_posts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      setPosts(postRows || []);
      const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("followed_id", userId);
      const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId);
      setCounts({ followers: followers || 0, following: following || 0 });
      const { data: mine } = await supabase.from("follows").select("*").eq("follower_id", account.id).eq("followed_id", userId).maybeSingle();
      setIsFollowing(!!mine);
    })();
  }, [userId, account.id]);

  const toggleFollow = async () => {
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", account.id).eq("followed_id", userId);
      setIsFollowing(false);
      setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
    } else {
      await supabase.from("follows").insert({ follower_id: account.id, followed_id: userId });
      notify(userId, account.id, "follow", null);
      setIsFollowing(true);
      setCounts((c) => ({ ...c, followers: c.followers + 1 }));
    }
  };

  if (!profile || posts === null) return <div style={{ padding: 16, color: T.muted, fontSize: 13 }}>Loading profile…</div>;
  const isOwnProfile = userId === account.id;

  return (
    <div style={{ padding: 16 }}>
      {showFollowList && (
        <FollowListModal userId={userId} type={showFollowList} onClose={() => setShowFollowList(null)} onOpenProfile={onOpenProfile} />
      )}
      {showGift && (
        <GiftModal profile={profile} senderAccount={account} onClose={() => setShowGift(false)} />
      )}
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.muted, cursor: "pointer", marginBottom: 14, fontSize: 12 }}>
        <ArrowLeft size={15} /> Back to Community
      </button>
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <Avatar name={profile.display_name} size={56} avatarUrl={profile.avatar_url} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
          <span style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 800, color: T.paper }}>{profile.display_name}</span>
          <Badge isAdmin={profile.is_admin} badge={profile.badge} />
        </div>
        {profile.bio && <div style={{ fontSize: 12.5, color: T.paper, marginTop: 6, lineHeight: 1.5 }}>{profile.bio}</div>}
        {/* Follower / Following counts — clickable */}
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          <button onClick={() => setShowFollowList("followers")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}>
            <strong style={{ color: T.paper, fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15 }}>{counts.followers}</strong>
            <span style={{ fontSize: 12, color: T.muted, marginLeft: 4 }}>followers</span>
          </button>
          <button onClick={() => setShowFollowList("following")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}>
            <strong style={{ color: T.paper, fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15 }}>{counts.following}</strong>
            <span style={{ fontSize: 12, color: T.muted, marginLeft: 4 }}>following</span>
          </button>
        </div>
        {/* Action buttons for other users */}
        {!isOwnProfile && (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={toggleFollow}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent:"center", gap: 5, background: isFollowing ? "none" : T.gold, color: isFollowing ? T.paper : T.ink, border: `1px solid ${isFollowing ? T.cardBorder : T.gold}`, borderRadius: 10, padding: "9px 0", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {isFollowing ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
            </button>
            <button onClick={() => onDmUser && onDmUser(profile)}
              style={{ flex: 1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, background:"none", border:`1px solid ${T.cardBorder}`, borderRadius:10, padding:"9px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, color:T.paper, cursor:"pointer" }}>
              <MessageCircle size={13} /> Chat
            </button>
            <button onClick={() => setShowGift(true)}
              style={{ flex: 1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, background:"rgba(198,161,91,0.15)", border:`1px solid ${T.gold}44`, borderRadius:10, padding:"9px 0", fontFamily:FONT_HEAD, fontWeight:700, fontSize:12, color:T.gold, cursor:"pointer" }}>
              🎁 Gift
            </button>
          </div>
        )}
      </div>
      {posts.length === 0 ? (
        <div style={{ fontSize: 12, color: T.muted, padding: "20px 0", textAlign:"center" }}>No posts yet.</div>
      ) : (
        <ProfileFeed
          posts={posts}
          account={account}
          profileEntry={profile}
          onOpenProfile={onOpenProfile}
          onDmUser={onDmUser}
        />
      )}
    </div>
  );
}

// ---------- ProfileFeed (used inside ProfileView) ----------
function ProfileFeed({ posts, account, profileEntry, onOpenProfile, onDmUser }) {
  const [likeData, setLikeData] = useState({});
  const [repostData, setRepostData] = useState({});
  const profilesMap = { [profileEntry.id]: profileEntry };

  useEffect(() => {
    if (!posts.length) return;
    const ids = posts.map(p => p.id);
    (async () => {
      const { data: likes } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", ids);
      const ld = {};
      ids.forEach(id => { ld[id] = { count: 0, likedByMe: false }; });
      (likes || []).forEach(l => { if (ld[l.post_id]) { ld[l.post_id].count += 1; if (l.user_id === account.id) ld[l.post_id].likedByMe = true; } });
      setLikeData(ld);

      const { data: reposts } = await supabase.from("post_reposts").select("post_id, user_id").in("post_id", ids);
      const rd = {};
      ids.forEach(id => { rd[id] = { count: 0, repostedByMe: false }; });
      (reposts || []).forEach(r => { if (rd[r.post_id]) { rd[r.post_id].count += 1; if (r.user_id === account.id) rd[r.post_id].repostedByMe = true; } });
      setRepostData(rd);
    })();
  }, [posts, account.id]);

  const toggleLike = async (postId, authorId) => {
    const cur = likeData[postId] || { count: 0, likedByMe: false };
    if (cur.likedByMe) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", account.id);
      setLikeData(d => ({ ...d, [postId]: { count: Math.max(0, cur.count - 1), likedByMe: false } }));
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: account.id });
      setLikeData(d => ({ ...d, [postId]: { count: cur.count + 1, likedByMe: true } }));
    }
  };

  const toggleRepost = async (postId, authorId) => {
    const cur = repostData[postId] || { count: 0, repostedByMe: false };
    if (cur.repostedByMe) {
      await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", account.id);
      setRepostData(d => ({ ...d, [postId]: { count: Math.max(0, cur.count - 1), repostedByMe: false } }));
    } else {
      await supabase.from("post_reposts").insert({ post_id: postId, user_id: account.id });
      setRepostData(d => ({ ...d, [postId]: { count: cur.count + 1, repostedByMe: true } }));
    }
  };

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
          onToggleLike={toggleLike}
          repostData={repostData}
          onToggleRepost={toggleRepost}
          onOpenProfile={onOpenProfile}
          onDelete={() => {}}
          onEdit={() => {}}
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
  mention: "mentioned you.",
  follow: "followed you.",
  repost: "reposted your post.",
  comment_like: "liked your comment.",
};

function CommunityNotifBell({ account }) {
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

  const unreadCount = (notifs || []).filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = (notifs || []).filter((n) => !n.read).map((n) => n.id);
    setNotifs((list) => list.map((n) => ({ ...n, read: true })));
    if (unreadIds.length) await supabase.from("community_notifications").update({ read: true }).in("id", unreadIds);
  };

  const filterMap = { all: () => true, likes: (n) => n.type === "like" || n.type === "comment_like", replies: (n) => n.type === "reply", mentions: (n) => n.type === "mention", reposts: (n) => n.type === "repost" };
  const filtered = (notifs || []).filter(filterMap[filter]);

  return (
    <>
      <button onClick={() => { setOpen(true); markAllRead(); }} style={{ position: "relative", background: "none", border: "none", color: T.paper, cursor: "pointer" }}>
        <Bell size={20} />
        {unreadCount > 0 && <span style={{ position: "absolute", top: -5, right: -7, width: 9, height: 9, borderRadius: "50%", background: T.gold, border: `1px solid ${T.ink}` }} />}
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 70 }} onClick={() => setOpen(false)}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "88%", maxWidth: 380, background: T.card, padding: 18, overflowY: "auto", animation: "slideInPanel 0.25s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: T.paper, fontWeight: 800 }}>Community Notifications</div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={20} /></button>
            </div>
            <button onClick={markAllRead} style={{ background: "none", border: "none", color: T.gold, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 12 }}>Mark all as read</button>

            <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
              {["all", "likes", "replies", "mentions", "reposts"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, background: filter === f ? T.gold : "none", color: filter === f ? T.ink : T.muted, border: `1px solid ${filter === f ? T.gold : T.cardBorder}`, borderRadius: 20, padding: "5px 11px", fontSize: 10.5, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ fontSize: 12, color: T.muted }}>Nothing here yet.</div>
            ) : filtered.map((n) => {
              const actor = actorsMap[n.actor_id];
              return (
                <div key={n.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${T.cardBorder}` }}>
                  <Avatar name={actor?.display_name} size={30} avatarUrl={actor?.avatar_url} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: T.paper, lineHeight: 1.4 }}>
                      <strong style={{ color: T.paper }}>{actor?.display_name || "Someone"}</strong> {NOTIF_LABELS[n.type]}
                    </div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.gold, marginTop: 4, flexShrink: 0 }} />}
                </div>
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

  useEffect(() => {
    if (!post?.id) return;
    // Fetch fresh like/comment/repost counts for this specific post
    Promise.all([
      supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", post.id).then(r => r, () => ({ count: 0 })),
      supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", post.id).then(r => r, () => ({ count: 0 })),
      supabase.from("post_reposts").select("*", { count: "exact", head: true }).eq("post_id", post.id).then(r => r, () => ({ count: 0 })),
    ]).then(([likes, comments, reposts]) => {
      setActivityData({
        likes: likes.count || 0,
        comments: comments.count || 0,
        reposts: reposts.count || 0,
      });
    }).catch(() => {
      setActivityData({ likes: likeData?.[post.id]?.count || 0, comments: post.comment_count || 0, reposts: repostData?.[post.id]?.count || 0 });
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
  const comments = activityData?.comments ?? post?.comment_count ?? 0;
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
        <div style={{ textAlign: "center" }}><Heart size={18} color={T.muted} /><div style={{ fontWeight: 800, fontSize: 18, color: T.paper, marginTop: 4 }}>{likes}</div></div>
        <div style={{ textAlign: "center" }}><Repeat2 size={18} color={T.muted} /><div style={{ fontWeight: 800, fontSize: 18, color: T.paper, marginTop: 4 }}>{reposts}</div></div>
        <div style={{ textAlign: "center" }}><MessageCircle size={18} color={T.muted} /><div style={{ fontWeight: 800, fontSize: 18, color: T.paper, marginTop: 4 }}>{comments}</div></div>
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
export default function CommunityTab({ account, themeTokens }) {
  // Sync theme tokens from parent so T reflects the active theme
  if (themeTokens) Object.assign(T, themeTokens);
  const [posts, setPosts] = useState(null);
  const [profilesMap, setProfilesMap] = useState({});
  const [likeData, setLikeData] = useState({});
  const [repostData, setRepostData] = useState({});
  const [viewingUserId, setViewingUserId] = useState(null);
  const [hashtags, setHashtags] = useState([]);
  const [activeHashtag, setActiveHashtag] = useState(null);
  const [onlineCount, setOnlineCount] = useState(null);
  const [showFabModal, setShowFabModal] = useState(false);
  // New: feed tabs, chat, post analytics
  const [feedTab, setFeedTab] = useState("foryou");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitUser, setChatInitUser] = useState(null);
  const [postActivity, setPostActivity] = useState(null); // { post, profile }
  const [followingIds, setFollowingIds] = useState(new Set());
  const [isAccountPro, setIsAccountPro] = useState(false);
  const [unreadDmCount, setUnreadDmCount] = useState(0);

  // Load following IDs for the "Following" feed tab
  useEffect(() => {
    if (!account?.id) return;
    supabase.from("follows").select("followed_id").eq("follower_id", account.id)
      .then(({ data }) => setFollowingIds(new Set((data||[]).map(r=>r.followed_id))))
      .catch(()=>{});
  }, [account?.id]);

  // Check current account's own subscription
  useEffect(() => {
    if (!account?.id) return;
    supabase.from("subscriptions").select("status, expires_at, plan")
      .eq("user_id", account.id).eq("status", "active").maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const active = data.plan === "vip_lifetime" || (data.expires_at && new Date(data.expires_at) > new Date());
        setIsAccountPro(active);
      }).catch(() => {});
  }, [account?.id]);

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

  const seenProfileIdsRef = useRef(new Set());
  const viewedPostIdsRef = useRef(new Set());
  const mergeProfiles = useCallback(async (ids) => {
    const missing = ids.filter((id) => !seenProfileIdsRef.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => seenProfileIdsRef.current.add(id));
    const extra = await fetchProfilesMap(missing);
    // Enrich badges from subscriptions so comment authors also show verified badges
    if (missing.length) {
      const { data: subRows } = await supabase.from("subscriptions").select("user_id, status, expires_at, plan").eq("status", "active").in("user_id", missing);
      (subRows || []).forEach((s) => {
        if (!extra[s.user_id]) return;
        const active = s.plan === "vip_lifetime" || (s.expires_at && new Date(s.expires_at) > new Date());
        if (!active) return;
        if (!extra[s.user_id].badge) {
          extra[s.user_id].badge = s.plan === "biannual" ? "golden" : "blue";
        }
        extra[s.user_id].isPro = true;
      });
    }
    setProfilesMap((m) => ({ ...m, ...extra }));
  }, []);

  const loadPosts = useCallback(async () => {
    const { data } = await supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(100);
    let rows = data || [];

    if (rows.length) {
      const { data: allComments } = await supabase.from("post_comments").select("post_id").in("post_id", rows.map((r) => r.id));
      const counts = {};
      (allComments || []).forEach((c) => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
      rows = rows.map((r) => ({ ...r, comment_count: counts[r.id] || 0 }));
    }

    setHashtags((() => {
      const freq = {};
      rows.forEach((r) => extractHashtags(r.text).forEach((h) => { freq[h] = (freq[h] || 0) + 1; }));
      return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);
    })());

    setPosts(rows);
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const pMap = await fetchProfilesMap(userIds);
    if (userIds.length) {
      const { data: subRows } = await supabase.from("subscriptions").select("user_id, status, expires_at, plan").eq("status", "active").in("user_id", userIds);
      (subRows || []).forEach((s) => {
        if (!pMap[s.user_id]) return;
        const active = s.plan === "vip_lifetime" || (s.expires_at && new Date(s.expires_at) > new Date());
        if (!active) return;
        // Only set badge from subscriptions if the DB hasn't already set one
        if (!pMap[s.user_id].badge) {
          pMap[s.user_id].badge = s.plan === "biannual" ? "golden" : "blue";
        }
        pMap[s.user_id].isPro = true;
      });
    }
    setProfilesMap((m) => ({ ...m, ...pMap }));

    if (rows.length) {
      const postIds = rows.map((r) => r.id);
      const { data: likes } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds);
      const ld = {};
      postIds.forEach((id) => { ld[id] = { count: 0, likedByMe: false }; });
      (likes || []).forEach((l) => { ld[l.post_id].count += 1; if (l.user_id === account.id) ld[l.post_id].likedByMe = true; });
      setLikeData(ld);

      const { data: reposts } = await supabase.from("post_reposts").select("post_id, user_id").in("post_id", postIds);
      const rd = {};
      postIds.forEach((id) => { rd[id] = { count: 0, repostedByMe: false }; });
      (reposts || []).forEach((r) => { rd[r.post_id].count += 1; if (r.user_id === account.id) rd[r.post_id].repostedByMe = true; });
      setRepostData(rd);

      // Only count a view once per post per session - loadPosts() re-runs after
      // every like/comment/edit/delete to refresh the feed, so without this
      // guard every interaction would inflate every visible post's view count.
      const newlyVisible = postIds.filter((id) => !viewedPostIdsRef.current.has(id));
      newlyVisible.forEach((id) => {
        viewedPostIdsRef.current.add(id);
        supabase.rpc("increment_post_views", { post_id: id }).then(() => {}, () => {});
      });
    }
  }, [account.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

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

  const toggleLike = async (postId, authorId) => {
    const cur = likeData[postId] || { count: 0, likedByMe: false };
    if (cur.likedByMe) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", account.id);
      setLikeData((d) => ({ ...d, [postId]: { count: Math.max(0, cur.count - 1), likedByMe: false } }));
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: account.id });
      setLikeData((d) => ({ ...d, [postId]: { count: cur.count + 1, likedByMe: true } }));
      notify(authorId, account.id, "like", postId);
    }
  };
  const toggleRepost = async (postId, authorId) => {
    const cur = repostData[postId] || { count: 0, repostedByMe: false };
    if (cur.repostedByMe) {
      await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", account.id);
      setRepostData((d) => ({ ...d, [postId]: { count: Math.max(0, cur.count - 1), repostedByMe: false } }));
    } else {
      await supabase.from("post_reposts").insert({ post_id: postId, user_id: account.id });
      setRepostData((d) => ({ ...d, [postId]: { count: cur.count + 1, repostedByMe: true } }));
      notify(authorId, account.id, "repost", postId);
    }
  };
  const deletePost = async (id) => { await supabase.from("community_posts").delete().eq("id", id); loadPosts(); };
  const reportPost = async (id) => { await supabase.from("post_reports").insert({ post_id: id, reported_by: account.id }); alert("Reported. Thanks for flagging this."); };

  if (viewingUserId) return <ProfileView userId={viewingUserId} account={account} onBack={() => setViewingUserId(null)} onOpenProfile={setViewingUserId} onDmUser={(profile) => { setViewingUserId(null); setChatInitUser(profile); setChatOpen(true); }} />;
  if (posts === null) return <div style={{ padding: 16, color: T.muted, fontSize: 13 }}>Loading community…</div>;

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
        <CommunityNotifBell account={account} />
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
      

      {visiblePosts.length === 0 ? (
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
        />
      ))}

      </div>{/* end feed wrapper */}
      <button onClick={() => setShowFabModal(true)} style={{ position: "fixed", bottom: 90, right: 20, width: 52, height: 52, borderRadius: "50%", background: T.gold, border: "none", color: T.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.4)", cursor: "pointer", transition: "transform 0.15s" }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.9)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <Plus size={24} />
      </button>

      {showFabModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 80, display: "flex", alignItems: "flex-end" }} onClick={() => setShowFabModal(false)}>
          <div style={{ background: T.ink, width: "100%", maxWidth: 480, margin: "0 auto", borderRadius: "16px 16px 0 0", padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setShowFabModal(false)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={20} /></button>
            </div>
            <Composer account={account} compact onPosted={() => { setShowFabModal(false); loadPosts(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
