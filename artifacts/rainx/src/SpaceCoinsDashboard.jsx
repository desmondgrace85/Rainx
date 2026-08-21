import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, Plus } from "lucide-react";
import rocketArtwork from "./assets/space-coins-rocket.png";
import orbitArtwork from "./assets/space-coins-orbit.png";
import platformArtwork from "./assets/space-coins-platform.png";

function useEdgeBack(onBack) {
  const ref = useRef(null);
  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      ref.current = t.clientX < 28 ? { x:t.clientX, y:t.clientY } : null;
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

function RocketStage() {
  return (
    <div className="sc-rocket-stage" aria-hidden="true">
      <div className="sc-stage-glow" />
      <img className="sc-platform" src={platformArtwork} alt="" draggable="false" />
      <div className="sc-flame"><i /><i /><i /></div>
      <img className="sc-orbit" src={orbitArtwork} alt="" draggable="false" />
      <img className="sc-rocket" src={rocketArtwork} alt="" draggable="false" />
      <div className="sc-particles"><b /><b /><b /><b /><b /></div>
    </div>
  );
}

export default function SpaceCoinsDashboard({ onBack }) {
  const [logo, setLogo] = useState(null);
  const edgeBack = useEdgeBack(onBack);

  useEffect(() => {
    document.title = "Create Your Space Coin | RainX";
    return () => { document.title = "RainX"; };
  }, []);

  return (
    <main className="sc-create-page" {...edgeBack}>
      <style>{`
        .sc-create-page,
        .sc-create-page * { box-sizing:border-box; }
        .sc-create-page { position:fixed; inset:0; z-index:300; width:100%; height:100dvh; min-height:100dvh; overflow:hidden; background:#fff; color:#111418; font-family:'Montserrat',sans-serif; overscroll-behavior:none; animation:sc-create-in .24s cubic-bezier(.22,.8,.2,1) both; }
        .sc-create-scroll { position:absolute; inset:0; overflow-y:auto; overflow-x:hidden; overscroll-behavior-y:none; overscroll-behavior-x:none; -webkit-overflow-scrolling:touch; touch-action:pan-y; scrollbar-width:none; padding:calc(8px + env(safe-area-inset-top)) 18px calc(34px + env(safe-area-inset-bottom)); background:#fff; }
        .sc-create-scroll::-webkit-scrollbar { display:none; }
        .sc-create-inner { width:min(100%,680px); margin:0 auto; }
        .sc-create-header { height:52px; display:flex; align-items:center; justify-content:center; position:relative; }
        .sc-back { position:absolute; left:-4px; width:40px; height:40px; border:0; background:transparent; display:grid; place-items:center; color:#15181C; padding:0; }
        .sc-form-title { margin:0; font-size:18px; line-height:1; font-weight:800; letter-spacing:-.45px; }
        .sc-stage { height:345px; display:flex; align-items:flex-start; justify-content:center; }
        .sc-rocket-stage { position:relative; width:min(100%,520px); height:330px; margin-top:2px; overflow:hidden; }
        .sc-stage-glow { position:absolute; left:50%; bottom:36px; width:270px; height:150px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(circle,rgba(230,168,28,.25),transparent 70%); filter:blur(14px); }
        .sc-platform { position:absolute; z-index:2; left:50%; bottom:-42px; width:360px; height:260px; transform:translateX(-50%); object-fit:contain; filter:drop-shadow(0 13px 12px rgba(160,110,10,.13)); }
        .sc-rocket { position:absolute; z-index:5; left:50%; top:34px; width:225px; height:225px; transform:translateX(-50%); object-fit:contain; filter:drop-shadow(0 12px 10px rgba(0,0,0,.12)); animation:sc-rocket-float 2.7s ease-in-out infinite; }
        .sc-orbit { position:absolute; z-index:6; left:50%; top:36px; width:290px; height:220px; transform:translateX(-50%); object-fit:contain; opacity:.95; filter:drop-shadow(0 5px 8px rgba(220,164,28,.14)); animation:sc-orbit-spin 6s linear infinite; }
        .sc-flame { position:absolute; z-index:4; left:50%; top:208px; width:34px; height:70px; transform:translateX(-50%); filter:blur(.25px); animation:sc-flame-pulse .17s ease-in-out infinite alternate; }
        .sc-flame:before { content:""; position:absolute; inset:0 7px 8px; border-radius:55% 55% 45% 45%; background:linear-gradient(180deg,#FFF6B8 0%,#FFD54A 28%,#F0A31A 62%,rgba(240,163,26,0) 100%); filter:blur(2px); }
        .sc-flame i { position:absolute; bottom:3px; width:6px; height:34px; border-radius:50%; background:#FFE989; opacity:.8; }
        .sc-flame i:nth-child(1){left:5px;transform:rotate(8deg)} .sc-flame i:nth-child(2){left:14px;height:45px} .sc-flame i:nth-child(3){right:4px;transform:rotate(-8deg)}
        .sc-particles b { position:absolute; z-index:3; width:4px; height:4px; border-radius:50%; background:#E3AB25; opacity:.65; animation:sc-particle 2.2s ease-in-out infinite; }
        .sc-particles b:nth-child(1){left:31%;top:174px;animation-delay:-.4s}.sc-particles b:nth-child(2){left:38%;top:205px;animation-delay:-1.1s}.sc-particles b:nth-child(3){right:31%;top:188px;animation-delay:-.8s}.sc-particles b:nth-child(4){right:38%;top:155px;animation-delay:-1.5s}.sc-particles b:nth-child(5){left:48%;top:152px;animation-delay:-.2s}
        .sc-progress-label { text-align:center; color:#70757B; font-size:13px; font-weight:600; margin-top:-3px; }
        .sc-progress { display:grid; grid-template-columns:repeat(4,1fr); align-items:center; gap:0; margin:12px 8px 23px; }
        .sc-progress-step { position:relative; height:4px; background:#E8EAED; }
        .sc-progress-step:first-child { border-radius:999px 0 0 999px; } .sc-progress-step:last-child { border-radius:0 999px 999px 0; }
        .sc-progress-step.is-active { background:#DCA41C; }
        .sc-progress-step:before { content:""; position:absolute; left:0; top:50%; width:8px; height:8px; transform:translate(-50%,-50%); border-radius:50%; background:#E6E8EB; }
        .sc-progress-step.is-active:before { background:#DCA41C; }
        .sc-progress-step:last-child:after { content:""; position:absolute; right:0; top:50%; width:8px; height:8px; transform:translate(50%,-50%); border-radius:50%; background:#E6E8EB; }
        .sc-upload { width:112px; margin:0 auto 24px; text-align:center; }
        .sc-upload-circle { width:92px; height:92px; margin:0 auto; border:2px dashed #E5C86D; border-radius:50%; display:grid; place-items:center; color:#D6A21C; background:#FFFDF7; }
        .sc-upload-title { margin-top:10px; font-size:14px; font-weight:800; white-space:nowrap; }
        .sc-upload-sub { margin-top:4px; color:#92969B; font-size:11px; font-weight:500; white-space:nowrap; }
        .sc-logo-preview { width:92px; height:92px; border-radius:50%; object-fit:cover; border:2px solid #E5C86D; }
        .sc-fields { display:grid; gap:13px; }
        .sc-field label { display:block; margin:0 0 6px 2px; color:#7A7F85; font-size:11px; font-weight:600; }
        .sc-input,.sc-select { width:100%; height:50px; border:1px solid #E6E8EA; border-radius:12px; background:#fff; color:#171A1E; outline:none; padding:0 15px; font:600 13px 'Montserrat',sans-serif; box-shadow:0 1px 4px rgba(20,24,28,.025); }
        .sc-input::placeholder { color:#B0B4B8; font-weight:500; }
        .sc-input:focus,.sc-select:focus { border-color:#D9B04A; box-shadow:0 0 0 3px rgba(220,164,28,.10); }
        .sc-two { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
        .sc-select-wrap { position:relative; }
        .sc-select { appearance:none; padding-right:38px; }
        .sc-select-icon { position:absolute; right:13px; top:50%; transform:translateY(-50%); pointer-events:none; color:#202328; }
        .sc-next { width:100%; height:54px; margin-top:14px; border:0; border-radius:13px; background:#DDA51A; color:#fff; display:flex; align-items:center; justify-content:center; gap:14px; font:800 14px 'Montserrat',sans-serif; box-shadow:0 7px 18px rgba(221,165,26,.17); }
        .sc-next:active { transform:scale(.99); }
        .sc-create-page input,.sc-create-page select,.sc-create-page button { -webkit-tap-highlight-color:transparent; }
        @keyframes sc-create-in { from { transform:translate3d(7%,0,0); } to { transform:translate3d(0,0,0); } }
        @keyframes sc-rocket-float { 0%,100% { transform:translateX(-50%) translateY(0) rotate(-.8deg); } 50% { transform:translateX(-50%) translateY(-6px) rotate(.8deg); } }
        @keyframes sc-orbit-spin { from { transform:translateX(-50%) rotate(0deg); } to { transform:translateX(-50%) rotate(360deg); } }
        @keyframes sc-flame-pulse { from { transform:translateX(-50%) scaleY(.88); opacity:.86; } to { transform:translateX(-50%) scaleY(1.12); opacity:1; } }
        @keyframes sc-particle { 0%,100% { transform:translateY(0) scale(.8); opacity:.15; } 50% { transform:translateY(20px) scale(1.25); opacity:.8; } }
        @media (max-width:420px) { .sc-stage { height:315px; } .sc-rocket-stage { height:300px; } .sc-platform { width:330px; } .sc-rocket { width:205px; height:205px; top:28px; } .sc-orbit { width:270px; height:205px; top:29px; } .sc-flame { top:192px; } }
        @media (prefers-reduced-motion:reduce) { .sc-create-page *, .sc-create-page { animation:none !important; transition:none !important; } }
      `}</style>

      <div className="sc-create-scroll">
        <div className="sc-create-inner">
          <header className="sc-create-header">
            <button type="button" className="sc-back" onClick={onBack} aria-label="Back to Space Coins"><ArrowLeft size={24} strokeWidth={2} /></button>
            <h1 className="sc-form-title">Create Your Space Coin</h1>
          </header>

          <section className="sc-stage">
            <RocketStage />
          </section>

          <div className="sc-progress-label">Step 1 of 4</div>
          <div className="sc-progress" aria-label="Step 1 of 4">
            <span className="sc-progress-step is-active" /><span className="sc-progress-step" /><span className="sc-progress-step" /><span className="sc-progress-step" />
          </div>

          <div className="sc-upload">
            <label className="sc-upload-circle" htmlFor="sc-logo-input">
              {logo ? <img className="sc-logo-preview" src={logo} alt="Coin logo preview" /> : <Plus size={34} strokeWidth={1.7} />}
            </label>
            <input id="sc-logo-input" type="file" accept="image/png,image/jpeg" hidden onChange={(e) => { const file=e.target.files?.[0]; if(file) setLogo(URL.createObjectURL(file)); }} />
            <div className="sc-upload-title">Upload Coin Logo</div>
            <div className="sc-upload-sub">PNG, JPG (Max. 5MB)</div>
          </div>

          <div className="sc-fields">
            <div className="sc-field"><label htmlFor="coin-name">Coin Name</label><input id="coin-name" className="sc-input" placeholder="Enter coin name" /></div>
            <div className="sc-field"><label htmlFor="coin-symbol">Symbol</label><input id="coin-symbol" className="sc-input" placeholder="Enter symbol (e.g. RXDOG)" /></div>
            <div className="sc-field"><label htmlFor="coin-description">Description</label><input id="coin-description" className="sc-input" placeholder="Tell the world about your coin" /></div>
            <div className="sc-two">
              <div className="sc-field"><label htmlFor="coin-supply">Total Supply</label><input id="coin-supply" className="sc-input" defaultValue="1,000,000,000" /></div>
              <div className="sc-field"><label htmlFor="coin-network">Network</label><div className="sc-select-wrap"><select id="coin-network" className="sc-select" defaultValue="Solana"><option>Solana</option><option>Ethereum</option><option>Base</option></select><ChevronDown className="sc-select-icon" size={18} /></div></div>
            </div>
          </div>

          <button type="button" className="sc-next" >Next Step <ArrowRight size={19} strokeWidth={2} /></button>
        </div>
      </div>
    </main>
  );
}
