import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight, BarChart3, Bell, Coins, House, Rocket, Sparkles,
  TrendingUp, UserRound, WalletCards,
} from "lucide-react";
import planetReference from "./assets/space-coins-planet.jpg";
import galaxyDogeImage from "./assets/space-coins-galaxy-doge.jpg";
import moonCatImage from "./assets/space-coins-moon-cat.jpg";
import planetPepeImage from "./assets/space-coins-planet-pepe.jpg";

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
  { name: "GALAXY DOGE", ticker: "GDOGE", price: "$0.000245", change: "+23.14%", image: galaxyDogeImage },
  { name: "MOON CAT", ticker: "MCAT", price: "$0.000182", change: "+12.08%", image: moonCatImage },
  { name: "PLANET PEPE", ticker: "PPEPE", price: "$0.000092", change: "+8.19%", image: planetPepeImage },
];

function PlanetScene({ T }) {
  return (
    <div className="sc-planet-scene" aria-hidden="true">
      <img className="sc-planet-reference" src={planetReference} alt="" />
    </div>
  );
}

function CoinMark({ coin }) {
  return <img className="sc-coin-mark" src={coin.image} alt="" />;
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
         .sc-dashboard-shell { width:min(100%,480px); min-height:100%; margin:0 auto; padding:12px 8px 86px; }
         .sc-dashboard-top { display:flex; align-items:center; gap:9px; margin-bottom:14px; }
         .sc-dashboard-heading { flex:1; font-size:16px; font-weight:800; letter-spacing:-.04em; }
          .sc-dashboard-mark { width:27px; height:27px; display:grid; place-items:center; border:0; border-radius:50%; color:var(--sc-ink); background:var(--sc-gold-gradient); box-shadow:0 4px 10px var(--sc-gold-shadow); }
         .sc-bell { width:28px; height:28px; display:grid; place-items:center; border:0; border-radius:50%; background:transparent; color:var(--sc-paper); }
         .sc-create-card { position:relative; min-height:136px; overflow:hidden; border:1px solid var(--sc-gold-border); border-radius:15px; padding:18px 14px; background:var(--sc-create-bg); }
         .sc-create-copy { position:relative; z-index:2; width:61%; }
         .sc-create-title { margin:0; font-size:15px; line-height:1.25; font-weight:800; white-space:nowrap; }
         .sc-create-sub { margin:7px 0 0; color:var(--sc-muted); font-size:10px; line-height:1.45; }
         .sc-create-button { display:flex; align-items:center; gap:10px; margin-top:14px; border:1px solid var(--sc-gold); border-radius:7px; padding:7px 8px 7px 10px; color:var(--sc-gold-bright); background:var(--sc-card); font:700 10px 'Montserrat',sans-serif; cursor:pointer; }
          .sc-create-button span { display:grid; place-items:center; width:22px; height:22px; margin:-4px -4px -4px 1px; border-radius:6px; color:var(--sc-ink); background:var(--sc-gold-gradient); }
         .sc-planet-scene { position:absolute; z-index:1; right:0; top:0; width:47%; height:100%; overflow:hidden; pointer-events:none; }
          .sc-planet-reference { position:absolute; right:-7px; top:8px; width:165px; height:120px; object-fit:cover; object-position:right center; animation:sc-planet-turn 7s ease-in-out infinite; filter:drop-shadow(0 9px 11px rgba(226,164,0,.22)); }
         .sc-quick-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin:14px 0 22px; }
         .sc-quick { min-width:0; min-height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; padding:8px 2px; color:var(--sc-paper); background:var(--sc-card); border:1px solid var(--sc-border); border-radius:11px; font:600 9px 'Montserrat',sans-serif; cursor:pointer; }
         .sc-quick-icon { display:grid; place-items:center; width:27px; height:27px; border-radius:9px; color:var(--sc-gold-bright); background:var(--sc-gold-soft); }
         .sc-section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
         .sc-section-title { font-size:15px; font-weight:800; letter-spacing:-.02em; }
         .sc-view-all { border:0; padding:4px 0; color:var(--sc-gold-bright); background:transparent; font:700 10px 'Montserrat',sans-serif; cursor:pointer; }
         .sc-coin-list { overflow:hidden; margin-bottom:22px; border:1px solid var(--sc-border); border-radius:12px; background:var(--sc-card); }
         .sc-coin-row { width:100%; display:flex; align-items:center; gap:9px; padding:9px 10px; border:0; border-bottom:1px solid var(--sc-border); background:transparent; color:inherit; text-align:left; cursor:pointer; }
         .sc-coin-row:last-child { border-bottom:0; }
         .sc-coin-row:active, .sc-quick:active, .sc-create-button:active { transform:scale(.98); }
         .sc-coin-mark { display:block; width:34px; height:34px; flex-shrink:0; border-radius:50%; object-fit:cover; }
         .sc-coin-name { min-width:0; flex:1; }
         .sc-coin-name strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; font-weight:800; }
         .sc-coin-name small { display:block; margin-top:3px; color:var(--sc-muted); font-size:9px; font-weight:600; }
         .sc-coin-value { text-align:right; }
         .sc-coin-price, .sc-coin-change { display:block; }
         .sc-coin-price { font-size:10px; font-weight:800; }
         .sc-coin-change { margin-top:3px; color:var(--sc-sage); font-size:9px; font-weight:700; }
         .sc-coin-change.is-negative { color:var(--sc-rust); }
         .sc-trending { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; padding-bottom:10px; }
         .sc-trend-chip { display:flex; align-items:center; gap:6px; min-width:0; padding:10px 8px; border:1px solid var(--sc-border); border-radius:10px; background:var(--sc-card); color:var(--sc-paper); cursor:pointer; }
         .sc-trend-rank { color:var(--sc-gold-bright); font-size:9px; font-weight:800; }
         .sc-trend-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; font-weight:700; }
         .sc-bottom-nav { position:fixed; z-index:4; bottom:0; left:50%; width:min(100%,480px); display:grid; grid-template-columns:repeat(5,1fr); align-items:end; padding:8px 8px 7px; transform:translateX(-50%); border-top:1px solid var(--sc-border); background:color-mix(in srgb, var(--sc-ink) 94%, transparent); backdrop-filter:blur(12px); }
         .sc-nav-item { display:flex; flex-direction:column; align-items:center; gap:3px; min-width:0; border:0; padding:0; color:var(--sc-muted); background:transparent; font:600 8px 'Montserrat',sans-serif; cursor:pointer; }
         .sc-nav-item.is-active { color:var(--sc-gold-bright); }
          .sc-nav-center { width:40px; height:40px; display:grid; place-items:center; margin:-22px auto 0; border:3px solid var(--sc-ink); border-radius:50%; color:var(--sc-ink); background:var(--sc-gold-gradient); box-shadow:0 4px 14px var(--sc-gold-shadow); }
         .sc-toast { position:fixed; z-index:5; left:50%; bottom:76px; transform:translateX(-50%); padding:11px 15px; border:1px solid var(--sc-gold-border); border-radius:999px; color:var(--sc-paper); background:var(--sc-card); box-shadow:0 8px 25px rgba(0,0,0,.28); font-size:11px; font-weight:700; white-space:nowrap; animation:sc-toast-in .2s ease-out; }
         @keyframes sc-dashboard-enter { from { opacity:0; transform:translate3d(100%,0,0); } to { opacity:1; transform:translate3d(0,0,0); } }
         @keyframes sc-planet-turn { 0%,100% { transform:rotate(-2deg) scale(1); } 50% { transform:rotate(2deg) scale(1.02); } }
        @keyframes sc-toast-in { from { opacity:0; transform:translate(-50%,10px); } }
        @media (max-width:340px) { .sc-create-copy { width:62%; } .sc-planet-scene { right:-32px; } .sc-quick { font-size:8px; } }
        @media (prefers-reduced-motion:reduce) { .sc-screen *, .sc-screen { animation:none !important; transition:none !important; } }
      `}</style>
      <div
        className="sc-dashboard-shell"
        style={{
          "--sc-ink": T.ink,
          "--sc-card": T.card,
           "--sc-create-bg": T.ink === "#FFFFFF" ? "#fff8e8" : `${T.gold}12`,
          "--sc-border": T.cardBorder,
          "--sc-gold": T.gold,
          "--sc-gold-bright": T.goldBright,
           "--sc-gold-gradient": T.goldGradient,
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
           <button type="button" className="sc-bell" onClick={() => notify("No new notifications")} aria-label="Notifications"><Bell size={17} /></button>
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
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="sc-section-head"><h2 className="sc-section-title">Trending</h2><button type="button" className="sc-view-all" onClick={() => notify("Showing trending coins")}>View All</button></div>
          <div className="sc-trending">
             {["STARINU", "COSMO", "MOONME"].map((coin, index) => (
              <button type="button" className="sc-trend-chip" key={coin} onClick={() => notify(`${coin} selected`)}>
                <span className="sc-trend-rank">#{index + 1}</span><span className="sc-trend-name">{coin}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
       <nav className="sc-bottom-nav" aria-label="Primary navigation">
         <button type="button" className="sc-nav-item" onClick={() => notify("Home selected")}><House size={15} /><span>Home</span></button>
         <button type="button" className="sc-nav-item is-active" onClick={() => notify("Space Coins selected")}><Coins size={15} /><span>Space Coins</span></button>
         <button type="button" className="sc-nav-center" onClick={() => notify("Create a coin")} aria-label="Create a coin"><Coins size={22} /></button>
         <button type="button" className="sc-nav-item" onClick={() => notify("Wallet selected")}><WalletCards size={15} /><span>Wallet</span></button>
         <button type="button" className="sc-nav-item" onClick={() => notify("Profile selected")}><UserRound size={15} /><span>Profile</span></button>
       </nav>
      {toast && <div className="sc-toast" role="status"><Sparkles size={12} style={{ verticalAlign: "middle", marginRight: 6 }} />{toast}</div>}
    </main>
  );
}