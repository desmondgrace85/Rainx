import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { T, FONT_HEAD } from "./shared";

const signalConfidence = (sig) => Math.round(Number(sig?.confidence) || 0);

const formatPrice = (value) => {
  if (value == null || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number >= 100 ? number.toFixed(2) : number.toFixed(5);
};

function SignalCard({ sig }) {
  const confidence = signalConfidence(sig);
  const isBuy = sig.direction === "BUY";
  const DirectionIcon = isBuy ? TrendingUp : TrendingDown;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: `${T.gold}18`, color: T.goldBright, flexShrink: 0 }}><DirectionIcon size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 15.5, color: T.paper }}>{sig.asset || "—"}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{sig.timeframe || "5m"} timeframe</div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12.5, color: T.paper, border: `1px solid ${T.cardBorder}`, borderRadius: 6, padding: "3px 7px" }}>{sig.direction}</div>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13, color: T.goldBright, marginTop: 5 }}>{confidence}%</div>
        </div>
      </div>
      <div style={{ height: 4, background: `${T.muted}25`, borderRadius: 99, overflow: "hidden", margin: "13px 0 14px" }}>
        <div style={{ width: `${Math.min(100, Math.max(0, confidence))}%`, height: "100%", background: T.goldGradient, borderRadius: 99, transition: "all 0.2s" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8 }}>
        <div><div style={{ fontSize: 11.5, color: T.muted, marginBottom: 3 }}>Entry</div><div style={{ fontSize: 13, color: T.paper, fontWeight: 600 }}>{sig.entry_zone ? `${formatPrice(sig.entry_zone[0])}–${formatPrice(sig.entry_zone[1])}` : formatPrice(sig.entry)}</div></div>
        <div><div style={{ fontSize: 11.5, color: T.muted, marginBottom: 3 }}>SL</div><div style={{ fontSize: 13, color: T.paper, fontWeight: 600 }}>{formatPrice(sig.stop_loss)}</div></div>
        <div><div style={{ fontSize: 11.5, color: T.muted, marginBottom: 3 }}>TP1</div><div style={{ fontSize: 13, color: T.paper, fontWeight: 600 }}>{formatPrice(sig.take_profit?.[0] ?? sig.take_profit)}</div></div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 13, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}`, fontSize: 12, color: T.muted }}>
        <span>RR {sig.risk_reward_ratio != null ? `${sig.risk_reward_ratio}:1` : "—"}</span>
        <span>Risk {sig.risk_level || "—"}</span>
      </div>
    </div>
  );
}

export default SignalCard;
