import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import coinArtwork from "./assets/space-coins-coin.png";
import orbitArtwork from "./assets/space-coins-orbit.png";
import rocketArtwork from "./assets/space-coins-rocket.png";
import platformArtwork from "./assets/space-coins-platform.png";

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

function RocketScene({ T, active, onInteract }) {
  return (
    <button
      type="button"
      aria-label="Interact with the launching rocket"
      onClick={onInteract}
      className={`sc-scene sc-rocket-scene${active ? " is-reacting" : ""}`}
    >
      <span className="sc-scene-glow" style={{ background: `radial-gradient(circle, ${T.gold}40, transparent 68%)` }} />
      <img className="sc-platform-art" src={platformArtwork} alt="" />
      <img className="sc-coin-art" src={coinArtwork} alt="" />
      <img className="sc-orbit-art" src={orbitArtwork} alt="" />
      <img className="sc-rocket-art" src={rocketArtwork} alt="" />
    </button>
  );
}

export default function SpaceCoinsIntro({ T, onExplore, onBack }) {
  const [reacting, setReacting] = useState(false);
  const edgeBack = useEdgeBack(onBack);

  const interact = () => {
    setReacting(false);
    requestAnimationFrame(() => setReacting(true));
    window.setTimeout(() => setReacting(false), 780);
  };

  useEffect(() => {
    document.title = "Space Coins";
    return () => { document.title = "Space Coins"; };
  }, []);

  return (
    <main
      className="sc-screen sc-intro-screen"
      style={{ background: `radial-gradient(circle at 50% 85%, ${T.gold}18, transparent 40%), ${T.ink}`, color: T.paper }}
      {...edgeBack}
    >
      <style>{`
         .sc-screen { font-family:${"'Montserrat', sans-serif"}; }
        .sc-intro-inner { width:min(100%, 480px); min-height:100%; margin:0 auto; padding:18px 24px 28px; display:flex; flex-direction:column; }
        .sc-back { width:40px; height:40px; display:grid; place-items:center; border:1px solid var(--sc-border); border-radius:13px; background:var(--sc-card); color:var(--sc-paper); cursor:pointer; }
        .sc-kicker { margin:28px 0 8px; color:var(--sc-gold-bright); font-size:16px; letter-spacing:.01em; }
        .sc-title { margin:0; color:var(--sc-gold-bright); font-size:clamp(36px, 10vw, 54px); line-height:1.02; letter-spacing:-.055em; font-weight:800; text-shadow:0 0 24px var(--sc-gold-shadow); }
         .sc-title-gold { color:#F7BC2D; }
        .sc-tagline { margin:22px 0 0; font-size:17px; color:var(--sc-paper); font-weight:600; }
        .sc-subtext { max-width:230px; margin:8px 0 0; color:var(--sc-muted); font-size:14px; line-height:1.55; }
        .sc-primary { margin-top:22px; align-self:flex-start; display:flex; align-items:center; gap:16px; border:0; border-radius:999px; padding:13px 16px 13px 20px; color:var(--sc-ink); background:var(--sc-gold-gradient); font:700 13px 'Montserrat',sans-serif; cursor:pointer; box-shadow:0 10px 28px var(--sc-gold-shadow); }
        .sc-primary span { display:grid; place-items:center; width:25px; height:25px; border-radius:50%; background:var(--sc-ink); color:var(--sc-gold-bright); }
        .sc-scene { position:relative; display:block; width:100%; height:390px; margin-top:auto; border:0; background:transparent; cursor:pointer; touch-action:manipulation; overflow:hidden; }
        .sc-scene-glow { position:absolute; left:50%; bottom:35px; width:330px; height:220px; border-radius:50%; transform:translateX(-50%); filter:blur(12px); opacity:.7; pointer-events:none; }
        .sc-platform-art { position:absolute; z-index:2; left:50%; bottom:-52px; width:370px; height:370px; object-fit:contain; transform:translateX(-50%); pointer-events:none; }
        .sc-rocket-art { position:absolute; z-index:4; left:50%; top:12px; width:245px; height:245px; object-fit:contain; transform:translateX(-50%); filter:drop-shadow(0 16px 12px rgba(0,0,0,.28)); animation:sc-rocket-hover 3.8s ease-in-out infinite; pointer-events:none; }
        .sc-coin-art { position:absolute; z-index:5; left:68px; top:88px; width:56px; height:56px; object-fit:contain; filter:drop-shadow(0 6px 9px rgba(208,143,20,.18)); animation:sc-coin-drift 4.8s ease-in-out infinite; pointer-events:none; }
        .sc-orbit-art { position:absolute; z-index:5; right:4px; top:45px; width:100px; height:160px; object-fit:contain; filter:drop-shadow(0 6px 10px rgba(208,143,20,.18)); animation:sc-orbit-drift 5.6s ease-in-out infinite; pointer-events:none; }
        @keyframes sc-rocket-hover { 0%,100% { transform:translate(-50%,0) rotate(-4deg); } 50% { transform:translate(-50%,-12px) rotate(1deg); } }
        @keyframes sc-coin-drift { 0%,100% { transform:translate3d(0,0,0) rotate(-2deg); } 50% { transform:translate3d(-5px,-7px,0) rotate(2deg); } }
        @keyframes sc-orbit-drift { 0%,100% { transform:translate3d(0,0,0) rotate(-2deg); } 50% { transform:translate3d(-10px,-11px,0) rotate(4deg); } }
        @media (min-height:760px) { .sc-scene { height:460px; } }
        @media (prefers-reduced-motion:reduce) { .sc-scene *, .sc-scene { animation:none !important; } }
      `}</style>
      <div
        className="sc-intro-inner"
        style={{
          "--sc-ink": T.ink,
          "--sc-card": T.card,
          "--sc-border": T.cardBorder,
          "--sc-gold": T.gold,
          "--sc-gold-bright": T.goldBright,
          "--sc-gold-gradient": T.goldGradient,
          "--sc-gold-shadow": `${T.gold}35`,
          "--sc-paper": T.paper,
          "--sc-muted": T.muted,
        }}
      >
        <button type="button" className="sc-back" onClick={onBack} aria-label="Back to app">
          <ArrowLeft size={18} />
        </button>
        <div className="sc-kicker">Welcome to</div>
        <h1 className="sc-title">Space <span className="sc-title-gold">Coins</span></h1>
        <p className="sc-tagline">Create. Launch. Trade.</p>
        <p className="sc-subtext">Explore the universe of mini meme coins.</p>
        <button type="button" className="sc-primary" onClick={onExplore}>
          Explore Space Coins <span><ArrowRight size={15} /></span>
        </button>
        <RocketScene T={T} active={reacting} onInteract={interact} />
      </div>
    </main>
  );
}