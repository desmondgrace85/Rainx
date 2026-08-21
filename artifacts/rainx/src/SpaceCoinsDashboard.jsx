import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleDollarSign,
  Gift,
  Home,
  Plus,
  Rocket,
  ShieldCheck,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import planet3d from "./assets/space-coins-planet-3d.png";
import galaxyDogeImage from "./assets/space-coins-galaxy-doge.jpg";
import moonCatImage from "./assets/space-coins-moon-cat.jpg";
import planetPepeImage from "./assets/space-coins-planet-pepe.jpg";
import rocketArtwork from "./assets/space-coins-rocket.png";
import orbitArtwork from "./assets/space-coins-orbit.png";
import platformArtwork from "./assets/space-coins-platform.png";
import rainxLogoTransparent from "./assets/rainx-logo-transparent.png";

const GOLD = "#F4D35E";
const GOLD_DEEP = "#DFA800";
const GOLD_SOFT = "#FFF8E8";
const TEXT = "#111418";
const MUTED = "#737A80";
const BORDER = "#E7E9EB";

const COINS = [
  { name: "GALAXY DOGE", ticker: "GDOGE", price: "$0.000245", change: "+23.14%", image: galaxyDogeImage },
  { name: "MOON CAT", ticker: "MCAT", price: "$0.000182", change: "+12.08%", image: moonCatImage },
  { name: "PLANET PEPE", ticker: "PPEPE", price: "$0.000092", change: "+8.19%", image: planetPepeImage },
];

function stopOuterPullRefresh(e) {
  e.stopPropagation();
}

function EdgeBack({ onBack }) {
  const ref = useRef(null);

  return {
    onTouchStart: (e) => {
      stopOuterPullRefresh(e);
      const t = e.touches[0];
      ref.current = t.clientX < 28 ? { x: t.clientX, y: t.clientY } : null;
    },
    onTouchMove: stopOuterPullRefresh,
    onTouchEnd: (e) => {
      stopOuterPullRefresh(e);
      if (!ref.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - ref.current.x;
      const dy = Math.abs(t.clientY - ref.current.y);
      ref.current = null;
      if (dx > 48 && dy < 90) onBack?.();
    },
    onTouchCancel: (e) => {
      stopOuterPullRefresh(e);
      ref.current = null;
    },
  };
}

function NativePage({ children, className = "" }) {
  return (
    <main
      className={`sc-native-page ${className}`}
      onTouchStart={stopOuterPullRefresh}
      onTouchMove={stopOuterPullRefresh}
      onTouchEnd={stopOuterPullRefresh}
      onTouchCancel={stopOuterPullRefresh}
    >
      {children}
    </main>
  );
}

function DashboardPlanet() {
  return (
    <div className="sc-dashboard-planet-wrap" aria-hidden="true">
      <div className="sc-dashboard-planet-glow" />
      <img
        src={planet3d}
        className="sc-dashboard-planet"
        alt=""
        draggable="false"
      />
    </div>
  );
}

function DashboardBottomNav({ onCreate }) {
  return (
    <nav className="sc-dashboard-nav" aria-label="Space Coins navigation">
      <button type="button" className="sc-dashboard-nav-item">
        <Home size={22} strokeWidth={1.8} />
        <span>Home</span>
      </button>

      <button type="button" className="sc-dashboard-nav-item is-active">
        <CircleDollarSign size={22} strokeWidth={1.8} />
        <span>Space Coins</span>
      </button>

      <button
        type="button"
        className="sc-dashboard-nav-center"
        onClick={onCreate}
        aria-label="Create a Space Coin"
      >
        <img src={rainxLogoTransparent} alt="" draggable="false" />
      </button>

      <button type="button" className="sc-dashboard-nav-item">
        <WalletCards size={22} strokeWidth={1.8} />
        <span>Wallet</span>
      </button>

      <button type="button" className="sc-dashboard-nav-item">
        <UserRound size={22} strokeWidth={1.8} />
        <span>Profile</span>
      </button>
    </nav>
  );
}

function SpaceCoinsDashboardScreen({ onCreate }) {
  return (
    <NativePage className="sc-dashboard-page">
      <style>{`
        .sc-native-page,
        .sc-native-page * { box-sizing:border-box; }

        .sc-native-page {
          position:fixed;
          inset:0;
          z-index:700;
          width:100%;
          height:100dvh;
          min-height:100dvh;
          overflow:hidden;
          background:#fff;
          color:${TEXT};
          font-family:'Montserrat',sans-serif;
          overscroll-behavior:none;
          isolation:isolate;
        }

        .sc-dashboard-scroll {
          position:absolute;
          inset:0;
          overflow-y:auto;
          overflow-x:hidden;
          overscroll-behavior-y:none;
          overscroll-behavior-x:none;
          -webkit-overflow-scrolling:touch;
          touch-action:pan-y;
          scrollbar-width:none;
          padding:
            calc(18px + env(safe-area-inset-top))
            18px
            calc(92px + env(safe-area-inset-bottom));
        }
        .sc-dashboard-scroll::-webkit-scrollbar { display:none; }

        .sc-dashboard-inner {
          width:min(100%,680px);
          margin:0 auto;
        }

        .sc-dashboard-header {
          height:56px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:18px;
        }

        .sc-dashboard-brand {
          display:flex;
          align-items:center;
          gap:10px;
        }
        .sc-dashboard-brand img {
          width:30px;
          height:30px;
          object-fit:contain;
        }
        .sc-dashboard-brand h1 {
          margin:0;
          font-size:25px;
          line-height:1;
          font-weight:800;
          letter-spacing:-1px;
        }
        .sc-dashboard-bell {
          width:44px;
          height:44px;
          border:0;
          background:transparent;
          display:grid;
          place-items:center;
          color:${TEXT};
          padding:0;
        }

        .sc-dashboard-hero {
          position:relative;
          min-height:340px;
          overflow:hidden;
          border:1px solid #F0E3C0;
          border-radius:25px;
          background:#FFF9EC;
          padding:36px 38px;
        }

        .sc-dashboard-copy {
          position:relative;
          z-index:4;
          width:55%;
        }
        .sc-dashboard-title {
          margin:0;
          font-size:29px;
          line-height:1.08;
          font-weight:800;
          letter-spacing:-1.2px;
        }
        .sc-dashboard-sub {
          margin:24px 0 0;
          color:#777D82;
          font-size:18px;
          line-height:1.48;
          font-weight:400;
          max-width:280px;
        }

        .sc-dashboard-create {
          margin-top:28px;
          height:56px;
          display:inline-flex;
          align-items:stretch;
          overflow:hidden;
          border:2px solid #E4C35D;
          border-radius:14px;
          background:#fff;
          color:#BE8A10;
          padding:0;
          font:800 15px 'Montserrat',sans-serif;
        }
        .sc-dashboard-create-label {
          display:flex;
          align-items:center;
          padding:0 27px;
        }
        .sc-dashboard-create-arrow {
          width:66px;
          display:grid;
          place-items:center;
          background:#E3A51B;
          color:#fff;
        }

        .sc-dashboard-planet-wrap {
          position:absolute;
          z-index:2;
          right:3%;
          top:2%;
          width:49%;
          height:96%;
          display:grid;
          place-items:center;
          pointer-events:none;
        }
        .sc-dashboard-planet-glow {
          position:absolute;
          width:75%;
          height:70%;
          border-radius:50%;
          background:radial-gradient(circle,rgba(244,211,94,.24),transparent 68%);
          filter:blur(15px);
        }
        .sc-dashboard-planet {
          position:relative;
          width:min(100%,250px);
          height:min(100%,250px);
          object-fit:contain;
          filter:drop-shadow(0 13px 12px rgba(205,149,24,.17));
          animation:sc-dashboard-planet-spin 9s linear infinite;
          transform-origin:center;
        }

        .sc-dashboard-shortcuts {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:12px;
          margin:18px 0 28px;
        }
        .sc-dashboard-shortcut {
          min-width:0;
          height:122px;
          border:1px solid ${BORDER};
          border-radius:20px;
          background:#fff;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:13px;
          color:${TEXT};
          font:700 13px 'Montserrat',sans-serif;
          box-shadow:0 2px 7px rgba(20,24,28,.025);
          text-align:center;
          padding:7px 4px;
        }
        .sc-dashboard-shortcut svg {
          color:#111418;
          width:32px;
          height:32px;
          stroke-width:1.65;
        }

        .sc-dashboard-section-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:13px;
        }
        .sc-dashboard-section-title {
          margin:0;
          font-size:25px;
          line-height:1;
          font-weight:800;
          letter-spacing:-.8px;
        }
        .sc-dashboard-view-all {
          border:0;
          background:transparent;
          color:#B98612;
          padding:5px 0;
          font:800 14px 'Montserrat',sans-serif;
        }

        .sc-dashboard-coins {
          overflow:hidden;
          border:1px solid ${BORDER};
          border-radius:21px;
          background:#fff;
          box-shadow:0 2px 7px rgba(20,24,28,.025);
          margin-bottom:27px;
        }
        .sc-dashboard-coin-row {
          width:100%;
          min-height:108px;
          padding:14px 24px;
          display:flex;
          align-items:center;
          gap:16px;
          border:0;
          border-bottom:1px solid #ECEDEF;
          background:#fff;
          color:${TEXT};
          text-align:left;
        }
        .sc-dashboard-coin-row:last-child { border-bottom:0; }
        .sc-dashboard-coin-image {
          width:57px;
          height:57px;
          border-radius:50%;
          object-fit:cover;
          flex:0 0 auto;
        }
        .sc-dashboard-coin-name {
          min-width:0;
          flex:1;
        }
        .sc-dashboard-coin-name strong {
          display:block;
          font-size:16px;
          line-height:1.15;
          font-weight:800;
        }
        .sc-dashboard-coin-name small {
          display:block;
          margin-top:7px;
          color:#7D8388;
          font-size:14px;
          font-weight:600;
        }
        .sc-dashboard-coin-value {
          text-align:right;
          flex:0 0 auto;
        }
        .sc-dashboard-price {
          display:block;
          font-size:16px;
          font-weight:800;
        }
        .sc-dashboard-change {
          display:block;
          margin-top:7px;
          color:#43A57C;
          font-size:14px;
          font-weight:800;
        }

        .sc-dashboard-trending {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px;
          padding-bottom:12px;
        }
        .sc-dashboard-trend {
          height:60px;
          border:1px solid ${BORDER};
          border-radius:17px;
          background:#fff;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:6px;
          color:${TEXT};
          font:800 13px 'Montserrat',sans-serif;
        }
        .sc-dashboard-trend-rank { color:#B98612; }

        .sc-dashboard-nav {
          position:fixed;
          z-index:20;
          left:50%;
          bottom:0;
          width:min(100%,680px);
          transform:translateX(-50%);
          height:82px;
          padding:7px 12px calc(8px + env(safe-area-inset-bottom));
          background:rgba(255,255,255,.98);
          border-top:1px solid #ECEDEF;
          display:grid;
          grid-template-columns:repeat(5,1fr);
          align-items:end;
          box-shadow:0 -2px 12px rgba(20,24,28,.035);
          backdrop-filter:blur(10px);
        }
        .sc-dashboard-nav-item {
          border:0;
          background:transparent;
          color:#777E84;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:5px;
          min-width:0;
          padding:3px 0;
          font:600 10px 'Montserrat',sans-serif;
        }
        .sc-dashboard-nav-item.is-active { color:#C08A12; }
        .sc-dashboard-nav-center {
          width:66px;
          height:66px;
          margin:-17px auto 0;
          border:0;
          border-radius:50%;
          background:#E4AA12;
          display:grid;
          place-items:center;
          box-shadow:0 8px 20px rgba(215,164,21,.24);
          padding:0;
        }
        .sc-dashboard-nav-center img {
          width:40px;
          height:40px;
          object-fit:contain;
          filter:brightness(0) invert(1);
        }

        @keyframes sc-dashboard-planet-spin {
          from { transform:rotate(0deg); }
          to { transform:rotate(360deg); }
        }

        @media (max-width:430px) {
          .sc-dashboard-scroll { padding-left:16px; padding-right:16px; }
          .sc-dashboard-hero { min-height:310px; padding:28px 28px; border-radius:23px; }
          .sc-dashboard-copy { width:59%; }
          .sc-dashboard-title { font-size:25px; }
          .sc-dashboard-sub { margin-top:19px; font-size:16px; }
          .sc-dashboard-create { margin-top:22px; height:52px; font-size:14px; }
          .sc-dashboard-create-label { padding:0 22px; }
          .sc-dashboard-create-arrow { width:56px; }
          .sc-dashboard-planet { width:180px; height:180px; }
          .sc-dashboard-shortcuts { gap:9px; margin-top:15px; }
          .sc-dashboard-shortcut { height:104px; border-radius:17px; gap:10px; font-size:11px; }
          .sc-dashboard-shortcut svg { width:28px; height:28px; }
          .sc-dashboard-section-title { font-size:22px; }
          .sc-dashboard-view-all { font-size:12px; }
          .sc-dashboard-coin-row { min-height:88px; padding:11px 15px; gap:11px; }
          .sc-dashboard-coin-image { width:47px; height:47px; }
          .sc-dashboard-coin-name strong,.sc-dashboard-price { font-size:13px; }
          .sc-dashboard-coin-name small,.sc-dashboard-change { font-size:12px; }
          .sc-dashboard-nav { height:74px; }
          .sc-dashboard-nav-center { width:60px; height:60px; }
          .sc-dashboard-nav-center img { width:36px; height:36px; }
        }

        @media (prefers-reduced-motion:reduce) {
          .sc-dashboard-page *,
          .sc-dashboard-page { animation:none !important; transition:none !important; }
        }
      `}</style>

      <div className="sc-dashboard-scroll">
        <div className="sc-dashboard-inner">
          <header className="sc-dashboard-header">
            <div className="sc-dashboard-brand">
              <img src={planet3d} alt="" draggable="false" />
              <h1>Space Coins</h1>
            </div>
            <button type="button" className="sc-dashboard-bell" aria-label="Notifications">
              <Bell size={28} strokeWidth={1.75} />
            </button>
          </header>

          <section className="sc-dashboard-hero">
            <div className="sc-dashboard-copy">
              <h2 className="sc-dashboard-title">Create Your<br />Space Coin</h2>
              <p className="sc-dashboard-sub">
                Launch your own mini meme coin<br />in just a few steps.
              </p>
              <button type="button" className="sc-dashboard-create" onClick={onCreate}>
                <span className="sc-dashboard-create-label">Create Coin</span>
                <span className="sc-dashboard-create-arrow"><ArrowRight size={25} strokeWidth={1.9} /></span>
              </button>
            </div>
            <DashboardPlanet />
          </section>

          <nav className="sc-dashboard-shortcuts" aria-label="Space coin categories">
            {[
              [ShieldCheck, "Top Tokens"],
              [TrendingUp, "Trending"],
              [Rocket, "New Launches"],
              [WalletCards, "My Coins"],
            ].map(([Icon, label]) => (
              <button type="button" className="sc-dashboard-shortcut" key={label}>
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <section>
            <div className="sc-dashboard-section-head">
              <h2 className="sc-dashboard-section-title">Top Space Coins</h2>
              <button type="button" className="sc-dashboard-view-all">View All</button>
            </div>

            <div className="sc-dashboard-coins">
              {COINS.map((coin) => (
                <button type="button" className="sc-dashboard-coin-row" key={coin.ticker}>
                  <img className="sc-dashboard-coin-image" src={coin.image} alt="" draggable="false" />
                  <span className="sc-dashboard-coin-name">
                    <strong>{coin.name}</strong>
                    <small>{coin.ticker}</small>
                  </span>
                  <span className="sc-dashboard-coin-value">
                    <span className="sc-dashboard-price">{coin.price}</span>
                    <span className="sc-dashboard-change">{coin.change}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="sc-dashboard-section-head">
              <h2 className="sc-dashboard-section-title">Trending</h2>
              <button type="button" className="sc-dashboard-view-all">View All</button>
            </div>
            <div className="sc-dashboard-trending">
              {["STARINU", "COSMO", "MOONME"].map((name, i) => (
                <button type="button" className="sc-dashboard-trend" key={name}>
                  <span className="sc-dashboard-trend-rank">#{i + 1}</span>{name}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <DashboardBottomNav onCreate={onCreate} />
    </NativePage>
  );
}

function Flame() {
  return (
    <div className="sc-form-flame" aria-hidden="true">
      <span className="flame-core" />
      <span className="flame-mid" />
      <span className="flame-outer" />
      <span className="flame-spark s1" />
      <span className="flame-spark s2" />
    </div>
  );
}

function CloudField() {
  return (
    <div className="sc-form-clouds" aria-hidden="true">
      {Array.from({ length: 13 }).map((_, i) => <i key={i} className={`cloud c${i + 1}`} />)}
    </div>
  );
}

function RocketStage() {
  return (
    <div className="sc-form-stage" aria-hidden="true">
      <div className="sc-form-stage-glow" />
      <CloudField />
      <img className="sc-form-platform" src={platformArtwork} alt="" draggable="false" />
      <img className="sc-form-orbit" src={orbitArtwork} alt="" draggable="false" />
      <div className="sc-form-flame-anchor"><Flame /></div>
      <img className="sc-form-rocket" src={rocketArtwork} alt="" draggable="false" />
      <span className="sc-form-particle p1" />
      <span className="sc-form-particle p2" />
      <span className="sc-form-particle p3" />
      <span className="sc-form-particle p4" />
    </div>
  );
}

function Progress({ step }) {
  return (
    <div className="sc-form-progress-wrap">
      <div className="sc-form-step-label">Step {step} of 4</div>
      <div className="sc-form-progress">
        {[0,1,2,3].map((i) => (
          <span key={i} className={`progress-segment ${step >= i + 1 ? "active" : ""}`}>
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="sc-form-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function CreateForm({ onBack }) {
  const [step, setStep] = useState(1);
  const [logo, setLogo] = useState(null);
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    description: "",
    supply: "1,000,000,000",
    network: "Solana",
  });
  const [launched, setLaunched] = useState(false);

  const update = (key) => (value) => setForm((v) => ({ ...v, [key]: value }));

  const logoUrl = useMemo(() => {
    if (!logo) return null;
    return URL.createObjectURL(logo);
  }, [logo]);

  useEffect(() => () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
  }, [logoUrl]);

  const validStep1 =
    form.name.trim().length >= 2 &&
    /^[A-Za-z0-9]{2,10}$/.test(form.symbol.trim());

  const next = () => {
    if (step === 1 && !validStep1) return;
    setStep((s) => Math.min(4, s + 1));
  };

  if (launched) {
    return (
      <NativePage className="sc-launch-success-page">
        <style>{`
          .sc-launch-success-page {
            display:flex;
            align-items:center;
            justify-content:center;
            background:#fff;
          }
          .sc-launch-success {
            width:min(100%,520px);
            min-height:100%;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            text-align:center;
            padding:30px 24px;
          }
          .sc-success-rocket {
            width:270px;
            max-width:80%;
            animation:sc-success-launch 1.8s cubic-bezier(.18,.76,.25,1) both;
          }
          .sc-success-title {
            margin:18px 0 0;
            font-size:28px;
            font-weight:800;
            letter-spacing:-1px;
          }
          .sc-success-sub {
            margin:10px 0 0;
            color:${MUTED};
            font-size:15px;
            line-height:1.55;
          }
          .sc-success-button {
            margin-top:28px;
            height:52px;
            padding:0 24px;
            border:0;
            border-radius:28px;
            background:${GOLD};
            color:#fff;
            font:800 14px 'Montserrat',sans-serif;
          }
          @keyframes sc-success-launch {
            0% { transform:translateY(100px) scale(.92); opacity:0; }
            18% { opacity:1; }
            70% { transform:translateY(-40px) scale(1); }
            100% { transform:translateY(-70px) scale(1); }
          }
        `}</style>
        <div className="sc-launch-success">
          <img src={rocketArtwork} className="sc-success-rocket" alt="" draggable="false" />
          <h1 className="sc-success-title">Your Space Coin is launched!</h1>
          <p className="sc-success-sub">
            Your launch flow is complete. The coin can now appear in the Space Coins experience.
          </p>
          <button type="button" className="sc-success-button" onClick={onBack}>Back to Space Coins</button>
        </div>
      </NativePage>
    );
  }

  const edgeBack = EdgeBack({ onBack });

  return (
    <NativePage className="sc-form-page">
      <style>{`
        .sc-form-page {
          background:#fff;
        }

        .sc-form-scroll {
          position:absolute;
          inset:0;
          overflow-y:auto;
          overflow-x:hidden;
          overscroll-behavior:none;
          -webkit-overflow-scrolling:touch;
          touch-action:pan-y;
          scrollbar-width:none;
          padding:
            calc(8px + env(safe-area-inset-top))
            22px
            calc(34px + env(safe-area-inset-bottom));
        }
        .sc-form-scroll::-webkit-scrollbar { display:none; }

        .sc-form-inner {
          width:min(100%,650px);
          margin:0 auto;
        }

        .sc-form-header {
          height:58px;
          display:flex;
          align-items:center;
          justify-content:center;
          position:relative;
        }
        .sc-form-back {
          position:absolute;
          left:0;
          width:42px;
          height:42px;
          border:0;
          background:transparent;
          color:${TEXT};
          display:grid;
          place-items:center;
          padding:0;
        }
        .sc-form-title {
          margin:0;
          font-size:24px;
          line-height:1;
          font-weight:800;
          letter-spacing:-1px;
        }

        .sc-form-stage-wrap {
          height:505px;
          display:flex;
          justify-content:center;
          align-items:flex-start;
        }
        .sc-form-stage {
          position:relative;
          width:min(100%,620px);
          height:505px;
          overflow:hidden;
          isolation:isolate;
        }
        .sc-form-stage-glow {
          position:absolute;
          left:50%;
          bottom:64px;
          width:75%;
          height:55%;
          transform:translateX(-50%);
          border-radius:50%;
          background:radial-gradient(circle,rgba(244,211,94,.22),transparent 68%);
          filter:blur(20px);
        }

        .sc-form-platform {
          position:absolute;
          z-index:2;
          left:50%;
          bottom:-92px;
          width:500px;
          height:360px;
          transform:translateX(-50%);
          object-fit:contain;
          filter:drop-shadow(0 15px 12px rgba(190,140,18,.12));
        }

        .sc-form-rocket {
          position:absolute;
          z-index:6;
          left:50%;
          top:48px;
          width:285px;
          height:285px;
          transform:translateX(-50%);
          object-fit:contain;
          filter:drop-shadow(0 13px 10px rgba(0,0,0,.10));
          animation:sc-form-rocket-hover 2.8s ease-in-out infinite;
        }

        .sc-form-orbit {
          position:absolute;
          z-index:7;
          left:50%;
          top:58px;
          width:350px;
          height:270px;
          transform:translateX(-50%);
          object-fit:contain;
          pointer-events:none;
          opacity:.96;
          animation:sc-form-orbit-rotate 7.5s linear infinite;
          transform-origin:center;
        }

        .sc-form-flame-anchor {
          position:absolute;
          z-index:5;
          left:50%;
          top:274px;
          width:70px;
          height:125px;
          transform:translateX(-50%);
          pointer-events:none;
        }

        .sc-form-flame {
          position:relative;
          width:100%;
          height:100%;
          transform-origin:50% 0;
          animation:sc-form-flame-burn .14s ease-in-out infinite alternate;
        }

        .sc-form-flame span {
          position:absolute;
          left:50%;
          transform:translateX(-50%);
          display:block;
          border-radius:50% 50% 55% 55%;
          transform-origin:50% 0;
        }

        .sc-form-flame .flame-outer {
          top:0;
          width:44px;
          height:112px;
          background:
            radial-gradient(ellipse at 50% 6%, #FFF7C9 0 10%, transparent 11%),
            radial-gradient(ellipse at 50% 28%, #FFD95A 0 23%, #F2A51A 55%, rgba(242,165,26,0) 76%);
          filter:blur(1.5px);
        }
        .sc-form-flame .flame-mid {
          top:5px;
          width:28px;
          height:94px;
          background:
            radial-gradient(ellipse at 50% 12%, #fff 0 8%, transparent 9%),
            linear-gradient(180deg,#FFF4A7 0%,#FFC83A 42%,#EF8E16 78%,transparent 100%);
          filter:blur(1px);
        }
        .sc-form-flame .flame-core {
          top:7px;
          width:13px;
          height:78px;
          background:linear-gradient(180deg,#fff 0%,#FFF0A0 32%,#FFB51E 72%,transparent 100%);
          filter:blur(.4px);
        }

        .sc-form-flame .flame-spark {
          width:5px;
          height:13px;
          background:#FFD45A;
          filter:blur(.6px);
          animation:sc-form-spark .55s ease-in-out infinite alternate;
        }
        .sc-form-flame .s1 { left:23%; top:40px; }
        .sc-form-flame .s2 { left:76%; top:26px; animation-delay:-.22s; }

        .sc-form-clouds {
          position:absolute;
          z-index:3;
          left:50%;
          bottom:36px;
          width:88%;
          height:210px;
          transform:translateX(-50%);
          animation:sc-form-cloud-rise 3.4s ease-in-out infinite;
        }
        .sc-form-clouds .cloud {
          position:absolute;
          display:block;
          width:72px;
          height:52px;
          border-radius:50%;
          background:rgba(250,250,250,.96);
          box-shadow:
            24px 2px 0 7px rgba(247,247,247,.95),
            48px 8px 0 1px rgba(245,245,245,.95),
            10px 18px 0 4px rgba(252,252,252,.96);
          filter:blur(.3px) drop-shadow(0 5px 8px rgba(0,0,0,.06));
        }
        .sc-form-clouds .c1 { left:4%; bottom:26px; transform:scale(.82); }
        .sc-form-clouds .c2 { left:18%; bottom:8px; transform:scale(1.02); }
        .sc-form-clouds .c3 { left:34%; bottom:20px; transform:scale(.75); }
        .sc-form-clouds .c4 { right:5%; bottom:24px; transform:scale(.88); }
        .sc-form-clouds .c5 { right:19%; bottom:2px; transform:scale(1.02); }
        .sc-form-clouds .c6 { right:34%; bottom:18px; transform:scale(.72); }
        .sc-form-clouds .c7 { left:11%; bottom:70px; transform:scale(.62); opacity:.92; }
        .sc-form-clouds .c8 { right:12%; bottom:68px; transform:scale(.65); opacity:.92; }
        .sc-form-clouds .c9 { left:28%; bottom:66px; transform:scale(.55); opacity:.9; }
        .sc-form-clouds .c10 { right:30%; bottom:64px; transform:scale(.52); opacity:.9; }
        .sc-form-clouds .c11 { left:45%; bottom:84px; transform:scale(.48); opacity:.88; }
        .sc-form-clouds .c12 { left:2%; bottom:115px; transform:scale(.4); opacity:.72; }
        .sc-form-clouds .c13 { right:2%; bottom:118px; transform:scale(.4); opacity:.72; }

        .sc-form-particle {
          position:absolute;
          z-index:8;
          width:5px;
          height:5px;
          border-radius:50%;
          background:#E7B42E;
          opacity:.65;
          animation:sc-form-particle-float 1.8s ease-in-out infinite;
        }
        .sc-form-particle.p1 { left:28%; top:175px; }
        .sc-form-particle.p2 { left:38%; top:225px; animation-delay:-.6s; }
        .sc-form-particle.p3 { right:29%; top:200px; animation-delay:-1s; }
        .sc-form-particle.p4 { right:37%; top:158px; animation-delay:-1.35s; }

        .sc-form-progress-wrap {
          margin-top:4px;
        }
        .sc-form-step-label {
          text-align:center;
          color:#747A80;
          font-size:19px;
          line-height:1;
          font-weight:600;
        }

        .sc-form-progress {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          align-items:center;
          margin:27px 8px 39px;
        }
        .progress-segment {
          position:relative;
          height:4px;
          background:#E8EAED;
        }
        .progress-segment:first-child { border-radius:999px 0 0 999px; }
        .progress-segment:last-child { border-radius:0 999px 999px 0; }
        .progress-segment.active { background:#DDA51A; }
        .progress-segment i {
          position:absolute;
          left:0;
          top:50%;
          width:14px;
          height:14px;
          transform:translate(-50%,-50%);
          border-radius:50%;
          background:#E7E9EC;
        }
        .progress-segment.active i { background:#DDA51A; }
        .progress-segment:last-child i { left:auto; right:0; transform:translate(50%,-50%); }

        .sc-upload {
          width:180px;
          margin:0 auto 43px;
          text-align:center;
        }
        .sc-upload-circle {
          width:126px;
          height:126px;
          margin:0 auto;
          border:3px dashed #E5C86D;
          border-radius:50%;
          display:grid;
          place-items:center;
          color:#D6A21C;
          background:#FFFDF7;
          overflow:hidden;
        }
        .sc-upload-preview {
          width:100%;
          height:100%;
          object-fit:cover;
        }
        .sc-upload-title {
          margin-top:20px;
          font-size:20px;
          font-weight:800;
          white-space:nowrap;
        }
        .sc-upload-sub {
          margin-top:8px;
          color:#A1A5A9;
          font-size:16px;
          font-weight:500;
          white-space:nowrap;
        }

        .sc-form-fields {
          display:grid;
          gap:20px;
        }
        .sc-form-field span {
          display:block;
          margin:0 0 9px 3px;
          color:#7B8186;
          font-size:16px;
          font-weight:600;
        }
        .sc-form-field input,
        .sc-form-field select {
          width:100%;
          height:62px;
          border:1px solid #E4E6E8;
          border-radius:17px;
          background:#fff;
          color:${TEXT};
          outline:none;
          padding:0 22px;
          font:500 17px 'Montserrat',sans-serif;
          box-shadow:0 1px 6px rgba(20,24,28,.025);
        }
        .sc-form-field input::placeholder { color:#B2B6BA; }

        .sc-form-two {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
        }

        .sc-form-select-wrap {
          position:relative;
        }
        .sc-form-select {
          appearance:none;
          padding-right:48px !important;
        }
        .sc-form-select-chevron {
          position:absolute;
          right:17px;
          top:50%;
          transform:translateY(-50%);
          pointer-events:none;
          color:#22262A;
        }

        .sc-form-actions {
          display:flex;
          gap:12px;
          margin-top:22px;
        }
        .sc-form-next,
        .sc-form-back-button,
        .sc-form-launch {
          min-height:58px;
          border-radius:16px;
          border:0;
          font:800 16px 'Montserrat',sans-serif;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          padding:0 20px;
        }
        .sc-form-next,
        .sc-form-launch {
          flex:1;
          background:#DDA51A;
          color:#fff;
          box-shadow:0 9px 22px rgba(221,165,26,.16);
        }
        .sc-form-back-button {
          flex:0 0 120px;
          background:#F5F6F7;
          color:${TEXT};
        }

        .sc-review {
          border:1px solid ${BORDER};
          border-radius:18px;
          padding:18px;
          display:grid;
          gap:13px;
          margin-bottom:20px;
        }
        .sc-review-row {
          display:flex;
          justify-content:space-between;
          gap:15px;
          font-size:14px;
        }
        .sc-review-row span { color:${MUTED}; }
        .sc-review-row strong { color:${TEXT}; text-align:right; }

        .sc-form-check {
          display:flex;
          gap:11px;
          align-items:flex-start;
          color:${TEXT};
          font-size:13px;
          line-height:1.5;
          padding:14px;
          border:1px solid ${BORDER};
          border-radius:14px;
          background:#fff;
        }

        @keyframes sc-form-rocket-hover {
          0%,100% { transform:translateX(-50%) translateY(0) rotate(-.35deg); }
          50% { transform:translateX(-50%) translateY(-7px) rotate(.35deg); }
        }
        @keyframes sc-form-orbit-rotate {
          from { transform:translateX(-50%) rotate(0deg); }
          to { transform:translateX(-50%) rotate(360deg); }
        }
        @keyframes sc-form-flame-burn {
          from { transform:scaleY(.88) translateX(-1px); opacity:.88; }
          to { transform:scaleY(1.08) translateX(1px); opacity:1; }
        }
        @keyframes sc-form-spark {
          from { transform:translateX(-50%) translateY(0) scale(.7); opacity:.3; }
          to { transform:translateX(-50%) translateY(16px) scale(1.2); opacity:.9; }
        }
        @keyframes sc-form-cloud-rise {
          0%,100% { transform:translateX(-50%) translateY(0); }
          50% { transform:translateX(-50%) translateY(-4px); }
        }
        @keyframes sc-form-particle-float {
          0%,100% { transform:translateY(0) scale(.75); opacity:.15; }
          50% { transform:translateY(16px) scale(1.15); opacity:.85; }
        }

        @media (max-width:430px) {
          .sc-form-scroll { padding-left:18px; padding-right:18px; }
          .sc-form-title { font-size:21px; }
          .sc-form-stage-wrap { height:405px; }
          .sc-form-stage { height:405px; }
          .sc-form-platform { width:420px; height:300px; bottom:-74px; }
          .sc-form-rocket { width:235px; height:235px; top:30px; }
          .sc-form-orbit { width:285px; height:220px; top:36px; }
          .sc-form-flame-anchor { top:224px; height:104px; }
          .sc-form-clouds { bottom:22px; height:170px; transform:translateX(-50%) scale(.88); }
          .sc-form-step-label { font-size:17px; }
          .sc-form-progress { margin-top:23px; margin-bottom:34px; }
          .sc-upload { margin-bottom:36px; }
          .sc-upload-circle { width:112px; height:112px; }
          .sc-upload-title { font-size:18px; }
          .sc-upload-sub { font-size:14px; }
          .sc-form-field span { font-size:14px; }
          .sc-form-field input,.sc-form-field select { height:58px; font-size:16px; border-radius:16px; }
          .sc-form-two { grid-template-columns:1fr; }
        }

        @media (prefers-reduced-motion:reduce) {
          .sc-form-page *,
          .sc-form-page { animation:none !important; transition:none !important; }
        }
      `}</style>

      <div className="sc-form-scroll" {...edgeBack}>
        <div className="sc-form-inner">
          <header className="sc-form-header">
            <button type="button" className="sc-form-back" onClick={onBack} aria-label="Back">
              <ArrowLeft size={30} strokeWidth={1.9} />
            </button>
            <h1 className="sc-form-title">Create Your Space Coin</h1>
          </header>

          <div className="sc-form-stage-wrap">
            <RocketStage />
          </div>

          <Progress step={step} />

          {step === 1 && (
            <>
              <div className="sc-upload">
                <label className="sc-upload-circle" htmlFor="sc-logo-input">
                  {logo ? (
                    <img src={logoUrl} className="sc-upload-preview" alt="Coin logo preview" />
                  ) : (
                    <Plus size={49} strokeWidth={1.7} />
                  )}
                </label>
                <input
                  id="sc-logo-input"
                  type="file"
                  accept="image/png,image/jpeg"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setLogo(file);
                  }}
                />
                <div className="sc-upload-title">Upload Coin Logo</div>
                <div className="sc-upload-sub">PNG, JPG (Max. 5MB)</div>
              </div>

              <div className="sc-form-fields">
                <Field label="Coin Name" value={form.name} onChange={update("name")} placeholder="Enter coin name" />
                <Field label="Symbol" value={form.symbol} onChange={update("symbol")} placeholder="Enter symbol (e.g. RXDOG)" />
                <Field label="Description" value={form.description} onChange={update("description")} placeholder="Tell the world about your coin" />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="sc-form-fields">
              <Field label="Total Supply" value={form.supply} onChange={update("supply")} placeholder="1,000,000,000" />
              <label className="sc-form-field">
                <span>Network</span>
                <div className="sc-form-select-wrap">
                  <select
                    className="sc-form-select"
                    value={form.network}
                    onChange={(e) => update("network")(e.target.value)}
                  >
                    <option>Solana</option>
                    <option>Ethereum</option>
                    <option>Base</option>
                  </select>
                  <ChevronDown className="sc-form-select-chevron" size={22} />
                </div>
              </label>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="sc-review">
                <div className="sc-review-row"><span>Coin name</span><strong>{form.name || "—"}</strong></div>
                <div className="sc-review-row"><span>Symbol</span><strong>{form.symbol || "—"}</strong></div>
                <div className="sc-review-row"><span>Description</span><strong>{form.description || "—"}</strong></div>
                <div className="sc-review-row"><span>Total supply</span><strong>{form.supply || "—"}</strong></div>
                <div className="sc-review-row"><span>Network</span><strong>{form.network}</strong></div>
              </div>
              <label className="sc-form-check">
                <input type="checkbox" />
                <span>I confirm the launch details are correct.</span>
              </label>
            </>
          )}

          {step === 4 && (
            <div className="sc-review">
              <div className="sc-review-row"><span>Ready</span><strong>{form.name || "Your Space Coin"}</strong></div>
              <div className="sc-review-row"><span>Network</span><strong>{form.network}</strong></div>
              <div className="sc-review-row"><span>Launch</span><strong>Ready to launch</strong></div>
            </div>
          )}

          <div className="sc-form-actions">
            {step > 1 && (
              <button
                type="button"
                className="sc-form-back-button"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="sc-form-next" onClick={next}>
                Next Step <ArrowRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                className="sc-form-launch"
                onClick={() => setLaunched(true)}
              >
                Launch Coin <Rocket size={19} />
              </button>
            )}
          </div>
        </div>
      </div>
    </NativePage>
  );
}

export default function SpaceCoinsDashboard({ onBack }) {
  const [view, setView] = useState("dashboard");

  const leaveDashboard = () => {
    if (view === "create") setView("dashboard");
    else onBack?.();
  };

  return view === "create" ? (
    <CreateForm onBack={leaveDashboard} />
  ) : (
    <SpaceCoinsDashboardScreen onCreate={() => setView("create")} />
  );
}
