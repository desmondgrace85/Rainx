import React, { useEffect, useRef } from "react";
import {
  Bell,
  BarChart3,
  TrendingUp,
  Rocket,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  Home,
  WalletCards,
  UserRound,
} from "lucide-react";
import planet3d from "./assets/space-coins-planet-3d.png";
import galaxyDogeImage from "./assets/space-coins-galaxy-doge.jpg";
import moonCatImage from "./assets/space-coins-moon-cat.jpg";
import planetPepeImage from "./assets/space-coins-planet-pepe.jpg";

const COINS = [
  { name: "GALAXY DOGE", ticker: "GDOGE", price: "$0.000245", change: "+23.14%", image: galaxyDogeImage },
  { name: "MOON CAT", ticker: "MCAT", price: "$0.000182", change: "+12.08%", image: moonCatImage },
  { name: "PLANET PEPE", ticker: "PPEPE", price: "$0.000092", change: "+8.19%", image: planetPepeImage },
];

function EdgeBack({ onBack }) {
  const ref = useRef(null);
  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      ref.current = t.clientX < 28 ? { x: t.clientX, y: t.clientY } : null;
    },
    onTouchEnd: (e) => {
      if (!ref.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - ref.current.x;
      const dy = Math.abs(t.clientY - ref.current.y);
      ref.current = null;
      if (dx > 48 && dy < 90) onBack?.();
    },
  };
}

function Planet({ src }) {
  return (
    <div className="sc-planet-wrap" aria-hidden="true">
      <div className="sc-planet-halo" />
      <img src={src} alt="" className="sc-planet" draggable="false" />
    </div>
  );
}

export default function SpaceCoinsIntro({ onExplore, onBack }) {
  const edgeBack = EdgeBack({ onBack });

  useEffect(() => {
    document.title = "Space Coins | RainX";
    return () => { document.title = "RainX"; };
  }, []);

  return (
    <main className="sc-native-page" {...edgeBack}>
      <style>{`
        .sc-native-page,
        .sc-native-page * { box-sizing:border-box; }
        .sc-native-page {
          position:fixed; inset:0; z-index:300;
          width:100%; height:100dvh; min-height:100dvh;
          overflow:hidden; background:#fff; color:#101216;
          font-family:'Montserrat',sans-serif;
          overscroll-behavior:none; -webkit-overflow-scrolling:auto;
          animation:sc-page-in .24s cubic-bezier(.22,.8,.2,1) both;
        }
        .sc-native-scroll {
          position:absolute; inset:0;
          overflow-y:auto; overflow-x:hidden;
          overscroll-behavior-y:none; overscroll-behavior-x:none;
          -webkit-overflow-scrolling:touch;
          touch-action:pan-y;
          scrollbar-width:none;
          padding:calc(10px + env(safe-area-inset-top)) 16px calc(94px + env(safe-area-inset-bottom));
          background:#fff;
        }
        .sc-native-scroll::-webkit-scrollbar { display:none; width:0; height:0; }
        .sc-page-inner { width:min(100%,480px); margin:0 auto; }
        .sc-topbar { height:48px; display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .sc-brand { display:flex; align-items:center; gap:9px; min-width:0; }
        .sc-brand-planet { width:29px; height:29px; object-fit:contain; }
        .sc-brand-title { margin:0; font-size:18px; line-height:1; font-weight:800; letter-spacing:-.45px; }
        .sc-icon-button { width:38px; height:38px; border:0; border-radius:50%; background:transparent; color:#111418; display:grid; place-items:center; padding:0; }
        .sc-create-hero { position:relative; min-height:164px; overflow:hidden; border:1px solid #F0E5C8; border-radius:17px; background:#FFF9EC; padding:22px 18px; }
        .sc-create-copy { position:relative; z-index:2; width:58%; }
        .sc-create-title { margin:0; font-size:19px; line-height:1.18; font-weight:800; letter-spacing:-.6px; }
        .sc-create-sub { margin:10px 0 0; max-width:220px; color:#7A7D83; font-size:11px; line-height:1.45; font-weight:500; }
        .sc-create-cta { margin-top:15px; display:inline-flex; align-items:stretch; overflow:hidden; padding:0; border:1px solid #E2B53B; border-radius:9px; background:#fff; color:#C18B13; font:800 11px 'Montserrat',sans-serif; box-shadow:0 1px 2px rgba(0,0,0,.03); }
        .sc-create-cta-label { display:flex; align-items:center; padding:10px 14px; }
        .sc-create-cta-arrow { width:43px; display:grid; place-items:center; background:#E3A51B; color:#fff; }
        .sc-hero-planet { position:absolute; z-index:1; right:-9px; top:2px; width:53%; height:100%; display:grid; place-items:center; pointer-events:none; }
        .sc-hero-planet img { width:158px; height:158px; object-fit:contain; filter:drop-shadow(0 10px 10px rgba(201,145,21,.18)); animation:sc-planet-spin 10s linear infinite; }
        .sc-shortcuts { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:14px 0 22px; }
        .sc-shortcut { min-width:0; min-height:72px; padding:9px 4px; border:1px solid #E7E8EA; border-radius:13px; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; color:#15181C; font:700 9px 'Montserrat',sans-serif; box-shadow:0 1px 5px rgba(20,24,28,.025); }
        .sc-shortcut svg { color:#111418; width:22px; height:22px; stroke-width:1.8; }
        .sc-section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:9px; }
        .sc-section-title { margin:0; font-size:16px; font-weight:800; letter-spacing:-.35px; }
        .sc-view-all { border:0; background:transparent; color:#C28B16; padding:4px 0; font:700 11px 'Montserrat',sans-serif; }
        .sc-coin-list { overflow:hidden; border:1px solid #E8EAEC; border-radius:15px; background:#fff; box-shadow:0 1px 5px rgba(20,24,28,.025); margin-bottom:23px; }
        .sc-coin-row { width:100%; min-height:68px; padding:10px 12px; display:flex; align-items:center; gap:10px; border:0; border-bottom:1px solid #ECEDEF; background:#fff; color:#12151A; text-align:left; }
        .sc-coin-row:last-child { border-bottom:0; }
        .sc-coin-row:active,.sc-shortcut:active,.sc-create-cta:active,.sc-view-all:active { transform:scale(.985); }
        .sc-coin-image { width:38px; height:38px; border-radius:50%; object-fit:cover; flex:0 0 auto; }
        .sc-coin-name { min-width:0; flex:1; }
        .sc-coin-name strong { display:block; font-size:11px; line-height:1.2; font-weight:800; }
        .sc-coin-name small { display:block; margin-top:4px; color:#747A81; font-size:10px; font-weight:600; }
        .sc-coin-value { text-align:right; flex:0 0 auto; }
        .sc-price { display:block; font-size:11px; font-weight:800; }
        .sc-change { display:block; margin-top:4px; color:#43A57C; font-size:10px; font-weight:800; }
        .sc-trending { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding-bottom:4px; }
        .sc-trend { min-width:0; height:46px; border:1px solid #E8EAEC; border-radius:12px; background:#fff; display:flex; align-items:center; justify-content:center; gap:5px; color:#14171B; font:800 10px 'Montserrat',sans-serif; }
        .sc-trend-rank { color:#C89518; }
        .sc-bottom-nav { position:fixed; z-index:5; left:50%; bottom:0; width:min(100%,480px); transform:translateX(-50%); height:74px; padding:7px 7px calc(7px + env(safe-area-inset-bottom)); background:rgba(255,255,255,.97); border-top:1px solid #ECEDEF; display:grid; grid-template-columns:repeat(5,1fr); align-items:end; box-shadow:0 -2px 10px rgba(20,24,28,.035); backdrop-filter:blur(10px); }
        .sc-nav-item { border:0; background:transparent; color:#7B8086; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; min-width:0; padding:3px 0; font:600 8px 'Montserrat',sans-serif; }
        .sc-nav-item.is-active { color:#C9961A; }
        .sc-nav-center { width:48px; height:48px; margin:-15px auto 0; border:0; border-radius:50%; background:#DCA41C; color:#fff; display:grid; place-items:center; box-shadow:0 6px 16px rgba(201,150,26,.24); }
        @keyframes sc-page-in { from { transform:translate3d(8%,0,0); } to { transform:translate3d(0,0,0); } }
        @keyframes sc-planet-spin { from { transform:rotateY(0deg) rotate(0deg); } to { transform:rotateY(360deg) rotate(360deg); } }
        @media (max-width:350px) { .sc-native-scroll { padding-left:12px; padding-right:12px; } .sc-create-copy { width:61%; } .sc-create-title { font-size:17px; } .sc-hero-planet img { width:140px; height:140px; } }
        @media (prefers-reduced-motion:reduce) { .sc-native-page *, .sc-native-page { animation:none !important; transition:none !important; } }
      `}</style>

      <div className="sc-native-scroll">
        <div className="sc-page-inner">
          <header className="sc-topbar">
            <div className="sc-brand">
              <img className="sc-brand-planet" src={planet3d} alt="" draggable="false" />
              <h1 className="sc-brand-title">Space Coins</h1>
            </div>
            <button type="button" className="sc-icon-button" aria-label="Notifications"><Bell size={24} strokeWidth={1.8} /></button>
          </header>

          <section className="sc-create-hero">
            <div className="sc-create-copy">
              <h2 className="sc-create-title">Create Your Space Coin</h2>
              <p className="sc-create-sub">Launch your own mini meme coin<br />in just a few steps.</p>
              <button type="button" className="sc-create-cta" onClick={onExplore}>
                <span className="sc-create-cta-label">Create Coin</span><span className="sc-create-cta-arrow"><ArrowRight size={17} strokeWidth={1.8} /></span>
              </button>
            </div>
            <div className="sc-hero-planet"><img src={planet3d} alt="" draggable="false" /></div>
          </section>

          <nav className="sc-shortcuts" aria-label="Space coin categories">
            {[
              [ShieldCheck, "Top Tokens"],
              [TrendingUp, "Trending"],
              [Rocket, "New Launches"],
              [WalletCards, "My Coins"],
            ].map(([Icon,label]) => <button type="button" className="sc-shortcut" key={label}><Icon />{label}</button>)}
          </nav>

          <section>
            <div className="sc-section-head"><h2 className="sc-section-title">Top Space Coins</h2><button type="button" className="sc-view-all">View All</button></div>
            <div className="sc-coin-list">
              {COINS.map((coin) => (
                <button type="button" className="sc-coin-row" key={coin.ticker}>
                  <img className="sc-coin-image" src={coin.image} alt="" draggable="false" />
                  <span className="sc-coin-name"><strong>{coin.name}</strong><small>{coin.ticker}</small></span>
                  <span className="sc-coin-value"><span className="sc-price">{coin.price}</span><span className="sc-change">{coin.change}</span></span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="sc-section-head"><h2 className="sc-section-title">Trending</h2><button type="button" className="sc-view-all">View All</button></div>
            <div className="sc-trending">
              {["STARINU","COSMO","MOONME"].map((name,i) => <button type="button" className="sc-trend" key={name}><span className="sc-trend-rank">#{i+1}</span>{name}</button>)}
            </div>
          </section>
        </div>
      </div>

      <nav className="sc-bottom-nav" aria-label="Space coin navigation">
        <button type="button" className="sc-nav-item"><Home size={19} strokeWidth={1.8} /><span>Home</span></button>
        <button type="button" className="sc-nav-item is-active"><CircleDollarSign size={19} strokeWidth={1.8} /><span>Space Coins</span></button>
        <button type="button" className="sc-nav-center" onClick={onExplore} aria-label="Create a coin"><Rocket size={25} strokeWidth={1.8} /></button>
        <button type="button" className="sc-nav-item"><WalletCards size={19} strokeWidth={1.8} /><span>Wallet</span></button>
        <button type="button" className="sc-nav-item"><UserRound size={19} strokeWidth={1.8} /><span>Profile</span></button>
      </nav>
    </main>
  );
}
