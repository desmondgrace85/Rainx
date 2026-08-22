import React from "react";
import { ArrowLeft, ChevronRight, Info, Search, SlidersHorizontal } from "lucide-react";

const GOLD = "#D7A21A";
const INK = "#111418";
const MUTED = "#747A80";
const BORDER = "#E9EAEC";
const GREEN = "#3E9C76";
const RED = "#D94C4C";

const holders = [
  ["7xK...9a3b", "8.45%", "84,500,000"],
  ["GdL...8kL2", "6.21%", "62,100,000"],
  ["Fh3...9mN7", "4.32%", "43,200,000"],
  ["9dA...3jK1", "3.85%", "38,500,000"],
  ["HkL...2pQ8", "2.98%", "29,800,000"],
  ["Js9...7aD4", "2.41%", "24,100,000"],
  ["2kM...8xP6", "1.89%", "18,900,000"],
  ["9nB...1dQ2", "1.52%", "15,200,000"],
  ["Kd3...9pZ1", "1.33%", "13,300,000"],
  ["8sL...6mT5", "1.29%", "12,900,000"],
];

function stop(e) {
  e.stopPropagation();
}

export default function CoinDashboardScreens({ onBack }) {
  const coin = {
    name: "GALAXY DOGE",
    ticker: "GDOGE",
    price: "$0.000245",
    change: "+23.14%",
    marketCap: "$2.45M",
    liquidity: "$184K",
    volume: "$621K",
  };

  return (
    <main className="rx-cd-shell" onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop}>
      <style>{`
        .rx-cd-shell,.rx-cd-shell *{box-sizing:border-box}
        .rx-cd-shell{position:fixed;inset:0;z-index:1200;background:#fff;color:${INK};font-family:'Montserrat',sans-serif;overflow:hidden}
        .rx-cd-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;padding:calc(8px + env(safe-area-inset-top)) 14px calc(28px + env(safe-area-inset-bottom));scrollbar-width:none}
        .rx-cd-scroll::-webkit-scrollbar{display:none}
        .rx-cd-inner{width:min(100%,430px);margin:0 auto}
        .rx-cd-head{height:54px;display:flex;align-items:center;justify-content:center;position:relative}
        .rx-cd-head h1{font-size:19px;margin:0;font-weight:800}
        .rx-cd-back,.rx-cd-action{position:absolute;border:0;background:transparent;color:${INK};width:40px;height:40px;display:grid;place-items:center}
        .rx-cd-back{left:0}.rx-cd-action{right:0}
        .rx-cd-card{border:1px solid ${BORDER};border-radius:15px;background:#fff;padding:14px;box-shadow:0 2px 10px rgba(16,20,24,.035)}
        .rx-cd-hero{display:flex;align-items:center;gap:11px}
        .rx-cd-logo{width:50px;height:50px;border-radius:50%;background:#FFF7DA;display:grid;place-items:center;font-size:18px;font-weight:900;color:${GOLD}}
        .rx-cd-hero h2{font-size:15px;margin:0;font-weight:800}.rx-cd-hero small{display:block;color:${MUTED};font-size:10px;margin-top:4px}
        .rx-cd-price{margin-left:auto;text-align:right}.rx-cd-price strong{font-size:13px}.rx-cd-price span{display:block;color:${GREEN};font-size:10px;font-weight:800;margin-top:4px}
        .rx-cd-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}
        .rx-cd-stat{border:1px solid ${BORDER};border-radius:10px;padding:9px 7px}.rx-cd-stat small{display:block;color:${MUTED};font-size:8px}.rx-cd-stat strong{display:block;margin-top:4px;font-size:10px}
        .rx-cd-title{font-size:13px;font-weight:800;margin:15px 0 8px}
        .rx-cd-chart{height:190px;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;background:linear-gradient(180deg,#fffaf0,#fff);position:relative}
        .rx-cd-chart svg{position:absolute;inset:12px;width:calc(100% - 24px);height:calc(100% - 24px)}
        .rx-cd-grid{stroke:#EEE;stroke-width:1}.rx-cd-line{fill:none;stroke:${GOLD};stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
        .rx-cd-area{fill:${GOLD};opacity:.10}
        .rx-cd-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:10px 0}
        .rx-cd-tabs button{height:31px;border:1px solid ${BORDER};border-radius:9px;background:#fff;color:${INK};font:700 9px 'Montserrat'}
        .rx-cd-tabs button.active{background:${GOLD};border-color:${GOLD};color:#fff}
        .rx-cd-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F1F2;font-size:10px}.rx-cd-row:last-child{border-bottom:0}
        .rx-cd-muted{color:${MUTED}}.rx-cd-green{color:${GREEN}}.rx-cd-red{color:${RED}}
        .rx-cd-holder{display:grid;grid-template-columns:1fr .7fr 1fr;gap:6px;padding:9px 0;border-bottom:1px solid #F0F1F2;font-size:9px}
        .rx-cd-holder:last-child{border-bottom:0}
        .rx-cd-button{width:100%;height:43px;border:0;border-radius:11px;background:${GOLD};color:#fff;font:800 11px 'Montserrat';margin-top:14px}
      `}</style>

      <div className="rx-cd-scroll">
        <div className="rx-cd-inner">
          <header className="rx-cd-head">
            <button className="rx-cd-back" onClick={onBack} aria-label="Back">
              <ArrowLeft size={22} />
            </button>
            <h1>Coin Dashboard</h1>
            <button className="rx-cd-action" aria-label="Search">
              <Search size={20} />
            </button>
          </header>

          <section className="rx-cd-card">
            <div className="rx-cd-hero">
              <div className="rx-cd-logo">GD</div>
              <div>
                <h2>{coin.name}</h2>
                <small>{coin.ticker} · Solana</small>
              </div>
              <div className="rx-cd-price">
                <strong>{coin.price}</strong>
                <span>{coin.change}</span>
              </div>
            </div>

            <div className="rx-cd-stats">
              <div className="rx-cd-stat"><small>Market Cap</small><strong>{coin.marketCap}</strong></div>
              <div className="rx-cd-stat"><small>Liquidity</small><strong>{coin.liquidity}</strong></div>
              <div className="rx-cd-stat"><small>24h Volume</small><strong>{coin.volume}</strong></div>
            </div>
          </section>

          <h2 className="rx-cd-title">Price Performance</h2>
          <section className="rx-cd-chart">
            <svg viewBox="0 0 400 180" preserveAspectRatio="none" aria-label="Price chart">
              <path className="rx-cd-grid" d="M0 35H400M0 70H400M0 105H400M0 140H400" />
              <path className="rx-cd-area" d="M0 145 L35 130 L70 138 L105 105 L140 116 L175 88 L210 102 L245 72 L280 84 L315 50 L350 63 L400 28 L400 180 L0 180 Z" />
              <path className="rx-cd-line" d="M0 145 L35 130 L70 138 L105 105 L140 116 L175 88 L210 102 L245 72 L280 84 L315 50 L350 63 L400 28" />
            </svg>
          </section>

          <div className="rx-cd-tabs">
            {["5M", "15M", "1H", "4H", "1D"].map((label, index) => (
              <button key={label} className={index === 2 ? "active" : ""}>{label}</button>
            ))}
          </div>

          <section className="rx-cd-card">
            <h2 className="rx-cd-title" style={{ marginTop: 0 }}>Token Information</h2>
            <div className="rx-cd-row"><span className="rx-cd-muted">Liquidity</span><strong>{coin.liquidity}</strong></div>
            <div className="rx-cd-row"><span className="rx-cd-muted">24h Volume</span><strong>{coin.volume}</strong></div>
            <div className="rx-cd-row"><span className="rx-cd-muted">24h Change</span><strong className="rx-cd-green">{coin.change}</strong></div>
            <div className="rx-cd-row"><span className="rx-cd-muted">Network</span><strong>Solana</strong></div>
          </section>

          <h2 className="rx-cd-title">Top Holders</h2>
          <section className="rx-cd-card">
            {holders.map(([address, percent, amount]) => (
              <div className="rx-cd-holder" key={address}>
                <span>{address}</span>
                <span>{percent}</span>
                <span style={{ textAlign: "right" }}>{amount}</span>
              </div>
            ))}
          </section>

          <button className="rx-cd-button">Trade {coin.ticker}</button>
        </div>
      </div>
    </main>
  );
}
