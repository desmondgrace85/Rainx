import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Trash2, Edit3, X, BadgeCheck, Heart, Eye, MessageCircle, Repeat2,
  UserPlus, UserCheck, ArrowLeft, Bell, MoreHorizontal, Plus, Hash, AtSign, Flag,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const T = {
  ink: "#0F0E0B", card: "#1C1913", cardBorder: "#332C1F",
  gold: "#C6A15B", goldBright: "#E3C077", sage: "#7A9E86", rust: "#B0604A",
  paper: "#F2EDE0", muted: "#9C947F",
};
const FONT_HEAD = "'Montserrat', sans-serif";
const FONT_BODY = "'Montserrat', sans-serif";

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
      return (
        <span key={i} style={{ color: T.sage, fontWeight: 600, cursor: onOpenProfile ? "pointer" : "default", textDecoration: onOpenProfile ? "underline" : "none" }}
          onClick={onOpenProfile ? (e) => { e.stopPropagation(); goToMention(handle, onOpenProfile); } : undefined}>
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
    <svg width={size} height={size} viewBox="1.604 1.604 18.792 18.792" style={{ flexShrink: 0 }} title="Verified">
      <path d="m20.396 11a3.487 3.487 0 0 0 -2.008-3.062 3.474 3.474 0 0 0 -.742-3.584 3.474 3.474 0 0 0 -3.584-.742 3.468 3.468 0 0 0 -3.062-2.008 3.463 3.463 0 0 0 -3.053 2.008 3.472 3.472 0 0 0 -1.902-.14c-.635.13-1.22.436-1.69.882a3.461 3.461 0 0 0 -.734 3.584 3.49 3.49 0 0 0 -2.017 3.062 3.496 3.496 0 0 0 2.017 3.062 3.471 3.471 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742 3.487 3.487 0 0 0 3.062 2.008 3.476 3.476 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327 3.487 3.487 0 0 0 2.008-3.062zm-10.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0" />
    </svg>
  );
}
function Badge({ isAdmin, badge, isPro }) {
  if (isAdmin) return <GoldBadge />;
  if (badge === "blue") return <BlueBadge />;
  if (isPro) return <span style={{ fontSize: 8.5, fontWeight: 800, color: T.gold, border: `1px solid ${T.gold}`, borderRadius: 4, padding: "1px 4px", flexShrink: 0 }}>PRO</span>;
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
    setText((t) => t + (t.endsWith(" ") || t === "" ? "" : " ") + symbol);
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
        body: JSON.stringify({ post_id: post.id, post_text: trimmed, author_name: account.email }),
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
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="Share a market thought…"
            rows={compact ? 4 : 3}
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
                <span style={{ fontSize: 11.5, fontWeight: 700, color: T.goldBright }}>{p?.display_name || "user"}</span>
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
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} onKeyDown={(e) => e.key === "Enter" && submitComment()} placeholder="Write a reply…" style={{ flex: 1, background: T.ink, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.paper, padding: "8px 10px", fontFamily: FONT_BODY, fontSize: 12 }} />
        <button onClick={submitComment} disabled={!text.trim()} style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 8, padding: "0 14px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>Reply</button>
      </div>
    </div>
  );
}

// ---------- Post card ----------
function PostCard({ post, profile, account, profilesMap, onProfilesNeeded, likeData, onToggleLike, repostData, onToggleRepost, onOpenProfile, onDelete, onEdit, onReport }) {
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
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 14, marginBottom: 10, animation: "fadeInUp 0.3s ease", transition: "box-shadow 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button onClick={() => onOpenProfile(post.user_id)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <Avatar name={profile?.display_name} avatarUrl={profile?.avatar_url} />
          <div style={{ textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.goldBright }}>{profile?.display_name || "user"}</span>
              <Badge isAdmin={profile?.is_admin} badge={profile?.badge} isPro={profile?.isPro} />
            </div>
            <div style={{ fontSize: 10, color: T.muted }}>{timeAgo(post.created_at)}</div>
          </div>
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
        <div style={{ fontSize: 13, color: T.paper, marginTop: 8, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{renderTextWithTags(post.text, onOpenProfile)}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 10 }}>
        <button onClick={() => onToggleLike(post.id, post.user_id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: ld.likedByMe ? T.rust : T.muted }}>
          <Heart size={14} fill={ld.likedByMe ? T.rust : "none"} style={ld.likedByMe ? { animation: "likePulse 0.3s ease" } : {}} /> <span style={{ fontSize: 11.5 }}>{ld.count}</span>
        </button>
        <button onClick={() => setShowComments((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: showComments ? T.gold : T.muted }}>
          <MessageCircle size={14} /> <span style={{ fontSize: 11.5 }}>{post.comment_count || ""}</span>
        </button>
        <button onClick={() => onToggleRepost(post.id, post.user_id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: rd.repostedByMe ? T.sage : T.muted }}>
          <Repeat2 size={14} /> <span style={{ fontSize: 11.5 }}>{rd.count}</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.muted }}>
          <Eye size={14} /> <span style={{ fontSize: 11.5 }}>{post.views}</span>
        </div>
      </div>

      {showComments && <CommentsSection postId={post.id} postAuthorId={post.user_id} account={account} profilesMap={profilesMap} onProfilesNeeded={onProfilesNeeded} onOpenProfile={onOpenProfile} />}
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
                <span style={{ fontSize: 12, fontWeight: 700, color: T.goldBright, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.display_name}</span>
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

// ---------- Profile view ----------
function ProfileView({ userId, account, onBack, onOpenProfile }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

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

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.muted, cursor: "pointer", marginBottom: 14, fontSize: 12 }}>
        <ArrowLeft size={15} /> Back to Community
      </button>
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <Avatar name={profile.display_name} size={48} avatarUrl={profile.avatar_url} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
          <span style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 800, color: T.goldBright }}>{profile.display_name}</span>
          <Badge isAdmin={profile.is_admin} badge={profile.badge} />
        </div>
        {profile.bio && <div style={{ fontSize: 12.5, color: T.paper, marginTop: 6, lineHeight: 1.5 }}>{profile.bio}</div>}
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11.5, color: T.muted }}>
          <span><strong style={{ color: T.paper }}>{counts.followers}</strong> followers</span>
          <span><strong style={{ color: T.paper }}>{counts.following}</strong> following</span>
        </div>
        {userId !== account.id && (
          <button onClick={toggleFollow} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, background: isFollowing ? "none" : T.gold, color: isFollowing ? T.paper : T.ink, border: `1px solid ${isFollowing ? T.cardBorder : T.gold}`, borderRadius: 8, padding: "8px 14px", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {isFollowing ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
          </button>
        )}
      </div>
      {posts.length === 0 ? <div style={{ fontSize: 12, color: T.muted }}>No posts yet.</div> : posts.map((p) => (
        <div key={p.id} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: T.paper, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{renderTextWithTags(p.text, onOpenProfile)}</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>{timeAgo(p.created_at)}</div>
        </div>
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
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: T.goldBright, fontWeight: 800 }}>Community Notifications</div>
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
                      <strong style={{ color: T.goldBright }}>{actor?.display_name || "Someone"}</strong> {NOTIF_LABELS[n.type]}
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

// ---------- Main feed ----------
export default function CommunityTab({ account }) {
  const [posts, setPosts] = useState(null);
  const [profilesMap, setProfilesMap] = useState({});
  const [likeData, setLikeData] = useState({});
  const [repostData, setRepostData] = useState({});
  const [viewingUserId, setViewingUserId] = useState(null);
  const [hashtags, setHashtags] = useState([]);
  const [activeHashtag, setActiveHashtag] = useState(null);
  const [onlineCount, setOnlineCount] = useState(null);
  const [showFabModal, setShowFabModal] = useState(false);

  const seenProfileIdsRef = useRef(new Set());
  const viewedPostIdsRef = useRef(new Set());
  const mergeProfiles = useCallback(async (ids) => {
    const missing = ids.filter((id) => !seenProfileIdsRef.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => seenProfileIdsRef.current.add(id));
    const extra = await fetchProfilesMap(missing);
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
      const proSet = new Set();
      (subRows || []).forEach((s) => {
        if (s.plan === "vip_lifetime" || (s.expires_at && new Date(s.expires_at) > new Date())) proSet.add(s.user_id);
      });
      userIds.forEach((id) => { if (pMap[id]) pMap[id].isPro = proSet.has(id); });
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

  if (viewingUserId) return <ProfileView userId={viewingUserId} account={account} onBack={() => setViewingUserId(null)} onOpenProfile={setViewingUserId} />;
  if (posts === null) return <div style={{ padding: 16, color: T.muted, fontSize: 13 }}>Loading community…</div>;

  const visiblePosts = activeHashtag ? posts.filter((p) => extractHashtags(p.text).includes(activeHashtag)) : posts;

  return (
    <div style={{ padding: 16, position: "relative", minHeight: "100%" }}>
      <style>{`${fadeIn} ${pulse} ${slideIn}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 20, color: T.goldBright, fontWeight: 800 }}>Community</div>
          <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>Share ideas, discuss markets and learn together.</div>
        </div>
        <CommunityNotifBell account={account} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, marginTop: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.sage }} />
        <span style={{ fontSize: 11, color: T.muted }}>{onlineCount !== null ? `${onlineCount} active in the last 5 min` : "…"}</span>
      </div>

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
      <Composer account={account} onPosted={loadPosts} />

      {visiblePosts.length === 0 ? (
        <div style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>No posts yet - be the first to share something.</div>
      ) : visiblePosts.map((p) => (
        <PostCard
          key={p.id} post={p} profile={profilesMap[p.user_id]} account={account}
          profilesMap={profilesMap} onProfilesNeeded={mergeProfiles}
          likeData={likeData} onToggleLike={toggleLike}
          repostData={repostData} onToggleRepost={toggleRepost}
          onOpenProfile={setViewingUserId} onDelete={deletePost} onEdit={loadPosts} onReport={reportPost}
        />
      ))}

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
