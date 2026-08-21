import React, { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import rocketArtwork from "./assets/space-coins-rocket.jpg";
import rainxLogoTransparent from "./assets/rainx-logo-transparent.png";

function stopOuterPullRefresh(e) {
  e.stopPropagation();
}

function LaunchArtwork() {
  return (
    <div className="sc-welcome-art" aria-hidden="true">
      <div className="sc-welcome-glow" />
      <div className="sc-welcome-stars">
        <span className="s1" /><span className="s2" /><span className="s3" />
        <span className="s4" /><span className="s5" />
      </div>
      <img
        src={rocketArtwork}
        className="sc-welcome-rocket-art"
        alt=""
        draggable="false"
      />
    </div>
  );
}

export default function SpaceCoinsIntro({ onExplore, onBack }) {
  const edgeRef = useRef(null);

  useEffect(() => {
    document.title = "Space Coins | RainX";
    return () => { document.title = "RainX"; };
  }, []);

  const onTouchStart = (e) => {
    stopOuterPullRefresh(e);
    const t = e.touches[0];
    edgeRef.current = t.clientX < 28 ? { x: t.clientX, y: t.clientY } : null;
  };

  const onTouchEnd = (e) => {
    stopOuterPullRefresh(e);
    if (!edgeRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - edgeRef.current.x;
    const dy = Math.abs(t.clientY - edgeRef.current.y);
    edgeRef.current = null;
    if (dx > 48 && dy < 90) onBack?.();
  };

  return (
    <main
      className="sc-welcome-page"
      onTouchStart={onTouchStart}
      onTouchMove={stopOuterPullRefresh}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <style>{`
        .sc-welcome-page,
        .sc-welcome-page * { box-sizing:border-box; }

        .sc-welcome-page {
          position:fixed;
          inset:0;
          z-index:700;
          width:100%;
          height:100dvh;
          min-height:100dvh;
          overflow:hidden;
          background:#fff;
          color:#111418;
          font-family:'Montserrat',sans-serif;
          overscroll-behavior:none;
          -webkit-overflow-scrolling:auto;
          isolation:isolate;
        }

        .sc-welcome-scroll {
          width:100%;
          height:100%;
          overflow-y:auto;
          overflow-x:hidden;
          overscroll-behavior-y:none;
          overscroll-behavior-x:none;
          -webkit-overflow-scrolling:touch;
          touch-action:pan-y;
          scrollbar-width:none;
          padding:
            calc(18px + env(safe-area-inset-top))
            24px
            calc(28px + env(safe-area-inset-bottom));
        }
        .sc-welcome-scroll::-webkit-scrollbar { display:none; }

        .sc-welcome-inner {
          width:min(100%,640px);
          min-height:100%;
          margin:0 auto;
          display:flex;
          flex-direction:column;
        }

        .sc-welcome-back {
          width:52px;
          height:52px;
          border:1px solid #EEF0F1;
          border-radius:17px;
          background:#F8FAFA;
          color:#15181C;
          display:grid;
          place-items:center;
          padding:0;
          flex:0 0 auto;
        }

        .sc-welcome-copy {
          padding-top:64px;
          position:relative;
          z-index:3;
        }

        .sc-welcome-eyebrow {
          margin:0 0 8px;
          color:#E5C55A;
          font-size:20px;
          line-height:1.15;
          font-weight:400;
          letter-spacing:-.5px;
        }

        .sc-welcome-title {
          margin:0;
          color:#F4D35E;
          font-size:43px;
          line-height:.98;
          font-weight:800;
          letter-spacing:-2.4px;
          text-shadow:0 4px 20px rgba(244,211,94,.18);
        }

        .sc-welcome-heading {
          margin:54px 0 0;
          color:#111418;
          font-size:26px;
          line-height:1.1;
          font-weight:700;
          letter-spacing:-1px;
        }

        .sc-welcome-description {
          margin:23px 0 0;
          max-width:410px;
          color:#747A80;
          font-size:19px;
          line-height:1.55;
          font-weight:400;
          letter-spacing:-.3px;
        }

        .sc-welcome-cta {
          margin-top:42px;
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
        }

        .sc-welcome-cta-arrow {
          width:50px;
          height:50px;
          border-radius:50%;
          background:#fff;
          color:#D8B33F;
          display:grid;
          place-items:center;
          flex:0 0 auto;
        }

        .sc-welcome-art {
          position:relative;
          width:min(100%,640px);
          height:620px;
          margin:-8px auto 0;
          overflow:visible;
          pointer-events:none;
          display:flex;
          align-items:flex-end;
          justify-content:center;
        }

        .sc-welcome-glow {
          position:absolute;
          left:50%;
          bottom:56px;
          width:75%;
          height:55%;
          transform:translateX(-50%);
          border-radius:50%;
          background:radial-gradient(circle,rgba(244,211,94,.22),transparent 68%);
          filter:blur(20px);
        }

        .sc-welcome-rocket-art {
          position:absolute;
          left:50%;
          bottom:0;
          width:min(100%,620px);
          height:100%;
          transform:translateX(-50%);
          object-fit:contain;
          object-position:center bottom;
          filter:drop-shadow(0 16px 18px rgba(198,145,18,.12));
          animation:sc-welcome-float 3.8s ease-in-out infinite;
        }

        .sc-welcome-stars span {
          position:absolute;
          z-index:2;
          display:block;
          background:#E7B42E;
          transform:rotate(45deg);
          animation:sc-welcome-twinkle 2.4s ease-in-out infinite;
        }
        .sc-welcome-stars .s1 { width:10px;height:10px;left:31%;top:30%; }
        .sc-welcome-stars .s2 { width:7px;height:7px;right:26%;top:38%;animation-delay:-.7s; }
        .sc-welcome-stars .s3 { width:14px;height:14px;right:18%;top:50%;animation-delay:-1.3s; }
        .sc-welcome-stars .s4 { width:6px;height:6px;left:24%;top:48%;animation-delay:-1.8s; }
        .sc-welcome-stars .s5 { width:8px;height:8px;left:48%;top:20%;animation-delay:-.4s; }

        .sc-welcome-page button {
          -webkit-tap-highlight-color:transparent;
          cursor:pointer;
        }
        .sc-welcome-page button:active {
          transform:scale(.985);
        }

        @keyframes sc-welcome-float {
          0%,100% { transform:translateX(-50%) translateY(0); }
          50% { transform:translateX(-50%) translateY(-7px); }
        }
        @keyframes sc-welcome-twinkle {
          0%,100% { opacity:.45; transform:rotate(45deg) scale(.82); }
          50% { opacity:1; transform:rotate(45deg) scale(1.12); }
        }

        @media (max-width:430px) {
          .sc-welcome-scroll { padding-left:24px; padding-right:24px; }
          .sc-welcome-copy { padding-top:60px; }
          .sc-welcome-title { font-size:39px; }
          .sc-welcome-heading { margin-top:48px; font-size:24px; }
          .sc-welcome-description { font-size:17px; }
          .sc-welcome-cta { height:64px; font-size:16px; padding-left:25px; }
          .sc-welcome-art { height:570px; margin-top:-2px; }
        }

        @media (prefers-reduced-motion:reduce) {
          .sc-welcome-page *,
          .sc-welcome-page { animation:none !important; transition:none !important; }
        }
      `}</style>

      <div className="sc-welcome-scroll">
        <div className="sc-welcome-inner">
          <button
            type="button"
            className="sc-welcome-back"
            onClick={onBack}
            aria-label="Back"
          >
            <ArrowLeft size={28} strokeWidth={1.9} />
          </button>

          <section className="sc-welcome-copy">
            <p className="sc-welcome-eyebrow">Welcome to</p>
            <h1 className="sc-welcome-title">Space Coins</h1>
            <h2 className="sc-welcome-heading">Create. Launch. Trade.</h2>
            <p className="sc-welcome-description">
              Explore the universe of mini<br className="sc-welcome-break" />
              meme coins.
            </p>

            <button type="button" className="sc-welcome-cta" onClick={onExplore}>
              <span>Explore Space Coins</span>
              <span className="sc-welcome-cta-arrow">
                <ArrowRight size={24} strokeWidth={2.1} />
              </span>
            </button>
          </section>

          <LaunchArtwork />
        </div>
      </div>
    </main>
  );
}
