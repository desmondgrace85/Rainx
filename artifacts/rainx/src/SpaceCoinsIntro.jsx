import React, { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import rocketArtwork from "./assets/space-coins-rocket.png";
import orbitArtwork from "./assets/space-coins-orbit.png";
import platformArtwork from "./assets/space-coins-platform.png";
import coinArtwork from "./assets/space-coins-coin.png";

function stopPull(e) {
  e.stopPropagation();
}

export default function SpaceCoinsIntro({ onExplore, onBack }) {
  const edge = useRef(null);

  useEffect(() => {
    document.title = "Space Coins | RainX";
    return () => { document.title = "RainX"; };
  }, []);

  const onTouchStart = (e) => {
    stopPull(e);
    const t = e.touches[0];
    edge.current = t.clientX < 28 ? { x: t.clientX, y: t.clientY } : null;
  };

  const onTouchEnd = (e) => {
    stopPull(e);
    if (!edge.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - edge.current.x;
    const dy = Math.abs(t.clientY - edge.current.y);
    edge.current = null;
    if (dx > 48 && dy < 90) onBack?.();
  };

  return (
    <main
      className="sc-intro-page"
      onTouchStart={onTouchStart}
      onTouchMove={stopPull}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <style>{`
        .sc-intro-page,
        .sc-intro-page * { box-sizing:border-box; }

        .sc-intro-page {
          position:fixed;
          inset:0;
          z-index:700;
          width:100%;
          height:100dvh;
          overflow:hidden;
          background:#fff;
          color:#111418;
          font-family:'Montserrat',sans-serif;
          overscroll-behavior:none;
          isolation:isolate;
        }

        .sc-intro-scroll {
          position:absolute;
          inset:0;
          overflow-y:auto;
          overflow-x:hidden;
          overscroll-behavior:none;
          -webkit-overflow-scrolling:touch;
          touch-action:pan-y;
          scrollbar-width:none;
          padding:
            calc(18px + env(safe-area-inset-top))
            48px
            calc(24px + env(safe-area-inset-bottom));
        }
        .sc-intro-scroll::-webkit-scrollbar { display:none; }

        .sc-intro-inner {
          width:min(100%,608px);
          min-height:100%;
          margin:0 auto;
        }

        .sc-intro-back {
          width:52px;
          height:52px;
          border:1px solid #EEF0F1;
          border-radius:17px;
          background:#F8FAFA;
          color:#15181C;
          display:grid;
          place-items:center;
          padding:0;
        }

        .sc-intro-copy {
          padding-top:58px;
        }

        .sc-intro-eyebrow {
          margin:0 0 7px;
          color:#E5C55A;
          font-size:20px;
          line-height:1.15;
          font-weight:400;
          letter-spacing:-.45px;
        }

        .sc-intro-title {
          margin:0;
          color:#F4D35E;
          font-size:43px;
          line-height:.98;
          font-weight:800;
          letter-spacing:-2.4px;
          text-shadow:0 4px 20px rgba(244,211,94,.18);
        }

        .sc-intro-heading {
          margin:52px 0 0;
          font-size:26px;
          line-height:1.1;
          font-weight:700;
          letter-spacing:-1px;
        }

        .sc-intro-description {
          margin:22px 0 0;
          color:#747A80;
          font-size:19px;
          line-height:1.55;
          font-weight:400;
          letter-spacing:-.25px;
        }

        .sc-intro-cta {
          margin-top:41px;
          width:min(100%,420px);
          height:68px;
          border:0;
          border-radius:36px;
          background:#F4D35E;
          color:#fff;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 9px 0 28px;
          font:800 17px 'Montserrat',sans-serif;
          box-shadow:0 12px 30px rgba(244,211,94,.20);
          -webkit-tap-highlight-color:transparent;
        }

        .sc-intro-cta-arrow {
          width:50px;
          height:50px;
          border-radius:50%;
          background:#fff;
          color:#D8B33F;
          display:grid;
          place-items:center;
          flex:0 0 auto;
        }

        .sc-intro-art {
          position:relative;
          height:500px;
          margin:0 auto;
          overflow:hidden;
          pointer-events:none;
        }

        .sc-intro-glow {
          position:absolute;
          left:50%;
          bottom:35px;
          width:80%;
          height:42%;
          transform:translateX(-50%);
          border-radius:50%;
          background:radial-gradient(circle,rgba(244,211,94,.24),transparent 68%);
          filter:blur(20px);
        }

        .sc-intro-platform {
          position:absolute;
          left:50%;
          bottom:-30px;
          width:410px;
          height:270px;
          transform:translateX(-50%);
          object-fit:contain;
          filter:drop-shadow(0 14px 14px rgba(198,145,18,.13));
        }

        .sc-intro-rocket {
          position:absolute;
          left:50%;
          bottom:72px;
          width:215px;
          height:215px;
          transform:translateX(-50%);
          object-fit:contain;
          filter:drop-shadow(0 14px 13px rgba(198,145,18,.12));
          animation:sc-intro-rocket-float 3.6s ease-in-out infinite;
        }

        .sc-intro-orbit {
          position:absolute;
          left:50%;
          bottom:82px;
          width:245px;
          height:185px;
          transform:translateX(-50%);
          object-fit:contain;
          opacity:.96;
          animation:sc-intro-orbit-spin 8s linear infinite;
        }

        .sc-intro-coin {
          position:absolute;
          left:22%;
          top:41%;
          width:38px;
          height:38px;
          object-fit:contain;
          filter:drop-shadow(0 7px 8px rgba(198,145,18,.16));
          animation:sc-intro-coin-float 3.2s ease-in-out infinite;
        }

        .sc-intro-star {
          position:absolute;
          width:11px;
          height:11px;
          background:#E7B42E;
          transform:rotate(45deg);
          animation:sc-intro-twinkle 2.3s ease-in-out infinite;
        }
        .sc-intro-star.s1 { right:25%; top:44%; }
        .sc-intro-star.s2 { left:35%; top:31%; width:7px; height:7px; animation-delay:-.7s; }
        .sc-intro-star.s3 { right:31%; top:28%; width:6px; height:6px; animation-delay:-1.1s; }

        @keyframes sc-intro-rocket-float {
          0%,100% { transform:translateX(-50%) translateY(0); }
          50% { transform:translateX(-50%) translateY(-7px); }
        }
        @keyframes sc-intro-orbit-spin {
          from { transform:translateX(-50%) rotate(0deg); }
          to { transform:translateX(-50%) rotate(360deg); }
        }
        @keyframes sc-intro-coin-float {
          0%,100% { transform:translateY(0) rotate(-3deg); }
          50% { transform:translateY(-9px) rotate(3deg); }
        }
        @keyframes sc-intro-twinkle {
          0%,100% { opacity:.45; transform:rotate(45deg) scale(.82); }
          50% { opacity:1; transform:rotate(45deg) scale(1.12); }
        }

        @media (max-width:430px) {
          .sc-intro-scroll { padding-left:24px; padding-right:24px; }
          .sc-intro-copy { padding-top:60px; }
          .sc-intro-title { font-size:39px; }
          .sc-intro-heading { margin-top:48px; font-size:24px; }
          .sc-intro-description { font-size:17px; }
          .sc-intro-cta { height:64px; font-size:16px; padding-left:25px; }
          .sc-intro-art { height:430px; }
          .sc-intro-platform { width:330px; height:220px; bottom:-12px; }
          .sc-intro-rocket { width:185px; height:185px; bottom:55px; }
          .sc-intro-orbit { width:220px; height:165px; bottom:68px; }
        }

        @media (prefers-reduced-motion:reduce) {
          .sc-intro-page * { animation:none !important; }
        }
      `}</style>

      <div className="sc-intro-scroll">
        <div className="sc-intro-inner">
          <button type="button" className="sc-intro-back" onClick={onBack} aria-label="Back">
            <ArrowLeft size={28} strokeWidth={1.9} />
          </button>

          <section className="sc-intro-copy">
            <p className="sc-intro-eyebrow">Welcome to</p>
            <h1 className="sc-intro-title">Space Coins</h1>
            <h2 className="sc-intro-heading">Create. Launch. Trade.</h2>
            <p className="sc-intro-description">
              Explore the universe of mini<br />meme coins.
            </p>

            <button type="button" className="sc-intro-cta" onClick={onExplore}>
              <span>Explore Space Coins</span>
              <span className="sc-intro-cta-arrow">
                <ArrowRight size={24} strokeWidth={2.1} />
              </span>
            </button>
          </section>

          <div className="sc-intro-art" aria-hidden="true">
            <div className="sc-intro-glow" />
            <img src={coinArtwork} className="sc-intro-coin" alt="" draggable="false" />
            <span className="sc-intro-star s1" />
            <span className="sc-intro-star s2" />
            <span className="sc-intro-star s3" />
            <img src={platformArtwork} className="sc-intro-platform" alt="" draggable="false" />
            <img src={orbitArtwork} className="sc-intro-orbit" alt="" draggable="false" />
            <img src={rocketArtwork} className="sc-intro-rocket" alt="" draggable="false" />
          </div>
        </div>
      </div>
    </main>
  );
}
