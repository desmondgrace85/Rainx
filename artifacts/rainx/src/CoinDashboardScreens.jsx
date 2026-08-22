import React, { useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Info, Search, SlidersHorizontal } from "lucide-react";

const GOLD = "#D7A21A";
const LIGHT_GOLD = "#FFF7DA";
const INK = "#111418";
const MUTED = "#747A80";
const BORDER = "#E9EAEC";
const GREEN = "#3E9C76";
const RED = "#D94C4C";

const holders = [
  ["7xK...9a3b", "8.45%", "84,500,000"], ["GdL...8kL2", "6.21%", "62,100,000"],
  ["Fh3...9mN7", "4.32%", "43,200,000"], ["9dA...3jK1", "3.85%", "38,500,000"],
  ["HkL...2pQ8", "2.98%", "29,800,000"], ["Js9...7aD4", "2.41%", "24,100,000"],
  ["2kM...8xP6", "1.89%", "18,900,000"], ["9nB...1dQ2", "1.52%", "15,200,000"],
  ["Kd3...9pZ1", "1.33%", "13,300,000"], ["8sL...6mT5", "1.29%", "12,900,000"],
];

function stop(e) { e.stopPropagation(); }

function NativeFrame({ children, onBack, title, right }) {
  return (
    <main className="cd-shell" onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop} onTouchCancel={stop}>
      <style>{`
        .cd-shell,.cd-shell *{box-sizing:border-box}
        .cd-shell{position:fixed;inset:0;z-index:1200;background:#fff;color:${INK};font-family:'Montserrat',sans-serif;overflow:hidden;overscroll-behavior:none}
        .cd-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:none;padding:calc(8px + env(safe-area-inset-top)) 14px calc(28px + env(safe-area-inset-bottom));touch-action:pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .cd-scroll::-webkit-scrollbar{display:none}.cd-inner{width:100%;max-width:430px;margin:0 auto}
        .cd-header{height:54px;display:flex;align-items:center;justify-content:center;position:relative}.cd-back{position:absolute;left:0;width:40px;height:40px;border:0;background:transparent;display:grid;place-items:center}.cd-title{font-size:20px;font-weight:800;margin:0}.cd-right{position:absolute;right:0;border:0;background:transparent;color:${INK};display:grid;place-items:center;width:38px;height:38px}
        .cd-card{border:1px solid ${BORDER};border-radius:14px;background:#fff;box-shadow:0 2px 9px rgba(16,20,24,.035);padding:13px}.cd-soft{background:#FAFAF9}
        .cd-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.cd-stat{border:1px solid ${BORDER};border-radius:10px;padding:9px 8px}.cd-stat small{display:block;color:${MUTED};font-size:9px}.cd-stat strong{display:block;margin-top:4px;font-size:12px}
        .cd-pillrow{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:10px 0}.cd-pill{height:31px;border:1px solid ${BORDER};border-radius:9px;background:#fff;font:700 9px 'Montserrat';color:${INK}}.cd-pill.active{background:${GOLD};border-color:${GOLD};color:#fff}
        .cd-section{margin-top:13px}.cd-section-title{margin:0 0 8px;font-size:13px;font-weight:800}.cd-row{min-height:38px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #F0F1F2;padding:7px 0;font-size:10px}.cd-row:last-child{border-bottom:0}.cd-muted{color:${MUTED}}
        .cd-btn{height:42px;border:0;border-radius:10px;background:${GOLD};color:#fff;font:800 11px 'Montserrat';width:100%;box-shadow:0 7px 14px rgba(215,162,26,.18)}
        .cd-input{width:100%;height:40px;border:1px solid ${BORDER};border-radius:10px;padding:0 11px;font:600 11px 'Montserrat';outline:none}.cd-field{display:grid;gap:5px;margin-top:9px}.cd-field span{font-size:9px;color:${MUTED}}
        .cd-alert{border:1px solid #F6D1D1;background:#FFF4F4;color:${RED};border-radius:10px;padding:11px;font-size:10px;line-height:1.45}
        .cd-chart{height:170px;position:relative;margin-top:8px;border-bottom:1px solid #EEE;background:linear-gradient(180deg,rgba(215,162,26,.06),rgba(215,162,26,0))}.cd-chart::before{content:"";position:absolute;left:0;right:0;bottom:17px;height:120px;background:linear-gradient(160deg,transparent 12%,rgba(215,162,26,.08) 45%,rgba(215,162,26,.11) 78%,transparent 100%);clip-path:polygon(0 92%,5% 68%,10% 78%,16% 51%,22% 67%,28% 31%,36% 45%,43% 26%,49% 51%,57% 38%,66% 58%,74% 27%,82% 42%,89% 12%,95% 28%,100% 4%,100% 100%,0 100%)}.cd-chart-line{position:absolute;left:0;right:0;bottom:31px;height:110px;overflow:hidden}.cd-chart-line svg{width:100%;height:100%}
        .cd-bars{display:flex;align-items:flex-end;gap:4px;height:88px;margin-top:8px}.cd-bar{flex:1;background:${GOLD};border-radius:3px 3px 0 0;opacity:.88}
        .cd-table{overflow:hidden;border:1px solid ${BORDER};border-radius:13px}.cd-table-row{display:grid;grid-template-columns:1.2fr .8fr .8fr;padding:10px 11px;border-bottom:1px solid #F0F1F2;font-size:10px}.cd-table-row:last-child{border-bottom:0}
        .cd-app-nav{position:sticky;bottom:0;margin:16px -14px -28px;padding:8px 8px calc(8px + env(safe-area-inset-bottom));background:rgba(255,255,255,.98);border-top:1px solid #EEE;display:grid;grid-template-columns:repeat(5,1fr);align-items:end;gap:3px;backdrop-filter:blur(12px)}.cd-app-nav button{border:0;background:transparent;color:#73777C;height:36px;font:700 8px 'Montserrat'}.cd-app-nav .center{width:40px;height:40px;margin:-7px auto 0;border-radius:50%;background:#D7A21A;color:#fff;font-size:17px}
.cd-bottom{position:sticky;bottom:0;margin:18px -14px -28px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.98);border-top:1px solid #EEE;backdrop-filter:blur(12px);display:flex;gap:8px}.cd-bottom button{flex:1;height:38px;border:1px solid ${BORDER};background:#fff;border-radius:10px;font:700 10px 'Montserrat';color:${INK}}.cd-bottom .gold{background:${GOLD};border-color:${GOLD};color:#fff}
        .cd-subtabs{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:#F3F3F4;padding:3px;border-radius:10px;margin:8px 0 14px}.cd-subtab{height:35px;border:0;border-radius:8px;background:transparent;font:700 9px 'Montserrat';color:${MUTED}}.cd-subtab.active{background:${GOLD};color:#fff}
        .cd-share{display:grid;place-items:center;padding:10px 0}.cd-share img{width:120px;height:120px;object-fit:contain;border:1px solid ${BORDER};border-radius:10px}.cd-link{border:1px solid ${BORDER};border-radius:10px;height:38px;padding:0 10px;display:flex;align-items:center;justify-content:space-between;font-size:9px;margin-top:10px}.cd-share-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}.cd-share-actions button{height:34px;border:1px solid ${BORDER};border-radius:9px;background:#fff;font-size:8px}
      `}</style>
      <div className="cd-scroll"><div className="cd-inner">
        <header className="cd-header"><button className="cd-back" onClick={onBack} aria-label="Back"><ArrowLeft size={24}/></button><h1 className="cd-title">{title}</h1>{right && <button className="cd-right">{right}</button>}</header>
        {children}
        <nav className="cd-app-nav"><button>Home</button><button>Space Coins</button><button className="center">✦</button><button>Wallet</button><button>Profile</button></nav>
      </div></div>
    </main>
  );
}

function DashboardHome() {
  return <>
    <div className="cd-card" style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center"}}><div><div style={{fontSize:11,fontWeight:800}}>STAR DOGE <span style={{color:GREEN,fontSize:8,marginLeft:5}}>Live</span></div><div className="cd-muted" style={{fontSize:9,marginTop:3}}>SDOGE</div><div style={{fontSize:22,fontWeight:800,marginTop:7}}>$0.00241 <span style={{fontSize:9,color:GREEN}}>+18.27%</span></div></div><div style={{fontSize:10,color:MUTED}}>24h</div><div style={{gridColumn:"1/-1"}} className="cd-chart"><div className="cd-chart-line"><svg viewBox="0 0 500 120" preserveAspectRatio="none"><polyline fill="none" stroke={GOLD} strokeWidth="3" points="0,98 22,84 47,93 72,71 98,78 120,60 146,67 173,45 202,60 230,48 259,69 286,44 314,53 339,42 366,57 394,32 422,24 451,14 475,8 500,3"/></svg></div></div></div>
    <div className="cd-pillrow">{["1H","24H","7D","30D","ALL"].map(x=><button key={x} className={`cd-pill ${x==="24H"?"active":""}`}>{x}</button>)}</div>
    <div className="cd-grid3"><div className="cd-stat"><small>Market Cap</small><strong>$2.41M</strong></div><div className="cd-stat"><small>Holders</small><strong>2,845</strong></div><div className="cd-stat"><small>24h Volume</small><strong>$254.8K</strong></div><div className="cd-stat"><small>Liquidity</small><strong>$184K</strong></div><div className="cd-stat"><small>Transactions</small><strong>12,458</strong></div><div className="cd-stat"><small>Circulating Supply</small><strong>420.6M</strong></div></div>
    <div className="cd-section cd-card"><h3 className="cd-section-title">Overview</h3>{[["Total Supply","1,000,000,000 SDOGE"],["Creator Fee","2%"],["Created On","May 12, 2025"],["Network","Solana"]].map(([a,b])=><div className="cd-row" key={a}><span className="cd-muted">{a}</span><strong>{b}</strong></div>)}</div>
    <div className="cd-bottom"><button className="gold">Manage Your Coin</button><button style={{maxWidth:48}}>⌁</button></div>
  </>;
}

function Liquidity({remove=false}) {
  if (remove) return <><div className="cd-alert">Removing liquidity will reduce your pool share and may affect price stability.</div><div className="cd-section cd-card"><h3 className="cd-section-title">Your Liquidity</h3><div className="cd-grid3"><div className="cd-stat"><small>Pool Share</small><strong>24.58%</strong></div><div className="cd-stat"><small>LP Tokens</small><strong>8,945.32</strong></div><div className="cd-stat"><small>Value</small><strong>$24.58K</strong></div></div></div><div className="cd-section cd-card"><h3 className="cd-section-title">You Will Receive</h3><div className="cd-grid3"><div className="cd-stat"><small>SDOGE</small><strong>10,000,000</strong></div><div className="cd-stat"><small>USDT</small><strong>2,450</strong></div><div className="cd-stat"><small>Est. value</small><strong>~$2,450</strong></div></div></div><div className="cd-section cd-card"><h3 className="cd-section-title">Select Percentage</h3><input type="range" min="0" max="100" defaultValue="50" style={{width:"100%",accentColor:GOLD}}/><div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:MUTED}}><span>25%</span><span>50%</span><span>75%</span><span>MAX</span></div></div><button className="cd-btn" style={{background:RED}}>Remove Liquidity</button></>;
  return <><div className="cd-card" style={{height:100,position:"relative",overflow:"hidden"}}><div style={{fontWeight:800,fontSize:11}}>Your Liquidity Pool</div><div className="cd-muted" style={{fontSize:9,marginTop:4}}>SDOGE / USDT</div><div style={{position:"absolute",right:18,bottom:12,fontSize:42,color:GOLD}}>◌</div></div><div className="cd-section cd-card"><h3 className="cd-section-title">Pool Balance</h3><div className="cd-grid3"><div className="cd-stat"><small>SDOGE</small><strong>102.45M</strong></div><div className="cd-stat"><small>USDT</small><strong>45,678.56</strong></div><div className="cd-stat"><small>LP Tokens</small><strong>8,945.32</strong></div></div></div><div className="cd-section cd-card"><h3 className="cd-section-title">Add Liquidity</h3><label className="cd-field"><span>Amount of SDOGE</span><input className="cd-input" defaultValue="10,000,000"/></label><label className="cd-field"><span>Amount of USDT</span><input className="cd-input" defaultValue="2,450"/></label><button className="cd-btn" style={{marginTop:10}}>Add Liquidity</button></div></>;
}

function TokenSettings(){return <><div className="cd-card"><div style={{fontSize:11,fontWeight:800}}>STAR DOGE <span style={{color:GREEN,fontSize:8}}>Live</span></div><div className="cd-muted" style={{fontSize:9,marginTop:3}}>SDOGE</div></div><div className="cd-section cd-card">{[["Token Information","Edit name, symbol, description"],["Fee Settings","Manage trading fees and creator fees    2%"],["Max Transaction","Set max buy/sell limit    No Limit"],["Max Wallet","Set max tokens per wallet    No Limit"],["Trading Settings","Enable / Disable trading"],["Whitelist","Manage whitelisted addresses    12"],["Blacklist","Manage blacklisted addresses    0"],["Token Visibility","Show or hide your token"],["Burn Tokens","Burn a portion of supply"]].map(([a,b],i)=><div className="cd-row" key={a}><span><strong style={{fontSize:10}}>{a}</strong><br/><span className="cd-muted" style={{fontSize:8}}>{b}</span></span><span>{i===4||i===7?"●":"›"}</span></div>)}</div></>}

function Holders(){return <><div className="cd-grid3"><div className="cd-stat"><small>Total Holders</small><strong>2,845</strong></div><div className="cd-stat"><small>Top 10 Holders</small><strong>32.45%</strong></div><div className="cd-stat"><small>Total Supply</small><strong>1B SDOGE</strong></div></div><div className="cd-subtabs"><button className="cd-subtab active">Top Holders</button><button className="cd-subtab">All Holders</button></div><div className="cd-table">{holders.map((r,i)=><div className="cd-table-row" key={r[0]}><strong>{i+1}. {r[0]}</strong><span>{r[1]}</span><span style={{textAlign:"right"}}>{r[2]}</span></div>)}</div></>}

function Analytics(){const bars=[58,72,54,83,48,74,92,63,78,95,68,86,57,81,73,97,61,84,72,88,54,76,63,90,55,82,70,95,66,88];return <><div className="cd-pillrow">{["24H","7D","30D","90D","ALL"].map(x=><button key={x} className={`cd-pill ${x==="24H"?"active":""}`}>{x}</button>)}</div><div className="cd-section-title">Performance</div><div className="cd-grid3"><div className="cd-stat"><small>Price</small><strong>$0.00241</strong><span style={{fontSize:8,color:GREEN}}>+18.27%</span></div><div className="cd-stat"><small>Market Cap</small><strong>$2.41M</strong><span style={{fontSize:8,color:GREEN}}>+18.27%</span></div><div className="cd-stat"><small>Volume</small><strong>$254.8K</strong><span style={{fontSize:8,color:GREEN}}>+24.18%</span></div></div><div className="cd-chart"><div className="cd-chart-line"><svg viewBox="0 0 500 120" preserveAspectRatio="none"><polyline fill="none" stroke={GOLD} strokeWidth="3" points="0,100 18,88 36,94 54,74 72,63 90,79 108,52 126,58 144,45 162,59 180,38 198,52 216,43 234,61 252,44 270,49 288,33 306,38 324,25 342,44 360,28 378,31 396,17 414,27 432,12 450,20 468,7 486,16 500,4"/></svg></div></div><div className="cd-section-title">Volume</div><div className="cd-bars">{bars.map((h,i)=><span className="cd-bar" style={{height:`${h}%`}} key={i}/>)}</div></>}

function Transactions(){const tx=[["Buy","+50,000 SDOGE","2m ago",GREEN],["Sell","-20,000 SDOGE","5m ago",RED],["Buy","+100,000 SDOGE","12m ago",GREEN],["Add Liquidity","+10,000,000 SDOGE","30m ago",GOLD],["Sell","-75,000 SDOGE","1h ago",RED],["Buy","+25,000 SDOGE","2h ago",GREEN]];return <div className="cd-table">{tx.map((t,i)=><div className="cd-row" style={{padding:"12px"}} key={i}><span><strong style={{fontSize:10}}>{t[0]}</strong><br/><span className="cd-muted" style={{fontSize:8}}>7xK...9a3b</span></span><span style={{color:t[3],fontWeight:800}}>{t[1]}<br/><small style={{color:MUTED}}>${(120.5+i*18).toFixed(2)}</small></span><span className="cd-muted">{t[2]}</span></div>)}</div>}

function Revenue(){return <><div className="cd-card" style={{padding:14}}><div className="cd-muted" style={{fontSize:9}}>Total Fees Earned</div><div style={{fontSize:24,fontWeight:800,marginTop:5}}>$24,580.45</div><div style={{fontSize:9,color:GREEN,marginTop:4}}>+12.48%</div></div><div className="cd-section cd-card"><h3 className="cd-section-title">Fee Breakdown</h3>{[["Trading Fees (2%)","$18,452.32","75.1%"],["Liquidity Fees","$4,125.45","16.8%"],["Other Fees","$2,002.68","8.1%"]].map(r=><div className="cd-row" key={r[0]}><span>{r[0]}</span><span>{r[1]} &nbsp; {r[2]}</span></div>)}</div><div className="cd-section cd-card"><h3 className="cd-section-title">Withdraw Fees</h3><div className="cd-row"><span><span className="cd-muted">Available Balance</span><br/><strong>$8,452.75</strong></span><button style={{border:0,background:GOLD,color:"white",borderRadius:8,height:34,padding:"0 14px",fontWeight:800}}>Withdraw</button></div></div></>}

function Notifications(){return <><div className="cd-table">{[["New Buy","7xK...9a3b bought 5,000 SDOGE","2m ago",GREEN],["Price Alert","SDOGE is up 15% in the last 24h","30m ago",GOLD],["New Holder","Js9...7aD4 is now holding SDOGE","1h ago", "#3AA5D8"],["Liquidity Added","10,000,000 SDOGE added to liquidity","2h ago",GREEN]].map(r=><div className="cd-row" style={{padding:"13px"}} key={r[0]}><span><strong>{r[0]}</strong><br/><span className="cd-muted" style={{fontSize:8}}>{r[1]}</span></span><span style={{color:r[3],fontSize:16}}>◦</span><span className="cd-muted">{r[2]}</span></div>)}</div><button className="cd-btn" style={{marginTop:15,width:"60%",marginLeft:"20%",background:"#fff",color:GOLD,border:`1px solid ${GOLD}`}}>View All</button></>}

function ShareToken(){return <div className="cd-share"><div style={{fontWeight:800,fontSize:13}}>STAR DOGE</div><div className="cd-muted" style={{fontSize:9,marginTop:3}}>SDOGE</div><div style={{width:120,height:120,border:`1px solid ${BORDER}`,borderRadius:12,display:"grid",placeItems:"center",marginTop:10,fontSize:52}}>▦</div><div className="cd-link"><span>https://rainx.app/space-coins/sdoge</span><span>⧉</span></div><div className="cd-share-actions"><button>Twitter</button><button>Telegram</button><button>WhatsApp</button><button>More</button></div></div>}

const screens = [
  ["Creator Dashboard", DashboardHome], ["Manage Liquidity", ()=> <Liquidity/>], ["Remove Liquidity", ()=> <Liquidity remove/>], ["Token Settings", TokenSettings], ["Holders", Holders], ["Analytics", Analytics], ["Transactions", Transactions], ["Revenue & Fees", Revenue], ["Notifications", Notifications], ["Share Token", ShareToken]
];

export default function CoinDashboardScreens({onBack}){
  const [index,setIndex]=useState(0);
  const start=useRef(null);
  const Screen=screens[index][1];
  const title=`${index===8?"9.2 ":index===9?"9.3 ":`${index+1} `}${screens[index][0]}`;
  const move=e=>{ if(!start.current)return; const t=e.changedTouches[0]; const dx=t.clientX-start.current.x; const dy=Math.abs(t.clientY-start.current.y); start.current=null; if(Math.abs(dx)>60&&dy<90){setIndex(i=>Math.max(0,Math.min(screens.length-1,i+(dx<0?1:-1))))}};
  return <NativeFrame title={title} onBack={onBack} right={index===0?<Info size={18}/>:index===4?<Search size={18}/>:index===5?<span style={{fontSize:10}}>⋯</span>:index===6?<SlidersHorizontal size={18}/>:null}>
    <div onTouchStart={e=>{e.stopPropagation();const t=e.touches[0];start.current={x:t.clientX,y:t.clientY}}} onTouchEnd={move}>
      <Screen/>
      <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:14}}>{screens.map((_,i)=><button key={i} onClick={()=>setIndex(i)} style={{width:i===index?18:5,height:5,border:0,borderRadius:4,background:i===index?GOLD:"#D9DADC",padding:0}}/>)}</div>
    </div>
  </NativeFrame>;
}
