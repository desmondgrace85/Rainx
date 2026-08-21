import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Bell, ChevronDown, CircleDollarSign,
  Home, Plus, Rocket, ShieldCheck, TrendingUp, UserRound, WalletCards
} from "lucide-react";

import planet3d from "./assets/space-coins-planet-3d.png";
import galaxyDogeImage from "./assets/space-coins-galaxy-doge.jpg";
import moonCatImage from "./assets/space-coins-moon-cat.jpg";
import planetPepeImage from "./assets/space-coins-planet-pepe.jpg";
import rocketArtwork from "./assets/space-coins-rocket.png";
import orbitArtwork from "./assets/space-coins-orbit.png";
import platformArtwork from "./assets/space-coins-platform.png";
import coinArtwork from "./assets/space-coins-coin.png";
import rainxLogoTransparent from "./assets/rainx-logo-transparent.png";

const REAL_FLAME_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_3BHloZy6zhOMmqbVkiEIfVkbiDF/hf_20260821_145856_91a13b8e-c366-4951-be01-e7f1846cbbc6.mp4";
const REAL_CLOUD_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_3BHloZy6zhOMmqbVkiDF/hf_20260821_153425_e7dbe97e-35f8-4ada-80e3-d11209f83006.mp4";

const COINS = [
  { name:"GALAXY DOGE", ticker:"GDOGE", price:"$0.000245", change:"+23.14%", image:galaxyDogeImage },
  { name:"MOON CAT", ticker:"MCAT", price:"$0.000182", change:"+12.08%", image:moonCatImage },
  { name:"PLANET PEPE", ticker:"PPEPE", price:"$0.000092", change:"+8.19%", image:planetPepeImage },
];

function stopPull(e) { e.stopPropagation(); }

function NativePage({ children, className="" }) {
  return <main className={`sc2-page ${className}`}
    onTouchStart={stopPull} onTouchMove={stopPull} onTouchEnd={stopPull} onTouchCancel={stopPull}>
    {children}
  </main>;
}

function useEdgeBack(onBack) {
  const ref = useRef(null);
  return {
    onTouchStart:(e)=>{stopPull(e);const t=e.touches[0];ref.current=t.clientX<28?{x:t.clientX,y:t.clientY}:null;},
    onTouchEnd:(e)=>{stopPull(e);if(!ref.current)return;const t=e.changedTouches[0],dx=t.clientX-ref.current.x,dy=Math.abs(t.clientY-ref.current.y);ref.current=null;if(dx>48&&dy<90)onBack?.();},
    onTouchCancel:(e)=>{stopPull(e);ref.current=null;}
  };
}

/* The requested Space Coins screen keeps the center action only. */
function BottomNav({ onCreate }) {
  return (
    <nav className="sc2-nav" aria-label="Space Coins action">
      <button type="button" className="sc2-nav-center" onClick={onCreate} aria-label="Create Space Coin">
        <img src={rainxLogoTransparent} alt="" />
      </button>
    </nav>
  );
}

function DashboardPlanet() {
  return <div className="sc2-planet-wrap" aria-hidden="true">
    <div className="sc2-planet-glow"/>
    <img className="sc2-planet" src={planet3d} alt="" draggable="false"/>
  </div>;
}

function Dashboard({ onCreate }) {
  return (
    <NativePage className="sc2-dashboard">
      <style>{`
        .sc2-page,.sc2-page *{box-sizing:border-box}
        .sc2-page{position:fixed;inset:0;z-index:700;width:100%;height:100dvh;overflow:hidden;background:#fff;color:#111418;font-family:'Montserrat',sans-serif;overscroll-behavior:none;isolation:isolate}
        .sc2-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:none;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:none;padding:calc(10px + env(safe-area-inset-top)) 16px calc(84px + env(safe-area-inset-bottom))}
        .sc2-scroll::-webkit-scrollbar{display:none}
        .sc2-inner{width:min(100%,480px);margin:0 auto}
        .sc2-header{height:48px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .sc2-brand{display:flex;align-items:center;gap:9px;min-width:0}.sc2-brand img{width:29px;height:29px;object-fit:contain}.sc2-brand h1{margin:0;font-size:18px;line-height:1;font-weight:800;letter-spacing:-.45px}
        .sc2-bell{width:38px;height:38px;border:0;background:transparent;color:#111418;display:grid;place-items:center;padding:0}
        .sc2-hero{position:relative;min-height:164px;overflow:hidden;border:1px solid #F0E5C8;border-radius:17px;background:#FFF9EC;padding:22px 18px}
        .sc2-copy{position:relative;z-index:4;width:58%}.sc2-title{margin:0;font-size:19px;line-height:1.18;font-weight:800;letter-spacing:-.6px}.sc2-sub{margin:10px 0 0;max-width:220px;color:#7A7D83;font-size:11px;line-height:1.45;font-weight:500}
        .sc2-create{margin-top:15px;display:inline-flex;align-items:stretch;overflow:hidden;padding:0;border:1px solid #F4D35E;border-radius:9px;background:#fff;color:#C28F18;font:800 11px 'Montserrat',sans-serif;box-shadow:0 1px 2px rgba(0,0,0,.03)}
        .sc2-create-label{display:flex;align-items:center;padding:10px 14px}.sc2-create-arrow{width:43px;display:grid;place-items:center;background:#F4D35E;color:#fff}
        .sc2-planet-wrap{position:absolute;z-index:2;right:-9px;top:2px;width:53%;height:100%;display:grid;place-items:center;pointer-events:none;perspective:2000px}
        .sc2-planet-glow{position:absolute;width:75%;height:70%;border-radius:50%;background:radial-gradient(circle,rgba(244,211,94,.18),transparent 68%);filter:blur(14px)}
        /* Horizontal side-to-side spin without the extreme flat-card effect. */
        .sc2-planet{position:relative;width:158px;height:158px;object-fit:contain;object-position:center;filter:drop-shadow(0 10px 10px rgba(201,145,21,.18));animation:sc2-planet-side-spin 7s linear infinite;transform-style:preserve-3d;backface-visibility:hidden;border:0;outline:0}
        @keyframes sc2-planet-side-spin{from{transform:perspective(2000px) rotateY(0deg)}to{transform:perspective(2000px) rotateY(360deg)}}

        .sc2-shortcuts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0 22px}
        .sc2-shortcut{min-width:0;min-height:72px;padding:9px 4px;border:1px solid #E7E8EA;border-radius:13px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#15181C;font:700 9px 'Montserrat',sans-serif;box-shadow:0 1px 5px rgba(20,24,28,.025);text-align:center}
        .sc2-shortcut svg{width:22px;height:22px;stroke-width:1.8;color:#111418}
        .sc2-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}.sc2-section-title{margin:0;font-size:16px;line-height:1;font-weight:800;letter-spacing:-.35px}.sc2-view{border:0;background:transparent;color:#C28F18;padding:4px 0;font:700 11px 'Montserrat',sans-serif}
        .sc2-coins{overflow:hidden;border:1px solid #E8EAEC;border-radius:15px;background:#fff;box-shadow:0 1px 5px rgba(20,24,28,.025);margin-bottom:23px}.sc2-coin-row{width:100%;min-height:68px;padding:10px 12px;display:flex;align-items:center;gap:10px;border:0;border-bottom:1px solid #ECEDEF;background:#fff;color:#12151A;text-align:left}.sc2-coin-row:last-child{border-bottom:0}
        .sc2-coin-img{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:0 0 auto}.sc2-coin-name{min-width:0;flex:1}.sc2-coin-name strong{display:block;font-size:11px;line-height:1.2;font-weight:800}.sc2-coin-name small{display:block;margin-top:4px;color:#747A81;font-size:10px;font-weight:600}.sc2-value{text-align:right;flex:0 0 auto}.sc2-price{display:block;font-size:11px;font-weight:800}.sc2-change{display:block;margin-top:4px;color:#43A57C;font-size:10px;font-weight:800}
        .sc2-trending{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-bottom:4px}.sc2-trend{height:46px;border:1px solid #E8EAEC;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;gap:5px;color:#14171B;font:800 10px 'Montserrat',sans-serif}.sc2-rank{color:#C28F18}

        .sc2-nav{position:fixed;z-index:20;left:50%;bottom:0;width:min(100%,480px);height:74px;transform:translateX(-50%);padding:7px 7px calc(7px + env(safe-area-inset-bottom));background:rgba(255,255,255,.98);border-top:1px solid #ECEDEF;display:flex;align-items:flex-end;justify-content:center;box-shadow:0 -2px 10px rgba(20,24,28,.035);backdrop-filter:blur(10px)}
        .sc2-nav-center{width:48px;height:48px;margin:-15px auto 0;border:0;border-radius:50%;background:#F4D35E;display:grid;place-items:center;box-shadow:0 6px 16px rgba(244,211,94,.24);padding:0}.sc2-nav-center img{width:29px;height:29px;object-fit:contain;filter:brightness(0) invert(1)}
        @media(max-width:430px){.sc2-scroll{padding-left:16px;padding-right:16px}.sc2-hero{min-height:164px}.sc2-shortcuts{gap:8px}.sc2-nav{height:74px}}
        @media(prefers-reduced-motion:reduce){.sc2-page *{animation:none!important}}
      `}</style>

      <div className="sc2-scroll"><div className="sc2-inner">
        <header className="sc2-header">
          <div className="sc2-brand"><img src={planet3d} alt=""/><h1>Space Coins</h1></div>
          <button type="button" className="sc2-bell" aria-label="Notifications"><Bell size={24} strokeWidth={1.8}/></button>
        </header>

        <section className="sc2-hero">
          <div className="sc2-copy">
            <h2 className="sc2-title">Create Your<br/>Space Coin</h2>
            <p className="sc2-sub">Launch your own mini meme coin<br/>in just a few steps.</p>
            <button type="button" className="sc2-create" onClick={onCreate}><span className="sc2-create-label">Create Coin</span><span className="sc2-create-arrow"><ArrowRight size={17}/></span></button>
          </div>
          <DashboardPlanet/>
        </section>

        <nav className="sc2-shortcuts">
          {[[ShieldCheck,"Top Tokens"],[TrendingUp,"Trending"],[Rocket,"New Launches"],[WalletCards,"My Coins"]].map(([Icon,label])=><button type="button" className="sc2-shortcut" key={label}><Icon/><span>{label}</span></button>)}
        </nav>

        <section>
          <div className="sc2-section-head"><h2 className="sc2-section-title">Top Space Coins</h2><button className="sc2-view">View All</button></div>
          <div className="sc2-coins">{COINS.map(c=><button type="button" className="sc2-coin-row" key={c.ticker}><img className="sc2-coin-img" src={c.image} alt=""/><span className="sc2-coin-name"><strong>{c.name}</strong><small>{c.ticker}</small></span><span className="sc2-value"><span className="sc2-price">{c.price}</span><span className="sc2-change">{c.change}</span></span></button>)}</div>
        </section>

        <section>
          <div className="sc2-section-head"><h2 className="sc2-section-title">Trending</h2><button className="sc2-view">View All</button></div>
          <div className="sc2-trending">{["STARINU","COSMO","MOONME"].map((n,i)=><button className="sc2-trend" key={n}><span className="sc2-rank">#{i+1}</span>{n}</button>)}</div>
        </section>
      </div></div>
      <BottomNav onCreate={onCreate}/>
    </NativePage>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return <label className="sc3-field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;
}

function CreateForm({ onBack }) {
  const [step,setStep]=useState(1);
  const [logo,setLogo]=useState(null);
  const [form,setForm]=useState({name:"",symbol:"",description:"",supply:"1,000,000,000",network:"Solana"});
  const logoUrl=useMemo(()=>logo?URL.createObjectURL(logo):null,[logo]);
  useEffect(()=>()=>{if(logoUrl)URL.revokeObjectURL(logoUrl)},[logoUrl]);
  const valid=form.name.trim().length>=2&&/^[A-Za-z0-9]{2,10}$/.test(form.symbol.trim());
  const edge=useEdgeBack(onBack);

  return <NativePage className="sc3-create">
    <style>{`
      .sc3-create{background:#fff}.sc3-create.sc2-page{position:fixed;inset:0;z-index:700;width:100%;height:100dvh;min-height:100dvh;overflow:hidden;background:#fff;color:#111418;font-family:'Montserrat',sans-serif;overscroll-behavior:none;isolation:isolate}
      .sc3-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:none;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:none;padding:calc(8px + env(safe-area-inset-top)) 18px calc(30px + env(safe-area-inset-bottom))}.sc3-scroll::-webkit-scrollbar{display:none}.sc3-inner{width:min(100%,480px);margin:0 auto}
      .sc3-header{height:52px;display:flex;align-items:center;justify-content:center;position:relative}.sc3-back{position:absolute;left:-4px;width:40px;height:40px;border:0;background:transparent;color:#15181C;display:grid;place-items:center;padding:0}.sc3-title{margin:0;font-size:18px;line-height:1;font-weight:800;letter-spacing:-.45px}

      .sc3-stage{height:310px;position:relative;overflow:hidden;margin-top:2px}.sc3-stage-glow{position:absolute;left:50%;bottom:28px;width:70%;height:42%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,rgba(244,211,94,.22),transparent 70%);filter:blur(17px)}
      .sc3-platform{position:absolute;z-index:1;left:50%;bottom:-28px;width:300px;height:220px;transform:translateX(-50%);object-fit:contain;filter:drop-shadow(0 12px 12px rgba(160,110,10,.12))}
      /* Use the generated cloud video itself. No CSS smoke is added. */
      .sc3-cloud-video{position:absolute;z-index:2;left:50%;bottom:8px;width:330px;height:180px;transform:translateX(-50%);object-fit:cover;mix-blend-mode:screen;filter:brightness(1.08) contrast(.9);opacity:.96;pointer-events:none;mask-image:radial-gradient(ellipse at center,black 55%,transparent 100%);-webkit-mask-image:radial-gradient(ellipse at center,black 55%,transparent 100%)}
      /* Crop the rocket artwork above its baked-in fire. The real flame video is the only flame shown. */
      .sc3-rocket-crop{position:absolute;z-index:5;left:50%;top:34px;width:140px;height:124px;transform:translateX(-50%);overflow:hidden;pointer-events:none;filter:drop-shadow(0 12px 10px rgba(0,0,0,.10));animation:sc3-float 2.8s ease-in-out infinite}
      .sc3-rocket-crop img{display:block;width:140px;height:166px;object-fit:contain;object-position:top center}
      .sc3-flame-video{position:absolute;z-index:4;left:50%;top:151px;width:72px;height:122px;transform:translateX(-50%);object-fit:cover;mix-blend-mode:screen;filter:brightness(1.15) saturate(1.08);opacity:.99;pointer-events:none;mask-image:radial-gradient(ellipse at center,black 42%,transparent 80%);-webkit-mask-image:radial-gradient(ellipse at center,black 42%,transparent 80%)}
      .sc3-side-coin{position:absolute;z-index:7;top:122px;width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 7px 7px rgba(198,145,18,.16));animation:sc3-side-float 3.2s ease-in-out infinite}.sc3-side-left{left:calc(50% - 120px)}.sc3-side-right{right:calc(50% - 120px);animation-delay:-1.6s}
      .sc3-side-art{position:absolute;z-index:3;right:calc(50% - 120px);top:109px;width:72px;height:72px;object-fit:contain;opacity:.98;filter:drop-shadow(0 7px 7px rgba(198,145,18,.14))}
      .sc3-progress-label{text-align:center;color:#70757B;font-size:13px;font-weight:600}.sc3-progress{display:grid;grid-template-columns:repeat(4,1fr);margin:12px 8px 24px}.sc3-progress span{height:4px;background:#E8EAED;position:relative}.sc3-progress span.active{background:#F4D35E}.sc3-progress i{position:absolute;left:0;top:50%;width:8px;height:8px;transform:translate(-50%,-50%);border-radius:50%;background:#E6E8EB}.sc3-progress span.active i{background:#F4D35E}.sc3-progress span:last-child i{left:auto;right:0;transform:translate(50%,-50%)}
      .sc3-upload{width:160px;margin:0 auto 27px;text-align:center}.sc3-upload-circle{width:82px;height:82px;margin:0 auto;border:2px dashed #F4D35E;border-radius:50%;display:grid;place-items:center;color:#D6A21C;background:#FFFDF7;overflow:hidden}.sc3-preview{width:100%;height:100%;object-fit:cover}.sc3-upload-title{margin-top:11px;font-size:15px;font-weight:800}.sc3-upload-sub{margin-top:5px;color:#92969B;font-size:11px;font-weight:500}
      .sc3-fields{display:grid;gap:13px}.sc3-field span{display:block;margin:0 0 6px 2px;color:#7A7F85;font-size:11px;font-weight:600}.sc3-field input,.sc3-field select{width:100%;height:50px;border:1px solid #E6E8EA;border-radius:12px;background:#fff;color:#171A1E;outline:none;padding:0 15px;font:600 13px 'Montserrat',sans-serif;box-shadow:0 1px 4px rgba(20,24,28,.025)}.sc3-field input::placeholder{color:#B0B4B8;font-weight:500}.sc3-select{appearance:none;padding-right:38px!important}.sc3-two{display:grid;grid-template-columns:1fr 1fr;gap:13px}.sc3-select-wrap{position:relative}.sc3-chevron{position:absolute;right:13px;top:50%;transform:translateY(-50%);pointer-events:none}
      .sc3-actions{display:flex;gap:10px;margin-top:14px}.sc3-btn{height:52px;border:0;border-radius:13px;font:800 14px 'Montserrat',sans-serif;display:flex;align-items:center;justify-content:center;gap:10px}.sc3-next,.sc3-launch{flex:1;background:#F4D35E;color:#fff;box-shadow:0 7px 18px rgba(244,211,94,.15)}.sc3-back-btn{flex:0 0 100px;background:#F5F6F7;color:#111418}
      .sc3-review{border:1px solid #E7E9EB;border-radius:15px;padding:15px;display:grid;gap:11px;margin-bottom:16px}.sc3-review-row{display:flex;justify-content:space-between;gap:12px;font-size:12px}.sc3-review-row span{color:#737A80}.sc3-review-row strong{text-align:right;max-width:60%;word-break:break-word}.sc3-check{display:flex;gap:9px;align-items:flex-start;border:1px solid #E7E9EB;border-radius:12px;padding:12px;font-size:12px;line-height:1.45}
      .sc3-success{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}.sc3-success img{width:220px;max-width:75%;animation:sc3-launch 1.8s cubic-bezier(.18,.76,.25,1) both}.sc3-success h1{font-size:25px;margin:18px 0 0}.sc3-success p{font-size:14px;color:#737A80;line-height:1.5}.sc3-success button{margin-top:22px;height:50px;padding:0 22px;border:0;border-radius:25px;background:#F4D35E;color:#fff;font:800 13px 'Montserrat',sans-serif}
      @keyframes sc3-side-float{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-6px) rotate(3deg)}}@keyframes sc3-float{0%,100%{transform:translateX(-50%) translateY(0) rotate(-.3deg)}50%{transform:translateX(-50%) translateY(-5px) rotate(.3deg)}}@keyframes sc3-launch{0%{transform:translateY(100px);opacity:0}20%{opacity:1}100%{transform:translateY(-70px);opacity:1}}
      @media(max-width:430px){.sc3-scroll{padding-left:18px;padding-right:18px}.sc3-stage{height:300px}.sc3-platform{width:300px;height:215px}.sc3-rocket-crop{width:132px;height:118px}.sc3-rocket-crop img{width:132px;height:156px}.sc3-flame-video{top:145px;width:66px;height:112px}.sc3-cloud-video{width:320px;height:174px}.sc3-side-coin{width:30px;height:30px}.sc3-side-left{left:calc(50% - 112px)}.sc3-side-right{right:calc(50% - 112px)}.sc3-side-art{right:calc(50% - 112px);top:101px;width:70px;height:70px}.sc3-two{grid-template-columns:1fr}}
      @media(prefers-reduced-motion:reduce){.sc3-create *{animation:none!important}}
    `}</style>

    <div className="sc3-scroll" {...edge}><div className="sc3-inner">
      <header className="sc3-header"><button type="button" className="sc3-back" onClick={onBack}><ArrowLeft size={24} strokeWidth={1.9}/></button><h1 className="sc3-title">Create Your Space Coin</h1></header>

      <section className="sc3-stage" aria-hidden="true">
        <div className="sc3-stage-glow"/>
        <video className="sc3-cloud-video" src={REAL_CLOUD_VIDEO} autoPlay muted loop playsInline preload="auto"/>
        <img src={platformArtwork} className="sc3-platform" alt="" draggable="false"/>
        <img src={coinArtwork} className="sc3-side-coin sc3-side-left" alt="" draggable="false"/>
        <img src={coinArtwork} className="sc3-side-coin sc3-side-right" alt="" draggable="false"/>
        <img src={orbitArtwork} className="sc3-side-art" alt="" draggable="false"/>
        <video className="sc3-flame-video" src={REAL_FLAME_VIDEO} autoPlay muted loop playsInline preload="auto"/>
        <div className="sc3-rocket-crop"><img src={rocketArtwork} alt="" draggable="false"/></div>
      </section>

      <div className="sc3-progress-label">Step {step} of 4</div>
      <div className="sc3-progress">{[0,1,2,3].map(i=><span key={i} className={step>=i+1?"active":""}><i/></span>)}</div>

      {step===1 && <>
        <div className="sc3-upload">
          <label className="sc3-upload-circle" htmlFor="sc3-logo">{logo?<img src={logoUrl} className="sc3-preview" alt=""/>:<Plus size={28} strokeWidth={1.7}/>}</label>
          <input id="sc3-logo" type="file" accept="image/png,image/jpeg" hidden onChange={e=>{const f=e.target.files?.[0];if(f)setLogo(f)}}/>
          <div className="sc3-upload-title">Upload Coin Logo</div><div className="sc3-upload-sub">PNG, JPG (Max. 5MB)</div>
        </div>
        <div className="sc3-fields">
          <Field label="Coin Name" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Enter coin name"/>
          <Field label="Symbol" value={form.symbol} onChange={v=>setForm(f=>({...f,symbol:v}))} placeholder="Enter symbol (e.g. RXDOG)"/>
          <Field label="Description" value={form.description} onChange={v=>setForm(f=>({...f,description:v}))} placeholder="Tell the world about your coin"/>
          <div className="sc3-two">
            <Field label="Total Supply" value={form.supply} onChange={v=>setForm(f=>({...f,supply:v}))} placeholder="1,000,000,000"/>
            <label className="sc3-field"><span>Network</span><div className="sc3-select-wrap"><select className="sc3-select" value={form.network} onChange={e=>setForm(f=>({...f,network:e.target.value}))}><option>Solana</option><option>Ethereum</option><option>Base</option></select><ChevronDown className="sc3-chevron" size={18}/></div></label>
          </div>
        </div>
      </>}

      {step===2 && <div className="sc3-review"><div className="sc3-review-row"><span>Coin</span><strong>{form.name||"Your Space Coin"}</strong></div><div className="sc3-review-row"><span>Symbol</span><strong>{form.symbol||"—"}</strong></div><div className="sc3-review-row"><span>Network</span><strong>{form.network}</strong></div></div>}
      {step===3 && <><div className="sc3-review"><div className="sc3-review-row"><span>Description</span><strong>{form.description||"—"}</strong></div><div className="sc3-review-row"><span>Total Supply</span><strong>{form.supply}</strong></div><div className="sc3-review-row"><span>Network</span><strong>{form.network}</strong></div></div><label className="sc3-check"><input type="checkbox"/>I confirm the launch details are correct.</label></>}
      {step===4 && <div className="sc3-review"><div className="sc3-review-row"><span>Status</span><strong>Ready to launch</strong></div><div className="sc3-review-row"><span>Coin</span><strong>{form.name||"Your Space Coin"}</strong></div></div>}

      <div className="sc3-actions">
        {step>1&&<button type="button" className="sc3-btn sc3-back-btn" onClick={()=>setStep(s=>s-1)}>Back</button>}
        {step<4?<button type="button" className="sc3-btn sc3-next" onClick={()=>{if(step===1&&!valid)return;setStep(s=>s+1)}}>Next Step <ArrowRight size={19}/></button>:<button type="button" className="sc3-btn sc3-launch" onClick={()=>setStep(5)}>Launch Coin <Rocket size={18}/></button>}
      </div>

      {step===5&&<div className="sc3-success"><img src={rocketArtwork} alt=""/><h1>Your Space Coin is launched!</h1><p>Your launch flow is complete.</p><button type="button" onClick={onBack}>Back to Space Coins</button></div>}
    </div></div>
  </NativePage>;
}

export default function SpaceCoinsDashboard({ onBack }) {
  const [view,setView]=useState("dashboard");
  return view==="create" ? <CreateForm onBack={()=>setView("dashboard")}/> : <Dashboard onCreate={()=>setView("create")}/>;
}
