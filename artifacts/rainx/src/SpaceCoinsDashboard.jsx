import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, ChevronRight, CircleDollarSign,
  Coins, Gem, Rocket, Sparkles, Star, TrendingUp, WalletCards,
} from "lucide-react";
import planetReference from "./assets/space-coins-planet.jpg";

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
  { name: "Star Inu", ticker: "SINU", price: "$0.000071", change: "-2.44%", tone: "rose", icon: "✦" },
];

function PlanetScene({ T, active, onInteract }) {
  return (
    <button type="button" className={`sc-planet-scene${active ? " is-reacting" : ""}`} onClick={onInteract} aria-label="Interact with the rotating planet">
      <img className="sc-planet-reference" src={planetReference} alt="" />
      <span className="sc-planet-glow" style={{ background: `radial-gradient(circle, ${T.gold}5c, transparent 68%)` }} />
      <span className="sc-planet-ring sc-planet-ring-back" style={{ borderColor: `${T.goldBright}99` }} />
      <span className="sc-planet" style={{ background: `radial-gradient(circle at 32% 26%, ${T.goldBright}, ${T.gold} 47%, ${T.card})`, boxShadow: `inset -12px -8px 16px ${T.ink}55, 0 12px 24px ${T.gold}24` }}>
        <span className="sc-planet-line" style={{ background: `${T.paper}45` }} />
        <span className="sc-planet-line sc-planet-line-two" style={{ background: `${T.paper}35` }} />
      </span>
      <span className="sc-planet-ring sc-planet-ring-front" style={{ borderColor: `${T.goldBright}aa` }} />
      <Star className="sc-planet-star sc-planet-star-one" color={T.goldBright} size={11} />
      <Star className="sc-planet-star sc-planet-star-two" color={T.gold} size={9} />
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
  const [reacting, setReacting] = useState(false);
  const [toast, setToast] = useState("");
  const edgeBack = useEdgeBack(onBack);

  const interact = () => {
    setReacting(false);
    requestAnimationFrame(() => setReacting(true));
    window.setTimeout(() => setReacting(false), 780);
  };

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
        .sc-dashboard-shell { width:min(100%,480px); min-height:100%; margin:0 auto; padding:17px 16px 32px; }
        .sc-dashboard-top { display:flex; align-items:center; gap:13px; margin-bottom:22px; }
        .sc-dashboard-top .sc-back { flex:0 0 auto; }
        .sc-dashboard-heading { flex:1; font-size:20px; font-weight:800; letter-spacing:-.04em; }
        .sc-bell { width:40px; height:40px; display:grid; place-items:center; border:1px solid var(--sc-border); border-radius:13px; background:var(--sc-card); color:var(--sc-paper); }
        .sc-create-card { position:relative; min-height:155px; overflow:hidden; border:1px solid var(--sc-gold-border); border-radius:20px; padding:22px 16px; background:linear-gradient(120deg, var(--sc-card), var(--sc-card-warm)); }
        .sc-create-copy { position:relative; z-index:2; width:58%; }
        .sc-create-title { margin:0; font-size:17px; line-height:1.2; font-weight:800; }
        .sc-create-sub { margin:7px 0 0; color:var(--sc-muted); font-size:11px; line-height:1.45; }
        .sc-create-button { display:flex; align-items:center; gap:11px; margin-top:17px; border:1px solid var(--sc-gold); border-radius:9px; padding:9px 10px 9px 12px; color:var(--sc-gold-bright); background:var(--sc-card); font:700 11px 'Montserrat',sans-serif; cursor:pointer; }
        .sc-create-button span { display:grid; place-items:center; width:21px; height:21px; margin:-4px -5px -4px 1px; border-radius:6px; color:var(--sc-ink); background:var(--sc-gold); }
        .sc-planet-scene { position:absolute; z-index:1; right:-11px; top:2px; width:185px; height:150px; border:0; background:transparent; cursor:pointer; }
         .sc-planet-reference { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; object-position:center; mix-blend-mode:multiply; pointer-events:none; }
         .sc-planet-scene > :not(.sc-planet-reference) { display:none; }
        .sc-planet-glow { position:absolute; inset:4px; border-radius:50%; filter:blur(8px); }
        .sc-planet { position:absolute; z-index:2; left:59px; top:39px; width:75px; height:75px; overflow:hidden; border-radius:50%; }
        .sc-planet-line { position:absolute; left:-10px; top:25px; width:105px; height:9px; border-radius:50%; transform:rotate(-16deg); }
        .sc-planet-line-two { top:49px; transform:rotate(12deg); }
        .sc-planet-ring { position:absolute; z-index:3; left:30px; top:54px; width:134px; height:49px; border:5px solid; border-left-color:transparent !important; border-right-color:transparent !important; border-radius:50%; transform:rotate(-13deg); }
        .sc-planet-ring-back { z-index:1; }
        .sc-planet-ring-front { top:57px; clip-path:polygon(0 48%,100% 48%,100% 100%,0 100%); }
        .sc-planet-star { position:absolute; z-index:4; animation:sc-twinkle 2.7s ease-in-out infinite; }
        .sc-planet-star-one { top:22px; right:30px; } .sc-planet-star-two { top:41px; right:17px; animation-delay:.5s; }
        .sc-planet-scene.is-reacting .sc-planet-ring { animation:sc-planet-burst .75s ease-out; }
        .sc-planet-scene.is-reacting .sc-planet-star-one { animation:sc-star-burst-one .75s ease-out; }
        .sc-planet-scene.is-reacting .sc-planet-star-two { animation:sc-star-burst-two .75s ease-out; }
        .sc-quick-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:16px 0 27px; }
        .sc-quick { min-width:0; display:flex; flex-direction:column; align-items:center; gap:8px; padding:13px 3px 10px; color:var(--sc-paper); background:var(--sc-card); border:1px solid var(--sc-border); border-radius:14px; font:600 9px 'Montserrat',sans-serif; cursor:pointer; }
        .sc-quick-icon { display:grid; place-items:center; width:29px; height:29px; border-radius:10px; color:var(--sc-gold-bright); background:var(--sc-gold-soft); }
        .sc-section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .sc-section-title { font-size:15px; font-weight:800; letter-spacing:-.02em; }
        .sc-view-all { border:0; padding:4px 0; color:var(--sc-gold-bright); background:transparent; font:700 10px 'Montserrat',sans-serif; cursor:pointer; }
        .sc-coin-list { overflow:hidden; margin-bottom:27px; border:1px solid var(--sc-border); border-radius:15px; background:var(--sc-card); }
        .sc-coin-row { width:100%; display:flex; align-items:center; gap:10px; padding:12px 12px; border:0; border-bottom:1px solid var(--sc-border); background:transparent; color:inherit; text-align:left; cursor:pointer; }
        .sc-coin-row:last-child { border-bottom:0; }
        .sc-coin-row:active, .sc-quick:active, .sc-create-button:active { transform:scale(.98); }
        .sc-coin-mark { display:grid; place-items:center; width:34px; height:34px; flex-shrink:0; border-radius:50%; font-size:16px; box-shadow:inset -5px -4px 0 rgba(0,0,0,.15); }
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
        @keyframes sc-planet-burst { 50% { transform:rotate(-13deg) scale(1.12); } }
        @keyframes sc-star-burst-one { 50% { transform:translate(10px,-12px) rotate(40deg); } }
        @keyframes sc-star-burst-two { 50% { transform:translate(13px,10px) rotate(-35deg); } }
        @keyframes sc-toast-in { from { opacity:0; transform:translate(-50%,10px); } }
        @media (max-width:340px) { .sc-create-copy { width:62%; } .sc-planet-scene { right:-32px; } .sc-quick { font-size:8px; } }
        @media (prefers-reduced-motion:reduce) { .sc-screen *, .sc-screen { animation:none !important; transition:none !important; } }
      `}</style>
      <div
        className="sc-dashboard-shell"
        style={{
          "--sc-ink": T.ink,
          "--sc-card": T.card,
          "--sc-card-warm": `${T.gold}12`,
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
          <button type="button" className="sc-back" onClick={onBack} aria-label="Back to Space Coins intro"><ArrowLeft size={18} /></button>
          <h1 className="sc-dashboard-heading">Space Coins</h1>
          <div className="sc-bell" aria-label="Notifications"><Bell size={17} /></div>
        </header>

        <section className="sc-create-card">
          <div className="sc-create-copy">
            <h2 className="sc-create-title">Create Your Space Coin</h2>
            <p className="sc-create-sub">Launch your own mini meme coin in just a few steps</p>
            <button type="button" className="sc-create-button" onClick={() => notify("Coin creator is coming soon")}>
              Create Coin <span><ArrowRight size={13} /></span>
            </button>
          </div>
          <PlanetScene T={T} active={reacting} onInteract={interact} />
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