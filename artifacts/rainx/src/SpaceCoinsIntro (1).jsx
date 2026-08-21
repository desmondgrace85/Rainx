import React, { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import rocketArtwork from "./assets/space-coins-rocket.png";
import orbitArtwork from "./assets/space-coins-orbit.png";
import platformArtwork from "./assets/space-coins-platform.png";
import coinArtwork from "./assets/space-coins-coin.png";

function stopPull(e) { e.stopPropagation(); }

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
    <main className="sc-intro-page"
      onTouchStart={onTouchStart}
      onTouchMove={stopPull}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}>
      <style>{`
        .sc-intro-page,.sc-intro-page *{box-sizing:border-box}
        .sc-intro-page{position:fixed;inset:0;z-index:700;width:100%;height:100dvh;overflow:hidden;background:#fff;color:#111418;font-family:'Montserrat',sans-serif;overscroll-behavior:none;isolation:isolate}
        .sc-intro-scroll{position:absolute;inset:0;overflow:hidden;padding:calc(16px + env(safe-area-inset-top)) 24px calc(8px + env(safe-area-inset-bottom))}
        .sc-intro-inner{width:min(100%,608px);height:100%;margin:0 auto;display:flex;flex-direction:column;min-height:0}
        .sc-intro-back{width:48px;height:48px;flex:0 0 48px;border:1px solid #EEF0F1;border-radius:16px;background:#F8FAFA;color:#15181C;display:grid;place-items:center;padding:0}
        .sc-intro-copy{padding-top:42px;flex:0 0 auto}
        .sc-intro-eyebrow{margin:0 0 6px;color:#E5C55A;font-size:18px;line-height:1.15;font-weight:400;letter-spacing:-.35px}
        .sc-intro-title{margin:0;color:#F4D35E;font-size:39px;line-height:.98;font-weight:800;letter-spacing:-2.2px;text-shadow:0 4px 20px rgba(244,211,94,.18)}
        .sc-intro-heading{margin:30px 0 0;font-size:24px;line-height:1.1;font-weight:700;letter-spacing:-.9px}
        .sc-intro-description{margin:17px 0 0;color:#747A80;font-size:17px;line-height:1.55;font-weight:400;letter-spacing:-.2px}
        .sc-intro-cta{margin-top:28px;width:min(100%,420px);height:58px;border:0;border-radius:31px;background:#F4D35E;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 24px;font:800 16px 'Montserrat',sans-serif;box-shadow:0 12px 30px rgba(244,211,94,.20);-webkit-tap-highlight-color:transparent}
        .sc-intro-cta-arrow{width:44px;height:44px;border-radius:50%;background:#fff;color:#D8B33F;display:grid;place-items:center;flex:0 0 auto}

        /* Reference-matched artwork: larger, closer to CTA, and positioned like the supplied welcome screen. */
        .sc-intro-art{position:relative;flex:1 1 auto;min-height:330px;height:auto;margin:-2px auto 0;width:100%;overflow:visible;pointer-events:none}
        .sc-intro-glow{position:absolute;left:50%;bottom:8px;width:100%;height:68%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,rgba(244,211,94,.20),transparent 68%);filter:blur(18px)}
        .sc-intro-platform{position:absolute;left:50%;bottom:-6px;width:min(116%,500px);height:auto;aspect-ratio:410/270;transform:translateX(-50%);object-fit:contain;filter:drop-shadow(0 14px 14px rgba(198,145,18,.13))}
        .sc-intro-rocket{position:absolute;left:50%;bottom:92px;width:min(70%,255px);height:auto;aspect-ratio:1;transform:translateX(-50%);object-fit:contain;filter:drop-shadow(0 14px 13px rgba(198,145,18,.12));animation:sc-intro-rocket-float 3.6s ease-in-out infinite}
        .sc-intro-orbit{position:absolute;left:50%;bottom:100px;width:min(88%,320px);height:auto;aspect-ratio:245/185;transform:translateX(-50%);object-fit:contain;opacity:.98}
        .sc-intro-coin{position:absolute;left:calc(50% - 150px);bottom:47%;width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 7px 8px rgba(198,145,18,.16));animation:sc-intro-coin-float 3.2s ease-in-out infinite}
        .sc-intro-star{position:absolute;background:#E7B42E;transform:rotate(45deg);animation:sc-intro-twinkle 2.3s ease-in-out infinite}
        .sc-intro-star.s1{left:calc(50% + 112px);bottom:44%;width:19px;height:19px}
        .sc-intro-star.s2{left:calc(50% + 30px);bottom:64%;width:10px;height:10px;animation-delay:-.7s}
        .sc-intro-star.s3{left:calc(50% + 74px);bottom:71%;width:8px;height:8px;animation-delay:-1.1s}
        @keyframes sc-intro-rocket-float{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-6px)}}
        @keyframes sc-intro-coin-float{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-7px) rotate(3deg)}}
        @keyframes sc-intro-twinkle{0%,100%{opacity:.45;transform:rotate(45deg) scale(.82)}50%{opacity:1;transform:rotate(45deg) scale(1.12)}}

        @media(max-width:430px){
          .sc-intro-scroll{padding-left:24px;padding-right:24px}
          .sc-intro-copy{padding-top:42px}
          .sc-intro-title{font-size:39px}
          .sc-intro-heading{font-size:24px}
          .sc-intro-description{font-size:17px}
          .sc-intro-cta{width:100%;height:58px}
          .sc-intro-art{min-height:330px}
          .sc-intro-rocket{width:70%;bottom:86px}
          .sc-intro-orbit{width:90%;bottom:94px}
          .sc-intro-platform{width:118%;max-width:500px;bottom:-8px}
          .sc-intro-coin{left:calc(50% - 145px);width:55px;height:55px}
          .sc-intro-star.s1{left:calc(50% + 100px)}
        }
        @media(max-height:720px) and (max-width:599px){
          .sc-intro-copy{padding-top:34px}
          .sc-intro-heading{margin-top:25px}
          .sc-intro-description{margin-top:14px}
          .sc-intro-cta{margin-top:22px;height:54px}
          .sc-intro-art{min-height:260px}
          .sc-intro-rocket{width:190px;bottom:58px}
          .sc-intro-orbit{width:235px;bottom:64px}
          .sc-intro-platform{width:390px}
          .sc-intro-coin{left:calc(50% - 120px);width:45px;height:45px}
        }
        @media(prefers-reduced-motion:reduce){.sc-intro-page *{animation:none!important}}
      `}</style>

      <div className="sc-intro-scroll">
        <div className="sc-intro-inner">
          <button type="button" className="sc-intro-back" onClick={onBack} aria-label="Back">
            <ArrowLeft size={25} strokeWidth={1.9}/>
          </button>

          <section className="sc-intro-copy">
            <p className="sc-intro-eyebrow">Welcome to</p>
            <h1 className="sc-intro-title">Space Coins</h1>
            <h2 className="sc-intro-heading">Create. Launch. Trade.</h2>
            <p className="sc-intro-description">Explore the universe of mini<br/>meme coins.</p>
            <button type="button" className="sc-intro-cta" onClick={onExplore}>
              <span>Explore Space Coins</span>
              <span className="sc-intro-cta-arrow"><ArrowRight size={23} strokeWidth={2.1}/></span>
            </button>
          </section>

          <div className="sc-intro-art" aria-hidden="true">
            <div className="sc-intro-glow"/>
            <img src={coinArtwork} className="sc-intro-coin" alt="" draggable="false"/>
            <span className="sc-intro-star s1"/>
            <span className="sc-intro-star s2"/>
            <span className="sc-intro-star s3"/>
            <img src={platformArtwork} className="sc-intro-platform" alt="" draggable="false"/>
            <img src={orbitArtwork} className="sc-intro-orbit" alt="" draggable="false"/>
            <img src={rocketArtwork} className="sc-intro-rocket" alt="" draggable="false"/>
          </div>
        </div>
      </div>
    </main>
  );
}
