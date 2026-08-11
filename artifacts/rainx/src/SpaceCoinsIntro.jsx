import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import rocketReference from "./assets/space-coins-rocket.jpg";
import rainxLogo from "./assets/rainx-logo-transparent.png";

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

function Star({ style }) {
  return <span className="sc-star" style={style}>✦</span>;
}

function RocketScene({ T, active, onInteract }) {
  return (
    <button
      type="button"
      aria-label="Interact with the launching rocket"
      onClick={onInteract}
      className={`sc-scene sc-rocket-scene${active ? " is-reacting" : ""}`}
    >
      <img className="sc-reference-art" src={rocketReference} alt="" />
      <div className="sc-orbit sc-orbit-one" style={{ borderColor: `${T.gold}30` }} />
      <div className="sc-orbit sc-orbit-two" style={{ borderColor: `${T.goldBright}24` }} />
      <Star style={{ top: "14%", left: "17%", color: T.goldBright }} />
      <Star style={{ top: "24%", right: "17%", color: T.gold }} />
      <Star style={{ top: "43%", left: "8%", color: T.gold }} />
      <Star style={{ top: "51%", right: "8%", color: T.goldBright }} />
      <span className="sc-coin sc-coin-one" style={{ background: `radial-gradient(circle at 32% 28%, ${T.goldBright}, ${T.gold} 64%, ${T.card})`, borderColor: T.goldBright }}>X</span>
      <span className="sc-coin sc-coin-two" style={{ background: `radial-gradient(circle at 32% 28%, ${T.goldBright}, ${T.gold} 64%, ${T.card})`, borderColor: T.goldBright }}>✦</span>
      <span className="sc-coin sc-coin-three" style={{ background: `radial-gradient(circle at 32% 28%, ${T.goldBright}, ${T.gold} 64%, ${T.card})`, borderColor: T.goldBright }}>X</span>
      <div className="sc-rocket-wrap">
        <div className="sc-exhaust sc-exhaust-one" style={{ background: T.goldBright }} />
        <div className="sc-exhaust sc-exhaust-two" style={{ background: T.gold }} />
        <div className="sc-rocket">
          <div className="sc-rocket-window" style={{ borderColor: T.gold, background: T.card }}>X</div>
          <div className="sc-rocket-fin sc-rocket-fin-left" style={{ background: T.gold }} />
          <div className="sc-rocket-fin sc-rocket-fin-right" style={{ background: T.goldBright }} />
          <div className="sc-rocket-body" style={{ background: `linear-gradient(135deg, ${T.paper}, ${T.goldBright} 52%, ${T.gold})` }} />
          <div className="sc-rocket-nose" style={{ borderBottomColor: T.gold }} />
        </div>
      </div>
      <div className="sc-platform" style={{ background: `radial-gradient(ellipse, ${T.gold}55, ${T.gold}10 48%, transparent 72%)`, borderColor: `${T.gold}66` }}>
        <span style={{ background: T.gold }} />
        <span style={{ background: T.goldBright }} />
        <span style={{ background: T.gold }} />
      </div>
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
    document.title = "Space Coins | RainX";
    return () => { document.title = "RainX"; };
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
         .sc-brand { display:flex; align-items:center; gap:9px; color:var(--sc-paper); font-size:18px; font-weight:800; letter-spacing:-.04em; }
         .sc-brand img { width:28px; height:28px; object-fit:contain; }
        .sc-back { width:40px; height:40px; display:grid; place-items:center; border:1px solid var(--sc-border); border-radius:13px; background:var(--sc-card); color:var(--sc-paper); cursor:pointer; }
        .sc-kicker { margin:34px 0 8px; font-size:16px; letter-spacing:.01em; }
        .sc-title { margin:0; font-size:clamp(36px, 10vw, 54px); line-height:1.02; letter-spacing:-.055em; font-weight:800; }
        .sc-title-gold { color:var(--sc-gold-bright); }
        .sc-tagline { margin:22px 0 0; font-size:17px; color:var(--sc-paper); font-weight:600; }
        .sc-subtext { max-width:230px; margin:8px 0 0; color:var(--sc-muted); font-size:14px; line-height:1.55; }
        .sc-primary { margin-top:22px; align-self:flex-start; display:flex; align-items:center; gap:16px; border:0; border-radius:999px; padding:13px 16px 13px 20px; color:var(--sc-ink); background:var(--sc-gold); font:700 13px 'Montserrat',sans-serif; cursor:pointer; box-shadow:0 10px 28px var(--sc-gold-shadow); }
        .sc-primary span { display:grid; place-items:center; width:25px; height:25px; border-radius:50%; background:var(--sc-ink); color:var(--sc-gold-bright); }
        .sc-scene { position:relative; display:block; width:100%; height:390px; margin-top:auto; border:0; background:transparent; cursor:pointer; touch-action:manipulation; }
         .sc-reference-art { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; object-position:center bottom; mix-blend-mode:multiply; pointer-events:none; }
         .sc-rocket-scene > :not(.sc-reference-art) { display:none; }
        .sc-star { position:absolute; z-index:1; font-size:16px; opacity:.85; animation:sc-twinkle 2.8s ease-in-out infinite; }
        .sc-orbit { position:absolute; left:50%; top:53%; width:250px; height:92px; border:1px solid; border-radius:50%; transform:translate(-50%,-50%) rotate(-12deg); }
        .sc-orbit-two { width:188px; height:64px; transform:translate(-50%,-50%) rotate(28deg); }
        .sc-coin { position:absolute; z-index:5; display:grid; place-items:center; width:42px; height:42px; border:2px solid; border-radius:50%; color:var(--sc-card); font-size:14px; font-weight:900; box-shadow:inset -6px -5px 0 rgba(0,0,0,.14), 0 8px 20px var(--sc-gold-shadow); }
        .sc-coin::after { content:""; position:absolute; inset:5px; border:1px solid rgba(255,255,255,.38); border-radius:50%; }
        .sc-coin-one { left:10%; top:39%; animation:sc-float-one 4s ease-in-out infinite; }
        .sc-coin-two { right:13%; top:29%; width:27px; height:27px; font-size:10px; animation:sc-float-two 3.3s ease-in-out infinite .4s; }
        .sc-coin-three { right:10%; top:59%; width:22px; height:22px; font-size:8px; animation:sc-float-three 3.7s ease-in-out infinite .1s; }
        .sc-reacting .sc-coin-one { animation:sc-burst-one .72s cubic-bezier(.2,.8,.2,1); }
        .sc-reacting .sc-coin-two { animation:sc-burst-two .72s cubic-bezier(.2,.8,.2,1); }
        .sc-reacting .sc-coin-three { animation:sc-burst-three .72s cubic-bezier(.2,.8,.2,1); }
        .sc-rocket-wrap { position:absolute; z-index:4; left:50%; top:45%; width:166px; height:230px; transform:translate(-50%,-50%) rotate(-4deg); animation:sc-rocket-hover 3.8s ease-in-out infinite; }
        .sc-rocket { position:absolute; inset:0; filter:drop-shadow(0 16px 11px rgba(0,0,0,.28)); }
        .sc-rocket-body { position:absolute; left:38px; top:32px; width:90px; height:160px; border-radius:55% 55% 45% 45%; transform:rotate(4deg); box-shadow:inset -14px -8px 0 rgba(120,72,16,.15); }
        .sc-rocket-nose { position:absolute; left:51px; top:10px; border-left:32px solid transparent; border-right:32px solid transparent; border-bottom:42px solid; transform:rotate(4deg); }
        .sc-rocket-window { position:absolute; z-index:2; left:61px; top:77px; width:45px; height:45px; display:grid; place-items:center; border:4px solid; border-radius:50%; font-size:14px; font-weight:900; transform:rotate(4deg); box-shadow:0 0 0 4px rgba(255,255,255,.35); }
        .sc-rocket-fin { position:absolute; z-index:3; top:141px; width:38px; height:70px; clip-path:polygon(100% 0, 100% 100%, 0 72%); }
        .sc-rocket-fin-left { left:19px; transform:rotate(11deg); }
        .sc-rocket-fin-right { right:16px; transform:scaleX(-1) rotate(11deg); }
        .sc-exhaust { position:absolute; z-index:-1; left:50%; border-radius:50% 50% 42% 42%; filter:blur(4px); transform:translateX(-50%); }
        .sc-exhaust-one { top:181px; width:42px; height:104px; opacity:.75; animation:sc-flame 1s ease-in-out infinite alternate; }
        .sc-exhaust-two { top:195px; width:25px; height:90px; opacity:.92; animation:sc-flame .75s ease-in-out infinite alternate-reverse; }
        .sc-platform { position:absolute; left:50%; bottom:14px; width:280px; height:58px; border:1px solid; border-radius:50%; transform:translateX(-50%); box-shadow:0 13px 20px rgba(0,0,0,.2); }
        .sc-platform span { position:absolute; bottom:17px; width:7px; height:7px; border-radius:50%; }
        .sc-platform span:nth-child(1) { left:23%; } .sc-platform span:nth-child(2) { left:49%; } .sc-platform span:nth-child(3) { right:23%; }
        @keyframes sc-rocket-hover { 0%,100% { transform:translate(-50%,-50%) rotate(-4deg); } 50% { transform:translate(-50%,-55%) rotate(1deg); } }
        @keyframes sc-flame { to { transform:translateX(-50%) scaleY(1.18) scaleX(.82); opacity:.52; } }
        @keyframes sc-float-one { 50% { transform:translate(7px,-12px) rotate(8deg); } }
        @keyframes sc-float-two { 50% { transform:translate(-5px,12px) rotate(-18deg); } }
        @keyframes sc-float-three { 50% { transform:translate(9px,-7px) rotate(20deg); } }
        @keyframes sc-burst-one { 0% { transform:translate(0); } 55% { transform:translate(-20px,-17px) rotate(-25deg); } 100% { transform:translate(0); } }
        @keyframes sc-burst-two { 0% { transform:translate(0); } 55% { transform:translate(19px,-21px) rotate(28deg); } 100% { transform:translate(0); } }
        @keyframes sc-burst-three { 0% { transform:translate(0); } 55% { transform:translate(18px,18px) rotate(35deg); } 100% { transform:translate(0); } }
        @keyframes sc-twinkle { 50% { opacity:.32; transform:scale(.72) rotate(30deg); } }
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
          "--sc-gold-shadow": `${T.gold}35`,
          "--sc-paper": T.paper,
          "--sc-muted": T.muted,
        }}
      >
         <div className="sc-brand"><img src={rainxLogo} alt="" />RainX</div>
        <button type="button" className="sc-back" onClick={onBack} aria-label="Back to RainX">
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
        <div style={{ position: "absolute", right: 24, bottom: 28, color: `${T.goldBright}88` }} aria-hidden="true">
          <Sparkles size={18} />
        </div>
      </div>
    </main>
  );
}