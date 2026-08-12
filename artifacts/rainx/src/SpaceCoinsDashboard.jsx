import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight, BarChart3, ChevronRight, Coins, Rocket, Sparkles,
  TrendingUp, WalletCards,
} from "lucide-react";
import planetReference from "./assets/space-coins-planet-3d.png";

function useEdgeBack(onBack) {
  const swipeRef = useRef(null);
  return {
    onTouchStart: (event) => {
      const x = event.touches[0].clientX;
      swipeRef.current = x < 28 ? { x, y: event.touches[0].clientY } : null;
    },
    onTouchEnd: (event) => {
      if (!swipeRef.current) return;
      const dx = event.changedTouches[0].clientX - swipeRef.current.x;
      const dy = Math.abs(event.changedTouches[0].clientY - swipeRef.current.y);
      swipeRef.current = null;
      if (dx > 45 && dy < 100) onBack();
    },
  };
}

const COINS = [
  { name: "Galaxy Doge", ticker: "GDOGE", price: "$0.000245", change: "+23.14%", tone: "gold", icon: "D" },
  { name: "Moon Cat", ticker: "MCAT", price: "$0.000182", change: "+12.08%", tone: "blue", icon: "M" },
  { name: "Planet Pepe", ticker: "PPEPE", price: "$0.000092", change: "+8.19%", tone: "green", icon: "P" },
];

function PlanetScene({ T }) {
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const dragRef = useRef(null);

  useEffect(() => {
    let frameId;
    let previous = performance.now();
    const animate = (now) => {
      const elapsed = now - previous;
      previous = now;
      if (!dragRef.current) {
        rotationRef.current = (rotationRef.current + elapsed * 0.012) % 360;
        setRotation(rotationRef.current);
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startRotation: rotationRef.current };
  };
  const onPointerMove = (event) => {
    if (!dragRef.current) return;
    rotationRef.current = dragRef.current.startRotation + (event.clientX - dragRef.current.startX) * 0.55;
    setRotation(rotationRef.current);
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <button
      type="button"
      className="sc-planet-scene"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label="Drag to rotate the planet"
    >
      <span className="sc-planet-motion" style={{ transform: `rotate(${rotation}deg)` }}>
        <span className="sc-planet-glow" style={{ background: `radial-gradient(circle, ${T.gold}5c, transparent 68%)` }} />
        <span className="sc-planet-orbit sc-planet-orbit-back" style={{ borderColor: `${T.goldBright}99` }} />
        <img className="sc-planet-reference" src={planetReference} alt="" />
        <span className="sc-planet-orbit sc-planet-orbit-front" style={{ borderColor: `${T.goldBright}aa` }} />
        <span className="sc-planet-orbit-dot sc-planet-orbit-dot-one" style={{ background: T.goldBright }} />
        <span className="sc-planet-orbit-dot sc-planet-orbit-dot-two" style={{ background: T.gold }} />
      </span>
    </button>
  );
}

function CoinMark({ coin, T }) {
  const fills = {
    gold: `linear-gradient(135deg, ${T.goldBright}, ${T.gold})`,
    blue: "linear-gradient(135deg, #9eb9c7, #486c7f)",
    green: "linear-gradient(135deg, #a7bc79, #52704e)",
    rose: "linear-gradient(135deg, #dba19b, #7d4d50)",
  };
  return <span className="sc-coin-mark" style={{ background: fills[coin.tone], color: T.ink }}>{coin.icon}</span>;
}

export default function SpaceCoinsDashboard({ T, onBack }) {
  const [toast, setToast] = useState("");
  const edgeBack = useEdgeBack(onBack);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  useEffect(() => {
    document.title = "Space Coins | RainX";
    return () => { document.title = "RainX"; };
  }, []);

  return (
    <main className="sc-screen sc-dashboard-screen" style={{ background: T.ink, color: T.paper }} {...edgeBack}>
      <style>{`
        .sc-dashboard-screen { animation:sc-dashboard-enter .42s cubic-bezier(.22,.75,.2,1) both; }
        .sc-dashboard-shell { width:min(100%,480px); min-height:100%; margin:0 auto; padding:14px 8px 32px; }
        .sc-dashboard-top { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .sc-dashboard-top .sc-back { flex:0 0 auto; }
        .sc-dashboard-heading { flex:1; font-size:17px; font-weight:800; letter-spacing:-.04em; }
        .sc-dashboard-mark { width:28px; height:28px; display:grid; place-items:center; border-radius:50%; color:var(--sc-ink); background:linear-gradient(135deg,var(--sc-gold-bright),var(--sc-gold)); box-shadow:0 4px 10px var(--sc-gold-shadow); }
        .sc-bell { width:36px; height:36px; display:grid; place-items:center; border:1px solid var(--sc-border); border-radius:12px; background:var(--sc-card); color:var(--sc-paper); }
        .sc-create-card { position:relative; min-height:136px; overflow:hidden; border:1px solid var(--sc-gold-border); border-radius:18px; padding:17px 14px; background:linear-gradient(115deg, var(--sc-card), var(--sc-card-warm)); }
        .sc-create-copy { position:relative; z-index:2; width:64%; }
        .sc-create-title { margin:0; font-size:13px; line-height:1.25; font-weight:800; white-space:nowrap; }
        .sc-create-sub { margin:7px 0 0; color:var(--sc-muted); font-size:10px; line-height:1.45; }
        .sc-create-button { display:flex; align-items:center; gap:10px; margin-top:14px; border:1px solid var(--sc-gold); border-radius:8px; padding:8px 9px 8px 11px; color:var(--sc-gold-bright); background:var(--sc-card); font:700 10px 'Montserrat',sans-serif; cursor:pointer; }
        .sc-create-button span { display:grid; place-items:center; width:21px; height:21px; margin:-4px -5px -4px 1px; border-radius:6px; color:var(--sc-ink); background:var(--sc-gold); }
        .sc-planet-scene { position:absolute; z-index:1; right:-3px; top:0; width:188px; height:136px; border:0; padding:0; background:transparent; cursor:grab; touch-action:none; }
        .sc-planet-scene:active { cursor:grabbing; }
        .sc-planet-motion { position:absolute; inset:0; transform-origin:50% 50%; }
        .sc-planet-reference { position:absolute; z-index:2; left:50%; top:14px; width:104px; height:104px; object-fit:contain; transform:translateX(-50%); filter:drop-shadow(0 9px 11px rgba(198,161,91,.22)); pointer-events:none; }
        .sc-planet-glow { position:absolute; z-index:1; left:50%; top:16px; width:108px; height:108px; transform:translateX(-50%); border-radius:50%; filter:blur(8px); pointer-events:none; }
        .sc-planet-orbit { position:absolute; z-index:3; left:50%; top:45px; width:154px; height:49px; border:2px solid; border-left-color:transparent !important; border-right-color:transparent !important; border-radius:50%; transform:translateX(-50%) rotate(-14deg); box-shadow:0 0 8px var(--sc-gold-shadow); pointer-events:none; }
        .sc-planet-orbit-back { opacity:.78; }
        .sc-planet-orbit-front { top:47px; clip-path:polygon(0 48%,100% 48%,100% 100%,0 100%); }
        .sc-planet-orbit-dot { position:absolute; z-index:4; width:5px; height:5px; border-radius:50%; box-shadow:0 0 8px 2px var(--sc-gold-shadow); pointer-events:none; }
        .sc-planet-orbit-dot-one { top:29px; left:40px; }
        .sc-planet-orbit-dot-two { right:28px; top:85px; }
        .sc-quick-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin:15px 0 23px; }
        .sc-quick { min-width:0; display:flex; flex-direction:column; align-items:center; gap:7px; padding:11px 2px 9px; color:var(--sc-paper); background:var(--sc-card); border:1px solid var(--sc-border); border-radius:13px; font:600 8px 'Montserrat',sans-serif; cursor:pointer; }
        .sc-quick-icon { display:grid; place-items:center; width:27px; height:27px; border-radius:9px; color:var(--sc-gold-bright); background:var(--sc-gold-soft); }
        .sc-section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:9px; }
        .sc-section-title { font-size:14px; font-weight:800; letter-spacing:-.02em; }
        .sc-view-all { border:0; padding:4px 0; color:var(--sc-gold-bright); background:transparent; font:700 10px 'Montserrat',sans-serif; cursor:pointer; }
         .sc-coin-list { overflow:hidden; margin-bottom:24px; border:1px solid var(--sc-border); border-radius:14px; background:var(--sc-card); }
         .sc-coin-row { width:100%; display:flex; align-items:center; gap:9px; padding:11px 10px; border:0; border-bottom:1px solid var(--sc-border); background:transparent; color:inherit; text-align:left; cursor:pointer; }
        .sc-coin-row:last-child { border-bottom:0; }
        .sc-coin-row:active, .sc-quick:active, .sc-create-button:active { transform:scale(.98); }
         .sc-coin-mark { display:grid; place-items:center; width:32px; height:32px; flex-shrink:0; border-radius:50%; font-size:15px; box-shadow:inset -5px -4px 0 rgba(0,0,0,.15); }
        .sc-coin-name { min-width:0; flex:1; }
        .sc-coin-name strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; font-weight:800; }
        .sc-coin-name small { display:block; margin-top:4px; color:var(--sc-muted); font-size:9px; font-weight:600; }
        .sc-coin-value { text-align:right; }
        .sc-coin-price { font-size:11px; font-weight:800; }
        .sc-coin-change { margin-top:4px; color:var(--sc-sage); font-size:9px; font-weight:700; }
        .sc-coin-change.is-negative { color:var(--sc-rust); }
        .sc-trending { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding-bottom:10px; }
        .sc-trend-chip { display:flex; align-items:center; gap:6px; min-width:0; padding:12px 9px; border:1px solid var(--sc-border); border-radius:12px; background:var(--sc-card); color:var(--sc-paper); cursor:pointer; }
        .sc-trend-rank { color:var(--sc-gold-bright); font-size:10px; font-weight:800; }
        .sc-trend-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; font-weight:700; }
        .sc-toast { position:fixed; z-index:5; left:50%; bottom:25px; transform:translateX(-50%); padding:11px 15px; border:1px solid var(--sc-gold-border); border-radius:999px; color:var(--sc-paper); background:var(--sc-card); box-shadow:0 8px 25px rgba(0,0,0,.28); font-size:11px; font-weight:700; white-space:nowrap; animation:sc-toast-in .2s ease-out; }
         @keyframes sc-dashboard-enter { from { opacity:0; transform:translate3d(100%,0,0); } to { opacity:1; transform:translate3d(0,0,0); } }
        @keyframes sc-toast-in { from { opacity:0; transform:translate(-50%,10px); } }
        @media (max-width:340px) { .sc-create-copy { width:62%; } .sc-planet-scene { right:-32px; } .sc-quick { font-size:8px; } }
        @media (prefers-reduced-motion:reduce) { .sc-screen *, .sc-screen { animation:none !important; transition:none !important; } }
      `}</style>
      <div
        className="sc-dashboard-shell"
        style={{
          "--sc-ink": T.ink,
          "--sc-card": T.card,
          "--sc-card-warm": T.ink === "#FFFFFF" ? "#fff2d3" : `${T.gold}12`,
          "--sc-border": T.cardBorder,
          "--sc-gold": T.gold,
          "--sc-gold-bright": T.goldBright,
          "--sc-gold-soft": `${T.gold}18`,
          "--sc-gold-border": `${T.gold}45`,
          "--sc-paper": T.paper,
          "--sc-muted": T.muted,
          "--sc-sage": T.sage,
          "--sc-rust": T.rust,
        }}
      >
        <header className="sc-dashboard-top">
          <button type="button" className="sc-dashboard-mark" onClick={onBack} aria-label="Back to Space Coins intro"><Coins size={15} /></button>
          <h1 className="sc-dashboard-heading">Space Coins</h1>
        </header>

        <section className="sc-create-card">
          <div className="sc-create-copy">
            <h2 className="sc-create-title">Create Your Space Coin</h2>
            <p className="sc-create-sub">Launch your own mini meme coin in just a few steps</p>
            <button type="button" className="sc-create-button" onClick={() => notify("Coin creator is coming soon")}>
              Create Coin <span><ArrowRight size={13} /></span>
            </button>
          </div>
          <PlanetScene T={T} />
        </section>

        <nav className="sc-quick-grid" aria-label="Space coin shortcuts">
          {[
            [BarChart3, "Top Tokens"],
            [TrendingUp, "Trending"],
            [Rocket, "New Launches"],
            [WalletCards, "My Coins"],
          ].map(([Icon, label]) => (
            <button type="button" className="sc-quick" key={label} onClick={() => notify(`${label} selected`)}>
              <span className="sc-quick-icon"><Icon size={15} /></span>{label}
            </button>
          ))}
        </nav>

        <section>
          <div className="sc-section-head">
            <h2 className="sc-section-title">Top Space Coins</h2>
            <button type="button" className="sc-view-all" onClick={() => notify("Showing all space coins")}>View All</button>
          </div>
          <div className="sc-coin-list">
            {COINS.map((coin) => (
              <button type="button" className="sc-coin-row" key={coin.ticker} onClick={() => notify(`${coin.name} selected`)}>
                <CoinMark coin={coin} T={T} />
                <span className="sc-coin-name"><strong>{coin.name}</strong><small>{coin.ticker}</small></span>
                <span className="sc-coin-value"><span className="sc-coin-price">{coin.price}</span><span className={`sc-coin-change${coin.change.startsWith("-") ? " is-negative" : ""}`}>{coin.change}</span></span>
                <ChevronRight size={14} color={T.muted} />
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="sc-section-head"><h2 className="sc-section-title">Trending</h2><button type="button" className="sc-view-all" onClick={() => notify("Showing trending coins")}>View All</button></div>
          <div className="sc-trending">
            {["Starinu", "Cosmo", "Moonme"].map((coin, index) => (
              <button type="button" className="sc-trend-chip" key={coin} onClick={() => notify(`${coin} selected`)}>
                <span className="sc-trend-rank">#{index + 1}</span><span className="sc-trend-name">{coin}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      {toast && <div className="sc-toast" role="status"><Sparkles size={12} style={{ verticalAlign: "middle", marginRight: 6 }} />{toast}</div>}
    </main>
  );
}