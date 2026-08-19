/**
 * CommunityChat.jsx — Telegram/WhatsApp-style DM for RainX
 * v2 — pin messages, long-press context menu, edit/delete-for-everyone,
 *       forward messages, PDF export, confirmation dialogs, edge-swipe back,
 *       premium-gated last-seen/online controls, pin conversations (max 3).
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, MoreVertical, Send, X, ChevronRight,
  Search, AlertCircle, Check, Settings, Lock, Pin,
  Edit2, Trash2, Share, Copy, FileText, ChevronDown,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import chatWallpaper from "./assets/chat-wallpaper.jpg";
const BASE_URL = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
const API_BASE = "https://rainx-webapp.vercel.app";
const PRESENCE_EVENT = "RAINX_PRESENCE";

function postRainxPresence(presence) {
  try {
    localStorage.setItem("rainx_presence", JSON.stringify({ ...presence, updatedAt: Date.now() }));
  } catch {}
  try {
    if ("serviceWorker" in navigator) {
      const message = { type: PRESENCE_EVENT, ...presence };
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message);
      } else {
        navigator.serviceWorker.ready.then(reg => reg.active?.postMessage(message)).catch(() => {});
      }
    }
  } catch {}
}

// Short WhatsApp-style "sent" tick sound, synthesized (no audio file needed)
function playSendTick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => ctx.close();
  } catch {}
}

const buildT = (tokens) => ({
  ink: "#0F0E0B", card: "#1C1913", cardBorder: "#332C1F",
  gold: "#F4D35E", goldBright: "#F4D35E", paper: "#F2EDE0", muted: "#9C947F",
  goldGradient: "linear-gradient(135deg, #F4D35E 0%, #F4D35E 50%, #F4D35E 100%)",
  goldShine: "linear-gradient(180deg, #F4D35E 0%, #F4D35E 48%, #F4D35E 100%)",
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

const DELETED_SENTINEL = "__msg_deleted__";
function isDeleted(content) { return content === DELETED_SENTINEL || content === null; }

// ── localStorage helpers ───────────────────────────────────────────────────
const SETTINGS_KEY = "rainx_chat_settings_v1";
const PINNED_CHATS_KEY = "rainx_pinned_chats_v1";
function loadSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; } }
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {} }
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
function getPinnedChats() { try { return JSON.parse(localStorage.getItem(PINNED_CHATS_KEY) || "[]"); } catch { return []; } }
function savePinnedChats(arr) { try { localStorage.setItem(PINNED_CHATS_KEY, JSON.stringify(arr.slice(0, 3))); } catch {} }
function getPinnedMessages(convId) { try { return JSON.parse(localStorage.getItem("rainx_pins_" + convId) || "[]"); } catch { return []; } }
function savePinnedMessages(convId, arr) { try { localStorage.setItem("rainx_pins_" + convId, JSON.stringify(arr)); } catch {} }

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size, T }) {
  size = size || 40;
  const bg = (T && T.goldGradient) || "linear-gradient(135deg,#F4D35E 0%,#F4D35E 50%,#F4D35E 100%)";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.38, color: "#0F0E0B", flexShrink: 0, overflow: "hidden" }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (name || "?")[0].toUpperCase()}
    </div>
  );
}

// ── Ticks ──────────────────────────────────────────────────────────────────
// sent=1 black tick, delivered=2 black ticks, read=2 blue ticks
function Ticks({ status }) {
  if (status === "read") {
    // two blue ticks — recipient has actually opened and read the message
    return (
      <span style={{ display: "inline-flex", alignItems: "center", color: "#34B7F1" }}>
        <Check size={10} strokeWidth={3.5} />
        <Check size={10} strokeWidth={3.5} style={{ marginLeft: -6 }} />
      </span>
    );
  }
  if (status === "delivered") {
    // two black ticks, same color as "sent" — recipient is online/has the app, but hasn't opened this chat yet
    return (
      <span style={{ display: "inline-flex", alignItems: "center", color: "#111111" }}>
        <Check size={10} strokeWidth={3.5} />
        <Check size={10} strokeWidth={3.5} style={{ marginLeft: -6 }} />
      </span>
    );
  }
  // sent: one black tick — recipient offline / hasn't received it yet
  return <Check size={10} strokeWidth={3.5} color="#111111" />;
}

function getTickStatus(msg, otherOnline, readReceiptsEnabled) {
  if (msg._pending) return "sent";
  if (readReceiptsEnabled && msg.is_read) return "read";
  if (otherOnline || msg.is_read) return "delivered";
  return "sent";
}

// ── ConfirmDialog ──────────────────────────────────────────────────────────
function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel, T }) {
  const goldGrad = (T && T.goldGradient) || "linear-gradient(135deg,#F4D35E 0%,#F4D35E 50%,#F4D35E 100%)";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1C1913", border: "1px solid #332C1F", borderRadius: 18, padding: "26px 22px 22px", width: "100%", maxWidth: 360 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#F2EDE0", marginBottom: 10 }}>{title}</div>
        {body && <div style={{ fontSize: 13, color: "#9C947F", lineHeight: 1.65, marginBottom: 22 }}>{body}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: "#332C1F", border: "none", borderRadius: 12, padding: "13px 0", color: "#F2EDE0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: danger ? "#B0604A" : goldGrad, border: "none", borderRadius: 12, padding: "13px 0", color: danger ? "#fff" : "#0F0E0B", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{confirmLabel || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

// ── ProGateModal ───────────────────────────────────────────────────────────
function ProGateModal({ onClose, T }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 600, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", padding: "28px 20px 44px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 800, fontSize: 17, color: T.paper, marginBottom: 8 }}>Premium Feature</div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.65, marginBottom: 24 }}>
          This feature is available to <strong style={{ color: T.gold }}>Subscribers</strong> and <strong style={{ color: T.gold }}>Premium</strong> users.<br />
          You can see it but not use it. Upgrade your plan to unlock it.
        </div>
        <button onClick={onClose} style={{ width: "100%", background: T.goldGradient, color: T.ink, border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Got it</button>
      </div>
    </div>
  );
}

// ── SettingRow ─────────────────────────────────────────────────────────────
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
        <div style={{ width: 46, height: 27, borderRadius: 14, background: value ? T.goldGradient : T.cardBorder, position: "relative", transition: "background 0.2s", flexShrink: 0, opacity: gated && !isPro ? 0.5 : 1 }}>
          <div style={{ position: "absolute", top: 3, left: value ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
        </div>
      </div>
    </>
  );
}

// ── MessageContextMenu (long-press popup) ─────────────────────────────────
function MessageContextMenu({ msg, isMe, isPro, onPin, onEdit, onDelete, onDeleteForEveryone, onForward, onCopy, onClose, T }) {
  const actions = [
    { icon: Pin,    label: "Pin",                  action: onPin,               show: true,  premium: false, danger: false },
    { icon: Copy,   label: "Copy",                 action: onCopy,              show: true,  premium: false, danger: false },
    { icon: Share,  label: "Forward",              action: onForward,           show: true,  premium: false, danger: false },
    { icon: Edit2,  label: "Edit",                 action: onEdit,              show: isMe,  premium: true,  danger: false },
    { icon: Trash2, label: "Delete",               action: onDelete,            show: isMe,  premium: false, danger: true  },
    { icon: Trash2, label: "Delete for Everyone",  action: onDeleteForEveryone, show: isMe,  premium: true,  danger: true  },
  ].filter(a => a.show);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", paddingBottom: 32 }}>
        <div style={{ width: 36, height: 4, background: T.cardBorder, borderRadius: 2, margin: "12px auto 16px" }} />
        {actions.map((a, i) => (
          <React.Fragment key={a.label}>
            {i > 0 && <div style={{ height: 1, background: T.cardBorder, margin: "0 16px" }} />}
            <button
              onClick={() => { onClose(); a.action(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "none", border: "none", cursor: "pointer" }}
            >
              <a.icon size={19} color={a.danger ? "#B0604A" : a.premium && !isPro ? T.gold : T.paper} />
              <span style={{ fontSize: 15, color: a.danger ? "#B0604A" : T.paper, fontWeight: 500, flex: 1, textAlign: "left" }}>{a.label}</span>
              {a.premium && !isPro && <Lock size={13} color={T.gold} />}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── ForwardModal ───────────────────────────────────────────────────────────
function ForwardModal({ account, senderName, onForward, onClose, T }) {
  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hideSender, setHideSender] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const aid = account && account.id;
    if (!aid) return;
    (async () => {
      const { data } = await supabase.from("direct_messages").select("sender_id, receiver_id").or(`sender_id.eq.${aid},receiver_id.eq.${aid}`).limit(500);
      const seen = new Set();
      (data || []).forEach(m => { const pid = m.sender_id === aid ? m.receiver_id : m.sender_id; seen.add(pid); });
      const ids = [...seen];
      if (!ids.length) { setConvos([]); setLoading(false); return; }
      const { data: profs } = await supabase.from("public_profiles").select("id, username, display_name, avatar_url").in("id", ids);
      setConvos(profs || []);
      setLoading(false);
    })();
  }, [account]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 550, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", maxHeight: "82vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 12px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={20} /></button>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.paper }}>Forward Message</div>
        </div>

        {/* Hide sender toggle */}
        <div style={{ margin: "0 14px 12px", padding: "11px 14px", background: T.ink, borderRadius: 12, border: "1px solid " + T.cardBorder, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: T.paper, fontSize: 13, fontWeight: 600 }}>Hide my name</div>
            <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>Recipient won't see who forwarded it</div>
          </div>
          <div onClick={() => setHideSender(v => !v)} style={{ width: 46, height: 27, borderRadius: 14, background: hideSender ? T.goldGradient : T.cardBorder, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 3, left: hideSender ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
          {loading && <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 24 }}>Loading conversations…</div>}
          {!loading && convos.length === 0 && <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 24 }}>No conversations to forward to.</div>}
          {convos.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 0", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid " + T.cardBorder }}>
              <Avatar name={p.display_name} avatarUrl={p.avatar_url} size={40} T={T} />
              <div style={{ flex: 1, textAlign: "left", fontSize: 14, color: T.paper, fontWeight: 500 }}>{p.display_name || p.username || "User"}</div>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid " + (selected && selected.id === p.id ? T.gold : T.cardBorder), background: selected && selected.id === p.id ? T.goldGradient : "transparent", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {selected && selected.id === p.id && <Check size={12} color="#0F0E0B" strokeWidth={3} />}
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 16px 32px" }}>
          <button onClick={() => { if (selected) onForward(selected, hideSender); }} disabled={!selected}
            style={{ width: "100%", background: selected ? T.goldGradient : T.cardBorder, color: selected ? T.ink : T.muted, border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 800, fontSize: 15, cursor: selected ? "pointer" : "default" }}>
            {selected ? "Forward to " + (selected.display_name || "User") : "Select a recipient"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PinnedBar ──────────────────────────────────────────────────────────────
function PinnedBar({ pins, onViewPins, T }) {
  if (!pins || !pins.length) return null;
  const latest = pins[pins.length - 1];
  return (
    <div style={{ background: "rgba(244,211,94,0.1)", borderBottom: "1px solid rgba(244,211,94,0.2)", padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }} onClick={onViewPins}>
      <Pin size={13} color={T.gold} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: T.gold, fontWeight: 700, marginBottom: 1 }}>
          Pinned Message{pins.length > 1 ? "s (" + pins.length + ")" : ""}
        </div>
        <div style={{ fontSize: 12, color: "#F2EDE0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isDeleted(latest.content) ? "This message was deleted" : latest.content}
        </div>
      </div>
      <ChevronDown size={14} color="#9C947F" />
    </div>
  );
}

// ── PinnedMessagesView ─────────────────────────────────────────────────────
function PinnedMessagesView({ pins, onUnpin, onClose, T }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 500, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", maxHeight: "72vh", display: "flex", flexDirection: "column", paddingBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 12px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={20} /></button>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.paper }}>Pinned Messages</div>
        </div>
        <div style={{ height: 1, background: T.cardBorder }} />
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
          {(!pins || !pins.length) && <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 32 }}>No pinned messages.</div>}
          {[...(pins || [])].reverse().map((pin, i) => (
            <div key={pin.id + "_" + i} style={{ padding: "13px 0", borderBottom: "1px solid " + T.cardBorder, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Pin size={14} color={T.gold} style={{ marginTop: 3, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, marginBottom: 4 }}>{pin.senderName || "User"}</div>
                <div style={{ fontSize: 13, color: T.paper, lineHeight: 1.55 }}>
                  {isDeleted(pin.content) ? <span style={{ fontStyle: "italic", opacity: 0.6 }}>This message was deleted</span> : pin.content}
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{fmt(pin.created_at)}</div>
              </div>
              <button onClick={() => onUnpin(pin.id)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MiniChatSettings ───────────────────────────────────────────────────────
function MiniChatSettings({ userId, userName, isPro, onClose, T }) {
  const [settings, setSettings] = useState(() => getPerUserSettings(userId));
  const update = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setPerUserSettings(userId, { [key]: val });
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 450 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", paddingBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 8px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={20} /></button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.paper }}>Chat settings · {userName}</div>
            <div style={{ fontSize: 11, color: T.muted }}>Only applies to this conversation</div>
          </div>
        </div>
        <div style={{ height: 1, background: T.cardBorder, margin: "4px 0 8px" }} />
        <div style={{ margin: "0 12px", background: T.ink, borderRadius: 12, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <SettingRow label="Read receipts" sublabel="Let this user see when you've read their messages" value={settings.readReceipts} onChange={v => update("readReceipts", v)} gated isPro={isPro} T={T} />
          <div style={{ height: 1, background: T.cardBorder }} />
          <SettingRow label="Show last seen" sublabel="Let this user see your last active time" value={settings.showLastSeen} onChange={v => update("showLastSeen", v)} gated isPro={isPro} T={T} />
          <div style={{ height: 1, background: T.cardBorder }} />
          <SettingRow label="Show online status" sublabel="Let this user see when you're currently online" value={settings.showOnline} onChange={v => update("showOnline", v)} gated isPro={isPro} T={T} />
        </div>
        {!isPro && (
          <div style={{ margin: "12px 12px 0", background: "rgba(244,211,94,0.08)", border: "1px solid rgba(244,211,94,0.22)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={14} color={T.gold} />
            <span style={{ fontSize: 12, color: T.muted }}>Upgrade to <strong style={{ color: T.gold }}>Subscriber</strong> or <strong style={{ color: T.gold }}>Premium</strong> to enable per-chat privacy controls.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── GeneralChatSettings ────────────────────────────────────────────────────
function GeneralChatSettings({ account, isPro, onClose, T }) {
  const [settings, setSettings] = useState(() => getGeneralSettings());
  const update = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setGeneralSettings({ [key]: val });
  };

  const exportAllChats = async () => {
    const aid = account && account.id;
    if (!aid) return;
    const { data } = await supabase.from("direct_messages").select("*")
      .or(`sender_id.eq.${aid},receiver_id.eq.${aid}`)
      .order("created_at", { ascending: true }).limit(10000).catch(() => ({ data: null }));
    if (!data || !data.length) { alert("No messages to export."); return; }
    const lines = data.map(m => {
      const who = m.sender_id === aid ? "Me" : "Other";
      const body = isDeleted(m.content) ? "[deleted]" : (m.content || "");
      return `[${new Date(m.created_at).toLocaleString()}] ${who}: ${body}`;
    });
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups to export."); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>RainX All Chats Export</title><style>body{font-family:monospace;font-size:13px;padding:24px;white-space:pre-wrap;line-height:1.7;color:#111;}h2{font-size:15px;margin-bottom:16px;}</style></head><body><h2>RainX Chat Export — All Conversations</h2>${lines.map(l => l.replace(/&/g,"&amp;").replace(/</g,"&lt;")).join("\n")}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 450 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: T.card, borderRadius: "20px 20px 0 0", paddingBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 8px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={20} /></button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.paper }}>General Chat Settings</div>
            <div style={{ fontSize: 11, color: T.muted }}>Applies to all your conversations</div>
          </div>
        </div>
        <div style={{ height: 1, background: T.cardBorder, margin: "4px 0 8px" }} />

        <div style={{ margin: "0 12px 12px", background: T.ink, borderRadius: 12, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <SettingRow label="Read receipts" sublabel="Let everyone see when you've read their messages" value={settings.readReceipts} onChange={v => update("readReceipts", v)} gated={false} isPro T={T} />
          <div style={{ height: 1, background: T.cardBorder }} />
          <SettingRow label="Last seen" sublabel="Show everyone when you were last active" value={settings.showLastSeen} onChange={v => update("showLastSeen", v)} gated isPro={isPro} T={T} />
          <div style={{ height: 1, background: T.cardBorder }} />
          <SettingRow label="Online status" sublabel="Show everyone when you're currently online" value={settings.showOnline} onChange={v => update("showOnline", v)} gated isPro={isPro} T={T} />
        </div>

        {!isPro && (
          <div style={{ margin: "0 12px 12px", background: "rgba(244,211,94,0.08)", border: "1px solid rgba(244,211,94,0.22)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={14} color={T.gold} />
            <span style={{ fontSize: 12, color: T.muted }}>Last seen &amp; online status controls require <strong style={{ color: T.gold }}>Subscriber</strong> or <strong style={{ color: T.gold }}>Premium</strong>.</span>
          </div>
        )}

        {/* Export */}
        <div style={{ margin: "0 12px", background: T.ink, borderRadius: 12, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <button onClick={exportAllChats} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <FileText size={18} color={T.gold} />
            <div style={{ textAlign: "left" }}>
              <div style={{ color: T.paper, fontSize: 14, fontWeight: 500 }}>Export All Chats as PDF</div>
              <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>Print or save all your conversations</div>
            </div>
            <ChevronRight size={16} color={T.muted} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MenuSheet ──────────────────────────────────────────────────────────────
function MenuSheet({ user, onClose, onViewProfile, onClearHistory, onReport, onBlock, onOpenChatSettings, onPinChat, isPinnedChat, onExportChat, T }) {
  const [confirm, setConfirm] = useState(null);

  if (confirm) {
    return (
      <ConfirmDialog
        title={confirm.title} body={confirm.body}
        confirmLabel={confirm.label} danger={confirm.danger}
        onConfirm={() => { confirm.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
        T={T}
      />
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "88%", maxWidth: 360, background: T.ink, display: "flex", flexDirection: "column", animation: "menuIn .22s cubic-bezier(.16,1,.3,1)" }}>
        <style>{"@keyframes menuIn{from{transform:translateX(100%)}to{transform:translateX(0)}}"}</style>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 16px 8px", background: "none", border: "none", color: T.paper, cursor: "pointer", fontSize: 15 }}>
          <ArrowLeft size={20} /><span style={{ fontWeight: 600 }}>Back</span>
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 24px" }}>
          <Avatar name={user && user.display_name} avatarUrl={user && user.avatar_url} size={72} T={T} />
          <div style={{ marginTop: 12, fontWeight: 800, fontSize: 18, color: T.paper }}>{(user && user.display_name) || "User"}</div>
        </div>

        <div style={{ margin: "0 12px 12px", background: T.card, borderRadius: 14, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <button onClick={() => { onViewProfile(user && user.id); onClose(); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: T.paper, fontSize: 14, fontWeight: 500 }}>View Profile</span>
            <ChevronRight size={18} color={T.muted} />
          </button>
          <div style={{ height: 1, background: T.cardBorder }} />
          <button onClick={onOpenChatSettings} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: T.paper, fontSize: 14, fontWeight: 500 }}>Chat Settings</span>
            <ChevronRight size={18} color={T.muted} />
          </button>
          <div style={{ height: 1, background: T.cardBorder }} />
          <button onClick={() => { onClose(); onPinChat(); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: T.paper, fontSize: 14, fontWeight: 500 }}>{isPinnedChat ? "Unpin Chat" : "Pin Chat"}</span>
            <Pin size={15} color={T.muted} />
          </button>
          <div style={{ height: 1, background: T.cardBorder }} />
          <button onClick={() => { onClose(); onExportChat(); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: T.paper, fontSize: 14, fontWeight: 500 }}>Export Chat as PDF</span>
            <FileText size={15} color={T.muted} />
          </button>
        </div>

        <div style={{ margin: "0 12px", background: T.card, borderRadius: 14, overflow: "hidden", border: "1px solid " + T.cardBorder }}>
          <button
            onClick={() => setConfirm({ title: "Clear Chat History?", body: "This will permanently delete all messages in this conversation. This cannot be undone.", label: "Clear", danger: true, action: () => { onClose(); onClearHistory(); } })}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: "#C0392B", fontSize: 14, fontWeight: 500 }}>Clear Chat History</span>
            <ChevronRight size={18} color={T.muted} />
          </button>
          <div style={{ height: 1, background: T.cardBorder, margin: "0 16px" }} />
          <button
            onClick={() => setConfirm({ title: "Report User?", body: "Are you sure you want to report this user? Our moderation team will review the report.", label: "Report", danger: true, action: onReport })}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: "#C0392B", fontSize: 14, fontWeight: 500 }}>Report User</span>
            <ChevronRight size={18} color={T.muted} />
          </button>
          <div style={{ height: 1, background: T.cardBorder, margin: "0 16px" }} />
          <button
            onClick={() => setConfirm({ title: "Block User?", body: "This will prevent them from sending you messages. You can unblock them from your account settings anytime.", label: "Block", danger: true, action: onBlock })}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ color: "#C0392B", fontSize: 14, fontWeight: 500 }}>Block User</span>
            <ChevronRight size={18} color={T.muted} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EditBar ────────────────────────────────────────────────────────────────
function EditBar({ editText, setEditText, onSave, onCancel, T }) {
  return (
    <div style={{ padding: "8px 12px 10px", background: T.card, borderTop: "1px solid " + T.cardBorder, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: T.gold, fontWeight: 700, marginBottom: 4 }}>✏️ Editing message</div>
        <input
          autoFocus value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
          style={{ width: "100%", background: T.ink, border: "1px solid " + T.cardBorder, borderRadius: 10, padding: "8px 12px", color: T.paper, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
        />
      </div>
      <button onClick={onCancel} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 6 }}><X size={18} /></button>
      <button onClick={onSave} style={{ background: T.goldGradient, border: "none", borderRadius: 10, padding: "8px 14px", color: T.ink, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Save</button>
    </div>
  );
}

// ── DMScreen ───────────────────────────────────────────────────────────────
function DMScreen({ account, otherUser, T, onBack, onViewProfile, onUnreadCleared, isPro }) {
  const [messages, setMessages]             = useState([]);
  const [text, setText]                     = useState("");
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [showMenu, setShowMenu]             = useState(false);
  const [showMiniSettings, setShowMiniSettings] = useState(false);
  const [sending, setSending]               = useState(false);
  const [otherProfile, setOtherProfile]     = useState(otherUser);
  const [chatSettings, setChatSettings]     = useState(() => getPerUserSettings(otherUser && otherUser.id));
  const [contextMenu, setContextMenu]       = useState(null);   // { msg }
  const [editingMsg, setEditingMsg]         = useState(null);
  const [editText, setEditText]             = useState("");
  const [forwardMsg, setForwardMsg]         = useState(null);
  const [pinnedMessages, setPinnedMsgs]     = useState([]);
  const [showPinnedView, setShowPinnedView] = useState(false);
  const [showProGate, setShowProGate]       = useState(false);
  const [confirm, setConfirm]               = useState(null);

  const bottomRef     = useRef(null);
  const inputRef      = useRef(null);
  const longPressTimer = useRef(null);
  const edgeStart     = useRef(null);
  const initialScrollDone = useRef(false);
  const previousMessageCount = useRef(0);
  const typingSendChannel = useRef(null);
  const typingStopTimer = useRef(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [messageAccess, setMessageAccess] = useState({ loading: true, allowed: true, reason: "" });
  const [globalChatPrefs, setGlobalChatPrefs] = useState({ readReceipts:true });

  const aid    = account && account.id;
  const oid    = otherUser && otherUser.id;
  const convId = aid && oid ? [aid, oid].sort().join("_") : null;

  // Keep the active conversation visible to the service worker so a message
  // being read on this screen never also becomes a phone alert.
  useEffect(() => {
    if (!aid || !oid) return undefined;
    const announce = () => postRainxPresence({
      accountId: aid,
      visible: document.visibilityState === "visible",
      activeChatUserId: oid,
    });
    announce();
    document.addEventListener("visibilitychange", announce);
    window.addEventListener("pageshow", announce);
    return () => {
      document.removeEventListener("visibilitychange", announce);
      window.removeEventListener("pageshow", announce);
      postRainxPresence({
        accountId: aid,
        visible: document.visibilityState === "visible",
        activeChatUserId: null,
      });
    };
  }, [aid, oid]);

  // Load pinned messages
  useEffect(() => { if (convId) setPinnedMsgs(getPinnedMessages(convId)); }, [convId]);

  const refreshSettings = () => {
    setChatSettings(getPerUserSettings(oid));
    if (aid) supabase.from("account_settings").select("settings").eq("user_id", aid).maybeSingle().then(({data})=>setGlobalChatPrefs({ readReceipts:true, ...(data?.settings || {}) })).catch(()=>{});
  };
  useEffect(() => {
    if (!aid) return;
    supabase.from("account_settings").select("settings").eq("user_id", aid).maybeSingle().then(({data})=>setGlobalChatPrefs({ readReceipts:true, ...(data?.settings || {}) })).catch(()=>{});
  }, [aid]);
  const otherOnline     = isOnline(otherProfile && otherProfile.last_seen);

  // Poll other user's last_seen
  useEffect(() => {
    if (!oid) return;
    supabase.from("public_profiles").select("*").eq("id", oid).single().then(({ data }) => { if (data) setOtherProfile(data); }).catch(() => {});
    const intv = setInterval(() => {
      supabase.from("public_profiles").select("last_seen").eq("id", oid).single().then(({ data }) => { if (data) setOtherProfile(p => ({ ...p, last_seen: data.last_seen })); }).catch(() => {});
    }, 30000);
    return () => clearInterval(intv);
  }, [oid]);

  const load = useCallback(async () => {
    if (!aid || !oid) return;
    try {
      const { data, error: err } = await supabase.from("direct_messages").select("*")
        .or(`and(sender_id.eq.${aid},receiver_id.eq.${oid}),and(sender_id.eq.${oid},receiver_id.eq.${aid})`)
        .order("created_at", { ascending: true }).limit(200);
      if (err) { setError(err.message); return; }
      setMessages(prev => {
        const pending = (prev || []).filter(m => m._pending);
        const merged = [...(data || [])];
        pending.forEach(m => { if (!merged.some(x => x.id === m.id || (x.content === m.content && x.sender_id === m.sender_id && m._pending))) merged.push(m); });
        return merged.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
      });
      const unread = (data || []).filter(m => m.receiver_id === aid && !m.is_read);
      if (unread.length) {
        onUnreadCleared?.(unread.length);
        supabase.from("direct_messages").update({ is_read: true, read_at: new Date().toISOString() })
          .eq("receiver_id", aid).eq("sender_id", oid).eq("is_read", false).then(() => {}, () => {});
      }
    } catch (_) { setError("Messages not available yet."); }
    finally { setLoading(false); }
  }, [aid, oid]);

  useEffect(() => {
    load();
    // Realtime is the primary delivery path. This slower reconciliation is only
    // a safety net and never replaces an optimistic pending message.
    const refreshTimer = setInterval(load, 15000);
    return () => clearInterval(refreshTimer);
  }, [load]);
  useEffect(() => {
    if (!bottomRef.current || loading) return;
    if (!initialScrollDone.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
      previousMessageCount.current = messages.length;
      initialScrollDone.current = true;
      return;
    }
    if (messages.length > previousMessageCount.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
    previousMessageCount.current = messages.length;
  }, [messages, loading]);

  // Real-time
  useEffect(() => {
    if (!aid || !oid) return;
    const cid = [aid, oid].sort().join("_");
    let disposed = false;
    let reconnectTimer = null;
    let ch = null;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!disposed) {
          if (ch) supabase.removeChannel(ch);
          subscribe();
        }
      }, 1500);
    };

    const subscribe = () => {
      ch = supabase.channel("dm_" + cid)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, ({ new: msg }) => {
          const mine   = msg.sender_id === aid && msg.receiver_id === oid;
          const theirs = msg.sender_id === oid && msg.receiver_id === aid;
          if (!mine && !theirs) return;
          setMessages(p => [...p.filter(m => m.id !== msg.id), msg].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
          if (theirs) {
            if (!msg.is_read) onUnreadCleared?.(1);
            if (globalChatPrefs.readReceipts !== false) supabase.from("direct_messages").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", msg.id).then(() => {}, () => {});
          }
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, ({ new: msg }) => {
          const mine = msg.sender_id === aid && msg.receiver_id === oid;
          const theirs = msg.sender_id === oid && msg.receiver_id === aid;
          if (!mine && !theirs) return;
          setMessages(p => p.map(m => m.id === msg.id ? msg : m));
        })
        .subscribe(status => {
          if (status === "SUBSCRIBED") load();
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") scheduleReconnect();
        });
    };

    subscribe();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ch) supabase.removeChannel(ch);
    };
  }, [aid, oid, globalChatPrefs.readReceipts]);

  // Typing is broadcast to the recipient's user channel so their open chat and
  // general messages list can show it without requiring a chat-specific channel.
  useEffect(() => {
    if (!aid || !oid) return;
    let disposed = false;
    let receiveChannel = null;
    let sendChannel = null;
    let reconnectTimer = null;

    const handleTyping = ({ payload }) => {
      if (!payload || payload.sender_id !== oid || payload.receiver_id !== aid) return;
      setOtherTyping(!!payload.is_typing);
    };
    const handleMessage = ({ payload }) => {
      const msg = payload && payload.message;
      if (!msg || msg.sender_id !== oid || msg.receiver_id !== aid) return;
      setMessages(p => [...p.filter(m => m.id !== msg.id), msg]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      if (globalChatPrefs.readReceipts !== false) {
        supabase.from("direct_messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("id", msg.id)
          .then(() => {}, () => {});
      }
    };
    const subscribe = () => {
      receiveChannel = supabase.channel("typing_" + aid)
        .on("broadcast", { event: "typing" }, handleTyping)
        .on("broadcast", { event: "message" }, handleMessage)
        .subscribe(status => {
          if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") && !disposed && !reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              if (!disposed) {
                if (receiveChannel) supabase.removeChannel(receiveChannel);
                subscribe();
              }
            }, 1500);
          }
        });
      sendChannel = supabase.channel("typing_" + oid).subscribe();
      typingSendChannel.current = sendChannel;
    };
    subscribe();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (typingSendChannel.current) {
        typingSendChannel.current.send({
          type: "broadcast",
          event: "typing",
          payload: { sender_id: aid, receiver_id: oid, is_typing: false },
        }).catch(() => {});
      }
      typingSendChannel.current = null;
      if (receiveChannel) supabase.removeChannel(receiveChannel);
      if (sendChannel) supabase.removeChannel(sendChannel);
    };
  }, [aid, oid]);

  useEffect(() => {
    if (!typingSendChannel.current || !aid || !oid) return;
    const isTyping = !!text.trim();
    typingSendChannel.current.send({
      type: "broadcast",
      event: "typing",
      payload: { sender_id: aid, receiver_id: oid, is_typing: isTyping },
    }).catch(() => {});
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    if (isTyping) {
      typingStopTimer.current = setTimeout(() => {
        typingSendChannel.current?.send({
          type: "broadcast",
          event: "typing",
          payload: { sender_id: aid, receiver_id: oid, is_typing: false },
        }).catch(() => {});
      }, 2000);
    }
    return () => {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    };
  }, [text, aid, oid]);

  useEffect(() => {
    if (!aid || !oid || aid === oid) { setMessageAccess({ loading:false, allowed:false, reason:"Invalid conversation." }); return; }
    let cancelled = false;
    (async () => {
      try {
        const [{ data: targetSettings }, { data: blocked }, { data: following }, { data: follower }] = await Promise.all([
          supabase.from("account_settings").select("settings").eq("user_id", oid).maybeSingle(),
          supabase.from("user_blocks").select("blocked_id").eq("blocker_id", oid).eq("blocked_id", aid).maybeSingle(),
          supabase.from("follows").select("followed_id").eq("follower_id", aid).eq("followed_id", oid).maybeSingle(),
          supabase.from("follows").select("follower_id").eq("follower_id", oid).eq("followed_id", aid).maybeSingle(),
        ]);
        if (cancelled) return;
        if (blocked) { setMessageAccess({ loading:false, allowed:false, reason:"This user has blocked messages from your account." }); return; }
        const prefs = targetSettings?.settings || {};
        const who = prefs.messageWhoKey || "followers";
        const mutual = !!following || !!follower;
        const allowed = who === "everyone" || (who === "followers" && mutual) || (who === "nobody" ? false : !!prefs.messageRequests);
        setMessageAccess({ loading:false, allowed, reason: allowed ? "" : who === "nobody" ? "This user does not accept messages." : "This user only accepts messages from followers/people they follow." });
      } catch (_) {
        if (!cancelled) setMessageAccess({ loading:false, allowed:true, reason:"" });
      }
    })();
    return () => { cancelled = true; };
  }, [aid, oid, globalChatPrefs.readReceipts]);

  // Send
  const send = async () => {
    const content = text.trim();
    if (!content || !aid || !oid || sending) return;
    if (messageAccess.loading) return;
    if (!messageAccess.allowed) { alert(messageAccess.reason || "Messaging is restricted for this account."); return; }
    setSending(true); setText("");
    const optId = "opt_" + Date.now();
    setMessages(p => [...p, { id: optId, sender_id: aid, receiver_id: oid, content, created_at: new Date().toISOString(), is_read: false, _pending: true }]);
    try {
      const { data, error: err } = await supabase.from("direct_messages").insert({ sender_id: aid, receiver_id: oid, content }).select().single();
      if (err) throw err;
      setMessages(p => p.map(m => m.id === optId ? data : m));
      typingSendChannel.current?.send({
        type: "broadcast",
        event: "message",
        payload: { message: data },
      }).catch(() => {});
      playSendTick();
      // Send one push for every successfully persisted message. Use the
      // receiver_id returned by Supabase so the push cannot drift from the
      // actual recipient if the conversation state changes.
      const receiverId = data?.receiver_id || oid;
      if (data?.receiver_id && data.receiver_id !== oid) {
        console.error("[CommunityChat] message receiver mismatch", {
          expectedReceiverId: oid,
          actualReceiverId: data.receiver_id,
          messageId: data.id,
        });
        return;
      }
      try {
        const pushResponse = await fetch(`${API_BASE}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: receiverId,
            title: "New Message",
            body: content.slice(0, 120),
            data: {
              kind: "chat",
              category: "chat",
              conversationId: convId,
              senderId: aid,
              messageId: data.id,
              targetKind: "chat",
              tag: "rainx-message",
              group: "rainx-messages",
              url: `/?rainxTarget=chat&userId=${encodeURIComponent(aid)}&conversationId=${encodeURIComponent(convId || "")}`,
            },
          }),
        });
        if (!pushResponse.ok) {
          const detail = await pushResponse.text().catch(() => "");
          throw new Error(`Push request failed (${pushResponse.status})${detail ? `: ${detail}` : ""}`);
        }
      } catch (pushError) {
        // The message is already saved; report push failures instead of
        // silently hiding them or pretending the message was not sent.
        console.error("[CommunityChat] message push failed", {
          receiverId,
          messageId: data.id,
          error: pushError,
        });
      }
    } catch (_) { setMessages(p => p.filter(m => m.id !== optId)); setText(content); }
    finally { setSending(false); if (inputRef.current) inputRef.current.focus(); }
  };

  const clearHistory = async () => {
    setMessages([]);
    await supabase.from("direct_messages").delete()
      .or(`and(sender_id.eq.${aid},receiver_id.eq.${oid}),and(sender_id.eq.${oid},receiver_id.eq.${aid})`)
      .catch(() => {});
  };

  // Message actions
  const pinMessage = (msg) => {
    const senderName = msg.sender_id === aid ? "You" : (otherProfile && (otherProfile.display_name || otherProfile.username)) || "Other";
    const pin = { id: msg.id, content: msg.content, sender_id: msg.sender_id, created_at: msg.created_at, senderName };
    const existing = getPinnedMessages(convId);
    if (existing.find(p => p.id === msg.id)) return;
    const updated = [...existing, pin];
    savePinnedMessages(convId, updated);
    setPinnedMsgs(updated);
  };

  const unpinMessage = (msgId) => {
    const updated = getPinnedMessages(convId).filter(p => p.id !== msgId);
    savePinnedMessages(convId, updated);
    setPinnedMsgs(updated);
  };

  const startEdit = (msg) => { setEditingMsg(msg); setEditText(msg.content || ""); };

  const saveEdit = async () => {
    if (!editingMsg || !editText.trim()) return;
    const newContent = editText.trim();
    setMessages(p => p.map(m => m.id === editingMsg.id ? { ...m, content: newContent, is_edited: true } : m));
    const savedMsg = editingMsg;
    setEditingMsg(null); setEditText("");
    // Try with is_edited column, fallback to content only
    const { error } = await supabase.from("direct_messages")
      .update({ content: newContent, is_edited: true, edited_at: new Date().toISOString() })
      .eq("id", savedMsg.id).eq("sender_id", aid);
    if (error) {
      await supabase.from("direct_messages").update({ content: newContent }).eq("id", savedMsg.id).eq("sender_id", aid).catch(() => {});
    }
  };

  const deleteMessage = async (msg) => {
    setMessages(p => p.filter(m => m.id !== msg.id));
    await supabase.from("direct_messages").delete().eq("id", msg.id).eq("sender_id", aid).catch(() => {});
  };

  const deleteForEveryone = async (msg) => {
    setMessages(p => p.map(m => m.id === msg.id ? { ...m, content: DELETED_SENTINEL, deleted_for_everyone: true } : m));
    const { error } = await supabase.from("direct_messages")
      .update({ content: DELETED_SENTINEL, deleted_for_everyone: true })
      .eq("id", msg.id).eq("sender_id", aid);
    if (error) {
      await supabase.from("direct_messages").update({ content: DELETED_SENTINEL }).eq("id", msg.id).eq("sender_id", aid).catch(() => {});
    }
  };

  const doForward = async (recipient, hideSender) => {
    if (!forwardMsg || !recipient) return;
    const originalSender = forwardMsg.sender_id === aid ? "You" : (otherProfile && (otherProfile.display_name || otherProfile.username)) || "Someone";
    if (isDeleted(forwardMsg.content)) return;
    const prefix = hideSender ? "↗ Forwarded\n" : `↗ Forwarded from ${originalSender}\n`;
    const fwdContent = prefix + (forwardMsg.content || "");
    setForwardMsg(null);
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: aid, receiver_id: recipient.id, content: fwdContent,
      is_forwarded: true, forwarded_from_name: hideSender ? null : originalSender,
    });
    if (error) {
      await supabase.from("direct_messages").insert({ sender_id: aid, receiver_id: recipient.id, content: fwdContent }).catch(() => {});
    }
  };

  const copyMessage = (msg) => {
    if (!isDeleted(msg.content)) navigator.clipboard.writeText(msg.content || "").catch(() => {});
  };

  const exportChatPDF = () => {
    const otherName = (otherProfile && (otherProfile.display_name || otherProfile.username)) || "User";
    const lines = messages.map(m => {
      const who = m.sender_id === aid ? "Me" : otherName;
      const body = isDeleted(m.content) ? "[deleted]" : (m.content || "");
      return `[${new Date(m.created_at).toLocaleString()}] ${who}: ${body}`;
    });
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups to export."); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Chat with ${otherName}</title><style>body{font-family:monospace;font-size:13px;padding:24px;white-space:pre-wrap;line-height:1.7;}h2{font-size:15px;margin-bottom:14px;}</style></head><body><h2>Chat with ${otherName}</h2>${lines.map(l => l.replace(/&/g,"&amp;").replace(/</g,"&lt;")).join("\n")}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // Long press
  const startLongPress = (msg) => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(30);
      setContextMenu({ msg });
    }, 480);
  };
  const cancelLongPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  // Edge swipe back
  const onTouchStart = (e) => {
    edgeStart.current = e.touches[0].clientX < 34 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  };
  const onTouchEnd = (e) => {
    if (!edgeStart.current) return;
    const dx = e.changedTouches[0].clientX - edgeStart.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - edgeStart.current.y);
    edgeStart.current = null;
    if (dx > 72 && dy < 80) onBack();
  };

  // Pin/unpin this conversation
  const isPinnedChat = getPinnedChats().includes(oid);
  const togglePinChat = () => {
    const cur = getPinnedChats();
    if (cur.includes(oid)) { savePinnedChats(cur.filter(id => id !== oid)); }
    else { if (cur.length >= 3) { alert("You can pin up to 3 chats. Unpin one first."); return; } savePinnedChats([...cur, oid]); }
  };

  // Build grouped messages with date dividers
  const grouped = [];
  let lastDateStr = null;
  messages.forEach(m => {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDateStr) { grouped.push({ type: "date", label: dateDividerLabel(m.created_at) }); lastDateStr = d; }
    grouped.push({ type: "msg", msg: m });
  });

  let headerSub = null;
  if (otherOnline) headerSub = "Online";
  else if (otherProfile && otherProfile.last_seen) headerSub = lastSeenLabel(otherProfile.last_seen);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", flexDirection: "column", background: T.ink, fontFamily: "-apple-system,BlinkMacSystemFont,'Inter',sans-serif" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid " + T.cardBorder, flexShrink: 0, background: T.card }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.paper, cursor: "pointer", padding: 4 }}><ArrowLeft size={22} /></button>
        <button onClick={() => onViewProfile(oid)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ position: "relative" }}>
            <Avatar name={otherProfile && otherProfile.display_name} avatarUrl={otherProfile && otherProfile.avatar_url} size={38} T={T} />
            {otherOnline && <div style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: "#4CAF50", border: "2px solid " + T.card }} />}
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.paper }}>{(otherProfile && (otherProfile.display_name || otherProfile.username)) || "User"}</div>
            {(otherTyping || headerSub) && <div style={{ fontSize: 11, color: otherTyping ? T.goldBright : (otherOnline ? "#4CAF50" : T.gold) }}>{otherTyping ? "typing…" : headerSub}</div>}
          </div>
        </button>
        <button onClick={() => setShowMenu(true)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4 }}><MoreVertical size={20} /></button>
      </div>

      {/* Pinned messages bar */}
      <PinnedBar pins={pinnedMessages} onViewPins={() => setShowPinnedView(true)} T={T} />

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px 10px 4px", display: "flex", flexDirection: "column", gap: 2,
        backgroundColor: "#F4F0E8", backgroundImage: `linear-gradient(rgba(244,240,232,0.16), rgba(244,240,232,0.16)), url(${chatWallpaper})`, backgroundRepeat: "repeat",
        backgroundSize: "432px 768px", backgroundPosition: "top center",
      }}>
        {loading && <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 40 }}>Loading messages…</div>}
        {error && <div style={{ textAlign: "center", padding: "32px 16px" }}><AlertCircle size={32} color={T.muted} style={{ margin: "0 auto 12px", display: "block" }} /><div style={{ color: T.muted, fontSize: 13 }}>{error}</div></div>}
        {!loading && !error && messages.length === 0 && (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 48, lineHeight: 2 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            Say hello to {(otherProfile && (otherProfile.display_name || otherProfile.username)) || "them"}!
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
          const isMe     = msg.sender_id === aid;
          const tickStatus = isMe ? getTickStatus(msg, otherOnline, chatSettings.readReceipts) : null;
          const deleted  = isDeleted(msg.content) || !!msg.deleted_for_everyone;
          const isEdited = !deleted && (!!msg.is_edited);
          const isForwarded = !!msg.is_forwarded || (!deleted && msg.content && msg.content.startsWith("↗ Forwarded"));
          let displayContent = msg.content || "";
          let forwardedFrom  = msg.forwarded_from_name || null;
          if (isForwarded && !deleted) {
            const nl = displayContent.indexOf("\n");
            if (nl !== -1) {
              const firstLine = displayContent.slice(0, nl);
              displayContent  = displayContent.slice(nl + 1);
              if (!forwardedFrom && firstLine.startsWith("↗ Forwarded from ")) forwardedFrom = firstLine.replace("↗ Forwarded from ", "");
            }
          }

          return (
            <div key={msg.id || i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 1, opacity: msg._pending ? 0.65 : 1 }}>
              <div
                onPointerDown={() => !deleted && startLongPress(msg)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onContextMenu={e => { e.preventDefault(); if (!deleted) setContextMenu({ msg }); }}
                style={{
                  maxWidth: "78%",
                  background: isMe ? T.goldGradient : "#FFFFFF",
                  color: isMe ? "#111111" : "#111111",
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "8px 12px 6px",
                  fontSize: 14.5,
                  lineHeight: 1.45,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                  wordBreak: "break-word",
                  userSelect: "none",
                  cursor: deleted ? "default" : "pointer",
                  touchAction: "manipulation",
                }}
              >
                {isForwarded && !deleted && (
                  <div style={{ fontSize: 10, color: isMe ? "rgba(15,14,11,0.65)" : T.gold, fontWeight: 700, marginBottom: 5, borderLeft: "2px solid " + (isMe ? "rgba(15,14,11,0.4)" : T.gold), paddingLeft: 6 }}>
                    ↗ Forwarded{forwardedFrom ? " from " + forwardedFrom : ""}
                  </div>
                )}
                {deleted
                  ? <div style={{ fontStyle: "italic", opacity: 0.58, fontSize: 13.5 }}>This message was deleted</div>
                  : <div>{displayContent}</div>
                }
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 3 }}>
                  {isEdited && <span style={{ fontSize: 9.5, opacity: 0.5, fontStyle: "italic" }}>edited</span>}
                  <span style={{ fontSize: 10.5, color: isMe ? "rgba(15,14,11,0.55)" : "#9C947F" }}>{fmt(msg.created_at)}</span>
                  {isMe && <Ticks status={tickStatus} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* Edit bar OR Input bar */}
      {editingMsg ? (
        <EditBar
          editText={editText} setEditText={setEditText}
          onSave={saveEdit}
          onCancel={() => { setEditingMsg(null); setEditText(""); }}
          T={T}
        />
      ) : (
        <div style={{ padding: "8px 10px 12px", display: "flex", alignItems: "center", gap: 8, background: T.card, borderTop: "1px solid " + T.cardBorder }}>
          <input
            ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={messageAccess.loading ? "Checking messaging privacy…" : messageAccess.allowed ? "Message…" : "Messaging is restricted"}
            style={{ flex: 1, background: T.ink, border: "1.5px solid " + T.cardBorder, borderRadius: 24, padding: "10px 16px", color: T.paper, fontSize: 15, outline: "none", fontFamily: "inherit", lineHeight: 1.4 }}
            onFocus={e => { e.target.style.borderColor = T.gold; }}
            onBlur={e => { e.target.style.borderColor = T.cardBorder; }}
          />
          <button onClick={send} disabled={!text.trim() || sending || messageAccess.loading || !messageAccess.allowed}
            style={{ width: 44, height: 44, borderRadius: "50%", background: text.trim() && messageAccess.allowed ? T.goldGradient : "#332C1F", border: "none", cursor: text.trim() && messageAccess.allowed ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send size={18} color={text.trim() && messageAccess.allowed ? "#0F0E0B" : "#9C947F"} />
          </button>
        </div>
      )}

      {/* Context menu (long press) */}
      {contextMenu && (
        <MessageContextMenu
          msg={contextMenu.msg}
          isMe={contextMenu.msg.sender_id === aid}
          isPro={isPro}
          onClose={() => setContextMenu(null)}
          onPin={() => pinMessage(contextMenu.msg)}
          onEdit={() => { if (!isPro) { setShowProGate(true); return; } startEdit(contextMenu.msg); }}
          onDelete={() => setConfirm({ title: "Delete Message?", body: "This will remove the message from your view. The other person may still see it.", label: "Delete", danger: true, action: () => deleteMessage(contextMenu.msg) })}
          onDeleteForEveryone={() => { if (!isPro) { setShowProGate(true); return; } setConfirm({ title: "Delete for Everyone?", body: "This will permanently remove this message for both of you. This cannot be undone.", label: "Delete for Everyone", danger: true, action: () => deleteForEveryone(contextMenu.msg) }); }}
          onForward={() => setForwardMsg(contextMenu.msg)}
          onCopy={() => copyMessage(contextMenu.msg)}
          T={T}
        />
      )}

      {/* Pinned messages viewer */}
      {showPinnedView && (
        <PinnedMessagesView
          pins={pinnedMessages}
          onUnpin={unpinMessage}
          onClose={() => setShowPinnedView(false)}
          T={T}
        />
      )}

      {/* Forward modal */}
      {forwardMsg && (
        <ForwardModal
          account={account}
          senderName={forwardMsg.sender_id === aid ? "You" : (otherProfile && (otherProfile.display_name || otherProfile.username)) || "User"}
          onForward={doForward}
          onClose={() => setForwardMsg(null)}
          T={T}
        />
      )}

      {/* Three-dot menu */}
      {showMenu && (
        <MenuSheet
          user={otherProfile} T={T}
          onClose={() => setShowMenu(false)}
          onViewProfile={onViewProfile}
          onClearHistory={() => setConfirm({ title: "Clear Chat History?", body: "This will permanently delete all messages in this conversation. This cannot be undone.", label: "Clear", danger: true, action: clearHistory })}
          onReport={async () => {
            await supabase.from("activity_logs").insert({ user_id: aid, action: "report_user", meta: { reported_user_id: oid, source: "chat" } }).catch(() => {});
            setShowMenu(false);
            alert("Report submitted. Our team can review it.");
          }}
          onBlock={async () => {
            const { error } = await supabase.from("user_blocks").upsert({ blocker_id: aid, blocked_id: oid });
            setShowMenu(false);
            if (!error) alert("User blocked. You can manage blocked accounts from Privacy & Data.");
          }}
          onOpenChatSettings={() => { setShowMenu(false); setShowMiniSettings(true); }}
          onPinChat={togglePinChat}
          isPinnedChat={isPinnedChat}
          onExportChat={exportChatPDF}
        />
      )}

      {showMiniSettings && (
        <MiniChatSettings
          userId={oid}
          userName={(otherProfile && (otherProfile.display_name || otherProfile.username)) || "User"}
          isPro={isPro}
          onClose={() => { setShowMiniSettings(false); refreshSettings(); }}
          T={T}
        />
      )}

      {showProGate && <ProGateModal onClose={() => setShowProGate(false)} T={T} />}

      {confirm && (
        <ConfirmDialog
          title={confirm.title} body={confirm.body}
          confirmLabel={confirm.label} danger={confirm.danger}
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
          T={T}
        />
      )}
    </div>
  );
}

// ── ChatList ───────────────────────────────────────────────────────────────
function ChatList({ account, T, onClose, onOpenDM, isPro }) {
  const [convos, setConvos]               = useState(null);
  const [showGeneralSettings, setShowGeneralSettings] = useState(false);
  const [pinnedChats, setPinnedChatsState] = useState(() => getPinnedChats());
  const [typingUsers, setTypingUsers]     = useState({});
  const conversationsLoadRef              = useRef(null);
  const aid = account && account.id;

  const refreshPins = () => setPinnedChatsState(getPinnedChats());

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
        const all = [...seen.entries()].map(([id, msg]) => ({ profile: pm[id], lastMsg: msg, unread: uc.get(id) || 0 }));
        // Pinned first
        const pinned = getPinnedChats();
        all.sort((a, b) => {
          const ap = pinned.includes(a.profile && a.profile.id);
          const bp = pinned.includes(b.profile && b.profile.id);
          if (ap && !bp) return -1;
          if (!ap && bp) return 1;
          return 0;
        });
        setConvos(all);
      } catch (_) { setConvos([]); }
    };
    conversationsLoadRef.current = load;
    load();
    const refreshTimer = setInterval(load, 2500);
    ch = supabase.channel("dml_" + aid)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => load())
      .subscribe();
    return () => {
      clearInterval(refreshTimer);
      conversationsLoadRef.current = null;
      if (ch) supabase.removeChannel(ch);
    };
  }, [aid]);

  useEffect(() => {
    if (!aid) return;
    let disposed = false;
    let ch = null;
    let reconnectTimer = null;
    const typingTimers = new Map();

    const clearTyping = (senderId) => {
      setTypingUsers(prev => {
        if (!prev[senderId]) return prev;
        const next = { ...prev };
        delete next[senderId];
        return next;
      });
      const timer = typingTimers.get(senderId);
      if (timer) clearTimeout(timer);
      typingTimers.delete(senderId);
    };
    const handleTyping = ({ payload }) => {
      if (!payload || payload.receiver_id !== aid || !payload.sender_id) return;
      const senderId = payload.sender_id;
      if (!payload.is_typing) {
        clearTyping(senderId);
        return;
      }
      setTypingUsers(prev => ({ ...prev, [senderId]: true }));
      const previousTimer = typingTimers.get(senderId);
      if (previousTimer) clearTimeout(previousTimer);
      typingTimers.set(senderId, setTimeout(() => clearTyping(senderId), 2200));
    };
    const handleMessage = ({ payload }) => {
      const msg = payload && payload.message;
      if (!msg || (msg.sender_id !== aid && msg.receiver_id !== aid)) return;
      const pid = msg.sender_id === aid ? msg.receiver_id : msg.sender_id;
      setConvos(prev => {
        if (!prev) return prev;
        const existing = prev.find(row => row.profile && row.profile.id === pid);
        if (!existing) return prev;
        const next = prev.map(row => {
          if (!row.profile || row.profile.id !== pid) return row;
          return {
            ...row,
            lastMsg: msg,
            unread: msg.receiver_id === aid ? row.unread + 1 : row.unread,
          };
        });
        const pinned = getPinnedChats();
        return next.sort((a, b) => {
          const ap = pinned.includes(a.profile && a.profile.id);
          const bp = pinned.includes(b.profile && b.profile.id);
          if (ap && !bp) return -1;
          if (!ap && bp) return 1;
          return new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at);
        });
      });
      conversationsLoadRef.current?.();
    };
    const subscribe = () => {
      ch = supabase.channel("typing_" + aid)
        .on("broadcast", { event: "typing" }, handleTyping)
        .on("broadcast", { event: "message" }, handleMessage)
        .subscribe(status => {
          if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") && !disposed && !reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              if (!disposed) {
                if (ch) supabase.removeChannel(ch);
                subscribe();
              }
            }, 1500);
          }
        });
    };
    subscribe();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      typingTimers.forEach(timer => clearTimeout(timer));
      if (ch) supabase.removeChannel(ch);
    };
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
        {(convos || []).map(({ profile, lastMsg, unread }) => {
          const pid       = profile && profile.id;
          const isPinned  = pinnedChats.includes(pid);
          const lastContent = lastMsg && lastMsg.content;
          const lastDisplay = isDeleted(lastContent) ? "This message was deleted" : (lastContent || "");
          return (
            <button key={pid || lastMsg.id} onClick={() => {
              // Clear this conversation's badge immediately; don't wait for
              // the next poll or a page refresh.
              setConvos(prev => (prev || []).map(row =>
                row.profile?.id === pid ? { ...row, unread: 0 } : row
              ));
              refreshPins();
              onOpenDM(profile);
            }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: isPinned ? "rgba(244,211,94,0.06)" : "none", border: "none", cursor: "pointer", borderBottom: "1px solid " + T.cardBorder }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar name={profile && profile.display_name} avatarUrl={profile && profile.avatar_url} size={46} T={T} />
                {isOnline(profile && profile.last_seen) && (
                  <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#4CAF50", border: "2px solid " + T.ink }} />
                )}
                {unread > 0 && (
                  <div style={{ position: "absolute", top: -2, right: -2, background: T.goldGradient, color: "#0F0E0B", borderRadius: "50%", minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, padding: "0 4px" }}>{unread}</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }} data-chatlist-row>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: T.paper, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                      {(profile && profile.display_name) || "Unknown"}
                    </span>
                      {typingUsers[pid] && <span style={{ fontSize: 11, color: T.goldBright, fontWeight: 600 }}>typing…</span>}
                    {isPinned && <Pin size={11} color={T.gold} />}
                  </div>
                  <div style={{ fontSize: 11, color: unread > 0 ? T.gold : T.muted, flexShrink: 0, marginLeft: 8 }}>{timeAgo(lastMsg.created_at)}</div>
                </div>
                <div style={{ fontSize: 13, color: unread > 0 ? T.paper : T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: unread > 0 ? 600 : 400 }}>
                  {lastMsg.sender_id === aid ? "You: " : ""}{lastDisplay}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ borderTop: "1px solid " + T.cardBorder, background: T.card, padding: "10px 16px 14px" }}>
        <button onClick={() => setShowGeneralSettings(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: "1px solid " + T.cardBorder, borderRadius: 12, padding: "11px 0", color: T.muted, cursor: "pointer" }}>
          <Settings size={16} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>General Chat Settings</span>
        </button>
      </div>

      {showGeneralSettings && (
        <GeneralChatSettings
          account={account} isPro={isPro || false}
          onClose={() => setShowGeneralSettings(false)}
          T={T}
        />
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function CommunityChat({ account, themeTokens, onClose, onViewProfile, onUnreadCleared, initialUser, isPro }) {
  initialUser = initialUser || null;
  const T = buildT(themeTokens);
  const [screen, setScreen] = useState(initialUser ? "dm" : "list");
  const [dmUser, setDmUser] = useState(initialUser);
  const openDM = (user) => { setDmUser(user); setScreen("dm"); };
  if (screen === "dm" && dmUser) {
    return (
      <DMScreen
        account={account} otherUser={dmUser} T={T} isPro={isPro || false}
        onUnreadCleared={onUnreadCleared}
        onBack={() => { if (initialUser) { onClose(); } else { setScreen("list"); } }}
        onViewProfile={uid => { onClose(); onViewProfile(uid); }}
      />
    );
  }
  return <ChatList account={account} T={T} onClose={onClose} onOpenDM={openDM} isPro={isPro || false} />;
}
