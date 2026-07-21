/**
 * CommunityChat.jsx — WhatsApp-style DM for RainX community
 * Features: per-user mini settings, general settings, read receipts,
 * online/last-seen status, date dividers, subscription gating.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, MoreVertical, Send, X, ChevronRight,
  Search, AlertCircle, Check, Settings, Lock,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const buildT = (tokens) => ({
  ink: "#0F0E0B", card: "#1C1913", cardBorder: "#332C1F",
  gold: "#C6A15B", goldBright: "#E3C077", paper: "#F2EDE0", muted: "#9C947F",
  ...(tokens || {}),
});

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return new Date(d).toLocaleDateString();
}
function fmt(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function dateDividerLabel(dateStr) {
  const d   = new Date(dateStr).toDateString();
  const tod = new Date().toDateString();
  const yes = new Date(Date.now() - 86400000).toDateString();
  if (d === tod) return "Today";
  if (d === yes) return "Yesterday";
  return new Date(dateStr).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}
function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}
function lastSeenLabel(lastSeen) {
  if (!lastSeen) return null;
  if (isOnline(lastSeen)) return "Online";
  const s = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  if (s < 3600) return "Last seen " + Math.floor(s / 60) + "m ago";
  if (s < 86400) return "Last seen " + Math.floor(s / 3600) + "h ago";
  return "Last seen " + new Date(lastSeen).toLocaleDateString();
}

// ── localStorage settings ──────────────────────────────────────────────────
const SETTINGS_KEY = "rainx_chat_settings_v1";
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; }
}
function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}
function getGeneralSettings() {
  const s = loadSettings();
  return { readReceipts: true, showLastSeen: true, showOnline: true, ...(s.general || {}) };
}
function getPerUserSettings(userId) {
  const s = loadSettings();
  return { ...getGeneralSettings(), ...(s.perUser?.[userId] || {}) };
}
function setGeneralSettings(patch) {
  const s = loadSettings();
  s.general = { ...getGeneralSettings(), ...patch };
  saveSettings(s);
}
function setPerUserSettings(userId, patch) {
  const s = loadSettings();
  if (!s.perUser) s.perUser = {};
  s.perUser[userId] = { ...(s.perUser[userId] || {}), ...patch };
  saveSettings(s);
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size }) {
  size = size || 40;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#C6A15B,#E3C077)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.38, color: "#0F0E0B", flexShrink: 0, overflow: "hidden" }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (name || "?")[0].toUpperCase()}
    </div>
  );
}

// ── Ticks ──────────────────────────────────────────────────────────────────
// status: "sent" | "delivered" | "read"
// sent     → 1 faint ash tick  (message sent, other user offline)
// delivered → 2 faint ash ticks (delivered or read-receipts off)
// read     → 2 gold ticks      (read + read-receipts on)
function Ticks({ status }) {
  if (status === "read") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", color: "#C6A15B" }}>
        <Check size={10} strokeWidth={3.5} />
        <Check size={10} strokeWidth={3.5} style={{ marginLeft: -6 }} />
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", color: "rgba(156,148,127,0.5)" }}>
        <Check size={10} strokeWidth={3.5} />
        <Check size={10} strokeWidth={3.5} style={{ marginLeft: -6 }} />
      </span>
    );
  }
  // "sent" — single faint ash tick
  return <Check size={10} strokeWidth={3.5} color="rgba(156,148,127,0.38)" />;
}

function getTickStatus(msg, otherOnline, readReceiptsEnabled) {
  if (msg._pending) return "sent";
  if (readReceiptsEnabled && msg.is_read) return "read";
  if (otherOnline || msg.is_read) return "delivered";
  return "sent";
}

// ── Pro gate modal ─────────────────────────────────────────────────────────
function ProGateModal({ onClose, T }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", padding: "28px 20px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 800, fontSize: 17, color: T.paper, marginBottom: 8 }}>Subscribers & Premium Only</div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.65, marginBottom: 24 }}>
          Per-chat privacy controls are available for subscribers and premium users.<br />Upgrade your plan to unlock this feature.
        </div>
        <button onClick={onClose} style={{ width: "100%", background: T.gold, color: T.ink, border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Got it</button>
      </div>
    </div>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────
function SettingRow({ label, sublabel, value, onChange, gated, isPro, T }) {
  const [showGate, setShowGate] = useState(false);
  const handle = () => {
    if (gated && !isPro) { setShowGate(true); return; }
    onChange(!value);
  };
  return (
    <>
      {showGate && <ProGateModal onClose={() => setShowGate(false)} T={T} />}
      <div onClick={handle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <div style={{ color: T.paper, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            {label}
            {gated && !isPro && <Lock size={12} color={T.gold} />}
          </div>
          {sublabel && <div style={{ color: T.muted, fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{sublabel}</div>}
        </div>
        <div style={{ width: 46, height: 27, borderRadius: 14, background: value ? T.gold : T.cardBorder, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 3, left: value ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: value ? T.ink : T.muted, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
        </div>
      </div>
    </>
  );
}

// ── Mini chat settings (per-user, opened from three-dots → Chat Settings) ──
function MiniChatSettings({ userId, userName, isPro, onClose, T }) {
  const [settings, setSettings] = useState(() => getPerUserSettings(userId));
  const update = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setPerUserSettings(userId, { [key]: val });
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 350 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", paddingBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 8px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4 }}><X size={20} /></button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.paper }}>Chat settings · {userName}</div>
            <div style={{ fontSize: 11, color: T.muted }}>Only applies to this conversation</div>
          </div>
        </div>
        <div style={{ height: 1, background: T.cardBorder, margin: "4px 0 8px" }} />

        <div style={{ margin: "0 12px", background: T.ink, borderRadius: 12, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <SettingRow label="Read receipts" sublabel="Let this user see when you've read their messages" value={settings.readReceipts} onChange={v => update("readReceipts", v)} gated isPro={isPro} T={T} />
          <div style={{ height: 1, background: T.cardBorder }} />
          <SettingRow label="Show last seen" sublabel="Let this user see when you were last active" value={settings.showLastSeen} onChange={v => update("showLastSeen", v)} gated isPro={isPro} T={T} />
          <div style={{ height: 1, background: T.cardBorder }} />
          <SettingRow label="Show online status" sublabel="Let this user see when you're currently online" value={settings.showOnline} onChange={v => update("showOnline", v)} gated isPro={isPro} T={T} />
        </div>

        {!isPro && (
          <div style={{ margin: "12px 12px 0", background: "rgba(198,161,91,0.08)", border: "1px solid rgba(198,161,91,0.22)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={14} color={T.gold} />
            <span style={{ fontSize: 12, color: T.muted }}>Upgrade to <strong style={{ color: T.gold }}>Subscriber</strong> or <strong style={{ color: T.gold }}>Premium</strong> to enable per-chat privacy controls.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── General chat settings (all chats, available to everyone) ───────────────
function GeneralChatSettings({ onClose, T }) {
  const [settings, setSettings] = useState(() => getGeneralSettings());
  const update = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setGeneralSettings({ [key]: val });
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 350 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", paddingBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 8px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4 }}><X size={20} /></button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.paper }}>General Chat Settings</div>
            <div style={{ fontSize: 11, color: T.muted }}>Applies to all your conversations</div>
          </div>
        </div>
        <div style={{ height: 1, background: T.cardBorder, margin: "4px 0 8px" }} />

        <div style={{ margin: "0 12px", background: T.ink, borderRadius: 12, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <SettingRow label="Read receipts" sublabel="Let everyone see when you've read their messages" value={settings.readReceipts} onChange={v => update("readReceipts", v)} gated={false} isPro T={T} />
          <div style={{ height: 1, background: T.cardBorder }} />
          <SettingRow label="Show last seen" sublabel="Let everyone see when you were last active" value={settings.showLastSeen} onChange={v => update("showLastSeen", v)} gated={false} isPro T={T} />
          <div style={{ height: 1, background: T.cardBorder }} />
          <SettingRow label="Show online status" sublabel="Let everyone see when you're currently online" value={settings.showOnline} onChange={v => update("showOnline", v)} gated={false} isPro T={T} />
        </div>
      </div>
    </div>
  );
}

// ── Menu sheet (three-dots) ────────────────────────────────────────────────
function MenuSheet({ user, onClose, onViewProfile, onClearHistory, onReport, onBlock, onOpenChatSettings, T }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "88%", maxWidth: 360, background: T.ink, display: "flex", flexDirection: "column", animation: "menuIn .22s cubic-bezier(.16,1,.3,1)" }}>
        <style>{"@keyframes menuIn{from{transform:translateX(100%)}to{transform:translateX(0)}}"}</style>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 16px 8px", background: "none", border: "none", color: T.paper, cursor: "pointer", fontSize: 15 }}>
          <ArrowLeft size={20} /><span style={{ fontWeight: 600 }}>Back</span>
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 24px" }}>
          <Avatar name={user && user.display_name} avatarUrl={user && user.avatar_url} size={72} />
          <div style={{ marginTop: 12, fontWeight: 800, fontSize: 18, color: T.paper }}>{(user && user.display_name) || "User"}</div>
        </div>

        {/* Chat settings with this user */}
        <div style={{ margin: "0 12px 12px", background: T.card, borderRadius: 14, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <button onClick={() => { onOpenChatSettings(); onClose(); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: T.paper, fontSize: 14, fontWeight: 500 }}>Chat Settings</span>
            <Settings size={16} color={T.muted} />
          </button>
        </div>

        <div style={{ margin: "0 12px 12px", background: T.card, borderRadius: 14, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <button onClick={() => {}} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: T.paper, fontSize: 14, fontWeight: 500 }}>Search Chat History</span>
            <Search size={18} color={T.muted} />
          </button>
        </div>

        <div style={{ margin: "0 12px 12px", background: T.card, borderRadius: 14, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <button onClick={() => { onViewProfile(user && user.id); onClose(); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: T.paper, fontSize: 14, fontWeight: 500 }}>View Profile</span>
            <ChevronRight size={18} color={T.muted} />
          </button>
        </div>

        <div style={{ margin: "0 12px 12px", background: T.card, borderRadius: 14, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <button onClick={onClearHistory} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: T.paper, fontSize: 14, fontWeight: 500 }}>Clear Chat History</span>
            <ChevronRight size={18} color={T.muted} />
          </button>
          <div style={{ height: 1, background: T.cardBorder, margin: "0 16px" }} />
          <button onClick={onReport} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: "#C0392B", fontSize: 14, fontWeight: 500 }}>Report User</span>
            <ChevronRight size={18} color={T.muted} />
          </button>
          <div style={{ height: 1, background: T.cardBorder, margin: "0 16px" }} />
          <button onClick={onBlock} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: "#C0392B", fontSize: 14, fontWeight: 500 }}>Block User</span>
            <ChevronRight size={18} color={T.muted} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DMScreen ───────────────────────────────────────────────────────────────
function DMScreen({ account, otherUser, T, onBack, onViewProfile, isPro }) {
  const [messages, setMessages]         = useState([]);
  const [text, setText]                 = useState("");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [showMenu, setShowMenu]         = useState(false);
  const [showMiniSettings, setShowMiniSettings] = useState(false);
  const [sending, setSending]           = useState(false);
  const [otherProfile, setOtherProfile] = useState(otherUser);
  const [chatSettings, setChatSettings] = useState(() => getPerUserSettings(otherUser && otherUser.id));
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const aid = account && account.id;
  const oid = otherUser && otherUser.id;

  const refreshSettings = () => setChatSettings(getPerUserSettings(oid));
  const otherOnline = isOnline(otherProfile && otherProfile.last_seen);

  // Poll other user's last_seen every 30s
  useEffect(() => {
    if (!oid) return;
    supabase.from("public_profiles").select("*").eq("id", oid).single()
      .then(({ data }) => { if (data) setOtherProfile(data); }).catch(() => {});
    const intv = setInterval(() => {
      supabase.from("public_profiles").select("last_seen").eq("id", oid).single()
        .then(({ data }) => { if (data) setOtherProfile(p => ({ ...p, last_seen: data.last_seen })); }).catch(() => {});
    }, 30000);
    return () => clearInterval(intv);
  }, [oid]);

  const load = useCallback(async () => {
    if (!aid || !oid) return;
    try {
      const { data, error: err } = await supabase
        .from("direct_messages").select("*")
        .or(`and(sender_id.eq.${aid},receiver_id.eq.${oid}),and(sender_id.eq.${oid},receiver_id.eq.${aid})`)
        .order("created_at", { ascending: true }).limit(200);
      if (err) { setError(err.message); return; }
      setMessages(data || []);
      const settings = getPerUserSettings(oid);
      if (settings.readReceipts) {
        const unread = (data || []).filter(m => m.receiver_id === aid && !m.is_read);
        if (unread.length) {
          supabase.from("direct_messages")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("receiver_id", aid).eq("sender_id", oid).eq("is_read", false)
            .then(() => {}, () => {});
        }
      }
    } catch (_) { setError("Messages not available yet."); }
    finally { setLoading(false); }
  }, [aid, oid]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!aid || !oid) return;
    const cid = [aid, oid].sort().join("_");
    const ch = supabase.channel("dm_" + cid)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, ({ new: msg }) => {
        const mine   = msg.sender_id === aid && msg.receiver_id === oid;
        const theirs = msg.sender_id === oid && msg.receiver_id === aid;
        if (!mine && !theirs) return;
        setMessages(p => [...p.filter(m => m.id !== msg.id), msg]);
        if (theirs) {
          const s = getPerUserSettings(oid);
          if (s.readReceipts) {
            supabase.from("direct_messages")
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq("id", msg.id).then(() => {}, () => {});
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, ({ new: msg }) => {
        setMessages(p => p.map(m => m.id === msg.id ? msg : m));
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [aid, oid]);

  const send = async () => {
    const content = text.trim();
    if (!content || !aid || !oid || sending) return;
    setSending(true); setText("");
    const optId = "opt_" + Date.now();
    setMessages(p => [...p, { id: optId, sender_id: aid, receiver_id: oid, content, created_at: new Date().toISOString(), is_read: false, _pending: true }]);
    try {
      const { data, error: err } = await supabase.from("direct_messages")
        .insert({ sender_id: aid, receiver_id: oid, content }).select().single();
      if (err) throw err;
      setMessages(p => p.map(m => m.id === optId ? data : m));
    } catch (_) {
      setMessages(p => p.filter(m => m.id !== optId));
      setText(content);
    } finally { setSending(false); if (inputRef.current) inputRef.current.focus(); }
  };

  const clearHistory = async () => {
    setShowMenu(false); setMessages([]);
    await supabase.from("direct_messages").delete()
      .or(`and(sender_id.eq.${aid},receiver_id.eq.${oid}),and(sender_id.eq.${oid},receiver_id.eq.${aid})`)
      .catch(() => {});
  };

  // Build grouped messages with WhatsApp-style date dividers
  const grouped = [];
  let lastDateStr = null;
  messages.forEach(m => {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDateStr) {
      grouped.push({ type: "date", label: dateDividerLabel(m.created_at) });
      lastDateStr = d;
    }
    grouped.push({ type: "msg", msg: m });
  });

  // Header sub-text: online or last seen
  let headerSub = null;
  if (otherOnline) headerSub = "Online";
  else if (otherProfile && otherProfile.last_seen) headerSub = lastSeenLabel(otherProfile.last_seen);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", flexDirection: "column", background: T.ink, fontFamily: "-apple-system,BlinkMacSystemFont,'Inter',sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid " + T.cardBorder, flexShrink: 0, background: T.card }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.paper, cursor: "pointer", padding: 4 }}><ArrowLeft size={22} /></button>
        <button onClick={() => onViewProfile(oid)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ position: "relative" }}>
            <Avatar name={otherProfile && otherProfile.display_name} avatarUrl={otherProfile && otherProfile.avatar_url} size={38} />
            {otherOnline && (
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: "#4CAF50", border: "2px solid " + T.card }} />
            )}
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.paper }}>{(otherProfile && otherProfile.display_name) || "User"}</div>
            {headerSub && (
              <div style={{ fontSize: 11, color: otherOnline ? "#4CAF50" : T.gold }}>{headerSub}</div>
            )}
          </div>
        </button>
        <button onClick={() => setShowMenu(true)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4 }}><MoreVertical size={20} /></button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px 4px", display: "flex", flexDirection: "column", gap: 2 }}>
        {loading && <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 40 }}>Loading messages…</div>}
        {error && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <AlertCircle size={32} color={T.muted} style={{ margin: "0 auto 12px", display: "block" }} />
            <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6 }}>{error}</div>
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 48, lineHeight: 2 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            Say hello to {(otherProfile && otherProfile.display_name) || "them"}!
          </div>
        )}
        {grouped.map((item, i) => {
          if (item.type === "date") {
            return (
              <div key={"d" + i} style={{ textAlign: "center", margin: "10px 0 6px" }}>
                <span style={{ background: T.cardBorder, color: T.paper, fontSize: 11, borderRadius: 20, padding: "3px 12px" }}>{item.label}</span>
              </div>
            );
          }
          const { msg } = item;
          const isMe = msg.sender_id === aid;
          const tickStatus = isMe ? getTickStatus(msg, otherOnline, chatSettings.readReceipts) : null;
          return (
            <div key={msg.id || i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 1, opacity: msg._pending ? 0.65 : 1 }}>
              <div style={{ maxWidth: "78%", background: isMe ? "#C6A15B" : "#1C1913", color: isMe ? "#0F0E0B" : "#F2EDE0", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "8px 12px 6px", fontSize: 14.5, lineHeight: 1.45, boxShadow: "0 1px 3px rgba(0,0,0,0.25)", wordBreak: "break-word" }}>
                <div>{msg.content}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 3 }}>
                  <span style={{ fontSize: 10.5, color: isMe ? "rgba(15,14,11,0.55)" : "#9C947F" }}>{fmt(msg.created_at)}</span>
                  {isMe && <Ticks status={tickStatus} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "8px 10px 12px", display: "flex", alignItems: "center", gap: 8, background: T.card, borderTop: "1px solid " + T.cardBorder }}>
        <input
          ref={inputRef} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message…"
          style={{ flex: 1, background: T.ink, border: "1.5px solid " + T.cardBorder, borderRadius: 24, padding: "10px 16px", color: T.paper, fontSize: 15, outline: "none", fontFamily: "inherit", lineHeight: 1.4 }}
          onFocus={e => { e.target.style.borderColor = "#C6A15B"; }}
          onBlur={e => { e.target.style.borderColor = T.cardBorder; }}
        />
        <button onClick={send} disabled={!text.trim() || sending}
          style={{ width: 44, height: 44, borderRadius: "50%", background: text.trim() ? "#C6A15B" : "#332C1F", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Send size={18} color={text.trim() ? "#0F0E0B" : "#9C947F"} />
        </button>
      </div>

      {showMenu && (
        <MenuSheet
          user={otherProfile} T={T}
          onClose={() => setShowMenu(false)}
          onViewProfile={onViewProfile}
          onClearHistory={clearHistory}
          onReport={() => { setShowMenu(false); alert("Report sent."); }}
          onBlock={() => { setShowMenu(false); alert("User blocked."); }}
          onOpenChatSettings={() => setShowMiniSettings(true)}
        />
      )}
      {showMiniSettings && (
        <MiniChatSettings
          userId={oid}
          userName={(otherProfile && otherProfile.display_name) || "User"}
          isPro={isPro}
          onClose={() => { setShowMiniSettings(false); refreshSettings(); }}
          T={T}
        />
      )}
    </div>
  );
}

// ── ChatList ───────────────────────────────────────────────────────────────
function ChatList({ account, T, onClose, onOpenDM }) {
  const [convos, setConvos] = useState(null);
  const [showGeneralSettings, setShowGeneralSettings] = useState(false);
  const aid = account && account.id;

  useEffect(() => {
    if (!aid) return;
    let ch;
    const load = async () => {
      try {
        const { data, error } = await supabase.from("direct_messages").select("*")
          .or(`sender_id.eq.${aid},receiver_id.eq.${aid}`)
          .order("created_at", { ascending: false }).limit(500);
        if (error || !data) { setConvos([]); return; }
        const seen = new Map(), uc = new Map();
        data.forEach(m => {
          const pid = m.sender_id === aid ? m.receiver_id : m.sender_id;
          if (!seen.has(pid)) seen.set(pid, m);
          if (m.receiver_id === aid && !m.is_read) uc.set(pid, (uc.get(pid) || 0) + 1);
        });
        const ids = [...seen.keys()];
        if (!ids.length) { setConvos([]); return; }
        const { data: profs } = await supabase.from("public_profiles").select("*").in("id", ids);
        const pm = {};
        (profs || []).forEach(p => { pm[p.id] = p; });
        setConvos([...seen.entries()].map(([id, msg]) => ({ profile: pm[id], lastMsg: msg, unread: uc.get(id) || 0 })));
      } catch (_) { setConvos([]); }
    };
    load();
    ch = supabase.channel("dml_" + aid)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => load())
      .subscribe();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [aid]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", flexDirection: "column", background: T.ink, fontFamily: "-apple-system,BlinkMacSystemFont,'Inter',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + T.cardBorder, background: T.card }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.paper, cursor: "pointer", padding: 4 }}><X size={22} /></button>
        <div style={{ fontWeight: 800, fontSize: 17, color: T.paper, flex: 1 }}>Messages</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {convos === null && <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 40 }}>Loading…</div>}
        {convos !== null && convos.length === 0 && (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 48, lineHeight: 2 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            No messages yet.<br />Tap someone&#39;s profile to start a chat.
          </div>
        )}
        {(convos || []).map(({ profile, lastMsg, unread }) => (
          <button key={(profile && profile.id) || lastMsg.id} onClick={() => onOpenDM(profile)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid " + T.cardBorder }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <Avatar name={profile && profile.display_name} avatarUrl={profile && profile.avatar_url} size={46} />
                {isOnline(profile && profile.last_seen) && (
                  <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#4CAF50", border: "2px solid " + T.ink }} />
                )}
              </div>
              {unread > 0 && (
                <div style={{ position: "absolute", top: -2, right: -2, background: "#C6A15B", color: "#0F0E0B", borderRadius: "50%", minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, padding: "0 4px" }}>{unread}</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.paper, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(profile && profile.display_name) || "Unknown"}
                </div>
                <div style={{ fontSize: 11, color: unread > 0 ? "#C6A15B" : T.muted, flexShrink: 0, marginLeft: 8 }}>{timeAgo(lastMsg.created_at)}</div>
              </div>
              <div style={{ fontSize: 13, color: unread > 0 ? T.paper : T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: unread > 0 ? 600 : 400 }}>
                {lastMsg.sender_id === aid ? "You: " : ""}{lastMsg.content}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* General settings button pinned at bottom */}
      <div style={{ borderTop: "1px solid " + T.cardBorder, background: T.card, padding: "10px 16px 14px" }}>
        <button onClick={() => setShowGeneralSettings(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: "1px solid " + T.cardBorder, borderRadius: 12, padding: "11px 0", color: T.muted, cursor: "pointer" }}>
          <Settings size={16} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>General Chat Settings</span>
        </button>
      </div>

      {showGeneralSettings && <GeneralChatSettings onClose={() => setShowGeneralSettings(false)} T={T} />}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function CommunityChat({ account, themeTokens, onClose, onViewProfile, initialUser, isPro }) {
  initialUser = initialUser || null;
  const T = buildT(themeTokens);
  const [screen, setScreen] = useState(initialUser ? "dm" : "list");
  const [dmUser, setDmUser] = useState(initialUser);
  const openDM = (user) => { setDmUser(user); setScreen("dm"); };
  if (screen === "dm" && dmUser) {
    return (
      <DMScreen
        account={account} otherUser={dmUser} T={T} isPro={isPro || false}
        onBack={() => { if (initialUser) { onClose(); } else { setScreen("list"); } }}
        onViewProfile={uid => { onClose(); onViewProfile(uid); }}
      />
    );
  }
  return <ChatList account={account} T={T} onClose={onClose} onOpenDM={openDM} />;
}
