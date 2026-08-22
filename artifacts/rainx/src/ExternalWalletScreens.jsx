import React, { useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, WalletCards, Check } from "lucide-react";
import coinArtwork from "./assets/space-coins-coin.png";

const GOLD = "#D7A21A";
const GOLD_SOFT = "#F4D35E";
const INK = "#111418";
const MUTED = "#72777D";
const BORDER = "#E9EAEC";

function GoldExternalArt() {
  return (
    <div className="ew-hero-art" aria-hidden="true">
      <div className="ew-ring ew-ring-a" />
      <div className="ew-ring ew-ring-b" />
      <img src={coinArtwork} alt="" className="ew-coin" draggable="false" />
      <span className="ew-star ew-star-a" />
      <span className="ew-star ew-star-b" />
      <span className="ew-star ew-star-c" />
      <span className="ew-dot" />
    </div>
  );
}

function WalletSecurityArt() {
  return (
    <div className="ew-security-art" aria-hidden="true">
      <svg viewBox="0 0 180 180">
        <defs>
          <linearGradient id="ewShieldGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F7D86D" />
            <stop offset=".5" stopColor={GOLD} />
            <stop offset="1" stopColor="#9E6D08" />
          </linearGradient>
        </defs>
        <path d="M90 13 145 34v45c0 39-24 66-55 84-31-18-55-45-55-84V34l55-21Z" fill="#FFFDF7" stroke="url(#ewShieldGold)" strokeWidth="6"/>
        <path d="M90 28 131 44v34c0 29-17 50-41 65-24-15-41-36-41-65V44l41-16Z" fill="#fff" stroke="#E9C65A" strokeWidth="2"/>
        <rect x="61" y="70" width="58" height="48" rx="9" fill="#FFF7DA" stroke={GOLD} strokeWidth="5"/>
        <path d="M72 70V57c0-10 8-18 18-18s18 8 18 18v13" fill="none" stroke={GOLD} strokeWidth="7" strokeLinecap="round"/>
        <circle cx="90" cy="92" r="6" fill={GOLD}/><path d="M90 98v9" stroke={GOLD} strokeWidth="5" strokeLinecap="round"/>
        <path d="M136 28h22" stroke={GOLD} strokeWidth="3" strokeLinecap="round" opacity=".7"/>
        <path d="M148 17v22" stroke={GOLD} strokeWidth="3" strokeLinecap="round" opacity=".7"/>
      </svg>
    </div>
  );
}

function Shell({ children, title, onBack }) {
  return (
    <main className="ew-page">
      <style>{`
        .ew-page,.ew-page *{box-sizing:border-box}
        .ew-page{position:fixed;inset:0;z-index:750;background:#fff;color:${INK};font-family:'Montserrat',sans-serif;overflow:hidden;overscroll-behavior:none}
        .ew-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;padding:calc(8px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));scrollbar-width:none}.ew-scroll::-webkit-scrollbar{display:none}
        .ew-inner{width:min(100%,480px);margin:0 auto}
        .ew-header{height:52px;display:flex;align-items:center;justify-content:center;position:relative}.ew-back{position:absolute;left:0;width:38px;height:38px;border:0;background:transparent;display:grid;place-items:center;color:${INK};padding:0}.ew-title{margin:0;font-size:17px;line-height:1;font-weight:800;letter-spacing:-.4px}
        .ew-tabs{display:grid;grid-template-columns:1fr 1fr;gap:3px;height:28px;padding:3px;border-radius:8px;background:#F4F4F5;margin:2px 0 21px}.ew-tab{border:0;border-radius:6px;background:transparent;color:#676C72;font:600 9px 'Montserrat',sans-serif}.ew-tab.active{background:${GOLD};color:#fff;box-shadow:0 2px 6px rgba(215,162,26,.20)}
        .ew-hero-copy{padding:0 3px}.ew-kicker{margin:0;color:${INK};font-size:19px;line-height:1.05;font-weight:800;letter-spacing:-.65px}.ew-copy{margin:9px 0 0;color:${MUTED};font-size:10px;line-height:1.45;max-width:270px}
        .ew-hero-art{height:170px;position:relative;margin:2px 0 2px;overflow:visible}.ew-coin{position:absolute;z-index:3;left:50%;top:29px;width:116px;height:116px;object-fit:contain;transform:translateX(-50%) rotate(-8deg);filter:drop-shadow(0 12px 10px rgba(176,123,10,.20));animation:ew-float 4s ease-in-out infinite}.ew-ring{position:absolute;left:50%;top:73px;width:150px;height:45px;border:3px solid rgba(215,162,26,.72);border-radius:50%;transform:translate(-50%,-50%) rotate(-18deg);z-index:2}.ew-ring-b{width:135px;height:115px;border-width:2px;transform:translate(-50%,-50%) rotate(52deg);opacity:.52}.ew-star{position:absolute;background:${GOLD};width:6px;height:6px;transform:rotate(45deg)}.ew-star-a{left:19%;top:50px}.ew-star-b{right:13%;top:25px;width:5px;height:5px}.ew-star-c{left:31%;bottom:18px;width:7px;height:7px}.ew-dot{position:absolute;right:25%;bottom:24px;width:4px;height:4px;border-radius:50%;background:${GOLD}}
        .ew-card{background:#fff;border:1px solid ${BORDER};border-radius:15px;box-shadow:0 6px 18px rgba(22,25,29,.055);padding:15px}.ew-wallet-card{display:grid;grid-template-columns:38px 1fr;gap:10px;align-items:start}.ew-lock{width:38px;height:38px;border-radius:11px;background:#FFF6D9;border:1px solid #F2D783;display:grid;place-items:center;color:${GOLD}}.ew-card-title{font-size:11px;font-weight:800}.ew-card-copy{margin-top:4px;color:${MUTED};font-size:9px;line-height:1.45}.ew-connect{grid-column:1/-1;margin-top:4px;width:100%;height:34px;border:0;border-radius:8px;background:${GOLD};color:#fff;font:800 10px 'Montserrat',sans-serif;box-shadow:0 5px 12px rgba(215,162,26,.18)}
        .ew-foot{margin-top:14px;text-align:center;color:#A0A4A8;font-size:8px}

        .ew-wallet-subtitle{text-align:center;color:${MUTED};font-size:10px;margin:1px 0 18px}.ew-list{border:1px solid ${BORDER};border-radius:13px;overflow:hidden;background:#fff}.ew-wallet-row{width:100%;height:48px;border:0;border-bottom:1px solid #EEF0F1;background:#fff;display:flex;align-items:center;gap:10px;padding:0 10px;text-align:left;color:${INK}}.ew-wallet-row:last-child{border-bottom:0}.ew-wallet-logo{width:25px;height:25px;border-radius:7px;display:grid;place-items:center;font-size:13px;font-weight:800}.ew-wallet-name{flex:1;font-size:10px;font-weight:700}.ew-wallet-connect{height:28px;padding:0 12px;border:1px solid #E8D9A6;border-radius:7px;background:#fff;color:${GOLD};font:700 9px 'Montserrat',sans-serif}
        .ew-why{margin-top:18px}.ew-why-title{font-size:11px;font-weight:800}.ew-why-list{margin:9px 0 0;padding:0;list-style:none;display:grid;gap:7px}.ew-why-list li{display:flex;align-items:center;gap:8px;color:${MUTED};font-size:9px}.ew-check{width:12px;height:12px;border-radius:50%;display:grid;place-items:center;border:1px solid #E3C66A;color:${GOLD};flex:0 0 auto}.ew-security-art{position:absolute;right:7px;bottom:-7px;width:130px;height:130px;opacity:.98}.ew-security-art svg{width:100%;height:100%}
        @keyframes ew-float{0%,100%{transform:translateX(-50%) translateY(0) rotate(-8deg)}50%{transform:translateX(-50%) translateY(-5px) rotate(-5deg)}}
        @media(max-width:430px){.ew-scroll{padding-left:16px;padding-right:16px}.ew-hero-art{height:170px}.ew-coin{width:116px;height:116px}.ew-kicker{font-size:19px}}
        @media(prefers-reduced-motion:reduce){.ew-page *{animation:none!important}}
      `}</style>
      <div className="ew-scroll"><div className="ew-inner">
        <header className="ew-header"><button className="ew-back" onClick={onBack} aria-label="Back"><ArrowLeft size={24} strokeWidth={1.9}/></button><h1 className="ew-title">{title}</h1></header>
        {children}
      </div></div>
    </main>
  );
}

function ExternalCoins({ onBack, onConnect }) {
  return <Shell title="Space Coins" onBack={onBack}>
    <div className="ew-tabs"><button className="ew-tab">Space Coins</button><button className="ew-tab active">External Coins</button></div>
    <section className="ew-hero-copy"><h2 className="ew-kicker">Explore<br/>External Coins</h2><p className="ew-copy">Trade popular coins from across<br/>the universe.</p></section>
    <GoldExternalArt/>
    <section className="ew-card ew-wallet-card">
      <div className="ew-lock"><LockKeyhole size={18}/></div>
      <div><div className="ew-card-title">Connect External Wallet</div><p className="ew-card-copy">Connect your external wallet to trade external coins. Your funds stay in your wallet.</p></div>
      <button className="ew-connect" onClick={onConnect}>Connect Wallet</button>
    </section>
  </Shell>;
}

function ConnectWallet({ onBack }) {
  const wallets = [
    ["🦊", "MetaMask", "#F4A261"],
    ["🔷", "Trust Wallet", "#2E63FF"],
    ["◉", "Phantom", "#9B7CFF"],
    ["◉", "Coinbase Wallet", "#2864F0"],
    ["≋", "WalletConnect", "#3E8CFF"],
  ];
  const [connected,setConnected] = useState(null);
  return <Shell title="Connect Wallet" onBack={onBack}>
    <p className="ew-wallet-subtitle">Choose your wallet to connect</p>
    <div className="ew-list">
      {wallets.map(([icon,name])=><div className="ew-wallet-row" key={name}><span className="ew-wallet-logo">{icon}</span><span className="ew-wallet-name">{name}</span><button className="ew-wallet-connect" onClick={()=>setConnected(name)}>{connected===name?<Check size={13}/>:"Connect"}</button></div>)}
    </div>
    <section className="ew-why">
      <div className="ew-why-title">Why connect external wallet?</div>
      <ul className="ew-why-list">
        <li><span className="ew-check">✓</span>You stay in control of your funds</li>
        <li><span className="ew-check">✓</span>Trade 1000+ external coins</li>
        <li><span className="ew-check">✓</span>Fast, secure and decentralized</li>
      </ul>
      <WalletSecurityArt/>
    </section>
  </Shell>;
}

export default function ExternalWalletScreens({ initialScreen="external", onBack }) {
  const [screen,setScreen] = useState(initialScreen);
  if (screen === "wallet") return <ConnectWallet onBack={()=>setScreen("external")}/>;
  return <ExternalCoins onBack={onBack} onConnect={()=>setScreen("wallet")}/>;
}
