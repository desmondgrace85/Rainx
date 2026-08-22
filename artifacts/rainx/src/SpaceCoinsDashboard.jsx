import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  Menu,
  Plus,
  Rocket,
  ShieldCheck,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import galaxyDogeImage from "./assets/space-coins-galaxy-doge.jpg";
import moonCatImage from "./assets/space-coins-moon-cat.jpg";
import planetPepeImage from "./assets/space-coins-planet-pepe.jpg";
import rocketArtwork from "./assets/space-coins-rocket.png";
import orbitArtwork from "./assets/space-coins-orbit.png";
import platformArtwork from "./assets/space-coins-platform.png";
import coinArtwork from "./assets/space-coins-coin.png";
import externalBanner from "./assets/space-coins-external-banner.png";

const COINS = [
  { name: "GALAXY DOGE", ticker: "GDOGE", price: "$0.000245", change: "+23.14%", image: galaxyDogeImage },
  { name: "MOON CAT", ticker: "MCAT", price: "$0.000182", change: "+12.08%", image: moonCatImage },
  { name: "PLANET PEPE", ticker: "PPEPE", price: "$0.000092", change: "+8.19%", image: planetPepeImage },
];

const TRENDING = ["STARINU", "COSMO", "MOONME"];

function stop(e) {
  e.stopPropagation();
}

function Shell({ children }) {
  return (
    <main
      className="rx-space-shell"
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
      onTouchCancel={stop}
    >
      {children}
    </main>
  );
}

function Header({ onMenu, onBack, title = "Space Coins" }) {
  return (
    <header className="rx-space-header">
      {onBack ? (
        <button className="rx-icon-btn rx-left" onClick={onBack} aria-label="Back">
          <ArrowLeft size={23} />
        </button>
      ) : (
        <button className="rx-icon-btn rx-left" onClick={onMenu} aria-label="Space Coins menu">
          <Menu size={24} />
        </button>
      )}
      <h1>{title}</h1>
      <button className="rx-icon-btn rx-right" aria-label="Notifications">
        <Bell size={21} />
      </button>
    </header>
  );
}

function ModeToggle({ mode, setMode }) {
  return (
    <div className="rx-mode-toggle">
      <button
        className={mode === "space" ? "active" : ""}
        onClick={() => setMode("space")}
      >
        <img src={coinArtwork} alt="" />
        <span>Space Coins</span>
      </button>
      <button
        className={mode === "external" ? "active" : ""}
        onClick={() => setMode("external")}
      >
        <img src={coinArtwork} alt="" />
        <span>External Coins</span>
      </button>
    </div>
  );
}

function CreateBanner({ onCreate }) {
  return (
    <section className="rx-space-banner">
      <img src={externalBanner} alt="" draggable="false" />
      <div className="rx-space-banner-copy">
        <h2>Create Your<br />Space Coin</h2>
        <p>Launch your own mini meme coin<br />in just a few steps.</p>
        <button onClick={onCreate}>
          Create Coin <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

function Shortcuts({ onMyCoins }) {
  const items = [
    [ShieldCheck, "Top Tokens"],
    [TrendingUp, "Trending"],
    [Rocket, "New Launches"],
    [WalletCards, "My Coins"],
  ];

  return (
    <nav className="rx-shortcuts">
      {items.map(([Icon, label]) => (
        <button
          key={label}
          onClick={label === "My Coins" ? onMyCoins : undefined}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function CoinList() {
  return (
    <section className="rx-space-section">
      <div className="rx-section-head">
        <h2>Top Space Coins</h2>
        <button>View All</button>
      </div>
      <div className="rx-coin-list">
        {COINS.map((coin) => (
          <button className="rx-coin-row" key={coin.ticker}>
            <img src={coin.image} alt="" />
            <span className="rx-coin-name">
              <strong>{coin.name}</strong>
              <small>{coin.ticker}</small>
            </span>
            <span className="rx-coin-value">
              <strong>{coin.price}</strong>
              <small>{coin.change}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Trending() {
  return (
    <section className="rx-space-section">
      <div className="rx-section-head">
        <h2>Trending</h2>
        <button>View All</button>
      </div>
      <div className="rx-trending">
        {TRENDING.map((name, index) => (
          <button key={name}>
            <b>#{index + 1}</b>
            {name}
          </button>
        ))}
      </div>
    </section>
  );
}

function Dashboard({ setMode, onCreate, onMenu, onMyCoins }) {
  return (
    <Shell>
      <style>{styles}</style>
      <div className="rx-space-scroll">
        <div className="rx-space-inner">
          <Header onMenu={onMenu} />
          <CreateBanner onCreate={onCreate} />
          <ModeToggle mode="space" setMode={setMode} />
          <Shortcuts onMyCoins={onMyCoins} />
          <CoinList />
          <Trending />
        </div>
      </div>
    </Shell>
  );
}

function ExternalCoins({ setMode, onBack, onConnect }) {
  return (
    <Shell>
      <style>{styles}</style>
      <div className="rx-space-scroll">
        <div className="rx-space-inner">
          <Header title="External Coins" onBack={onBack} />
          <ModeToggle mode="external" setMode={setMode} />

          <section className="rx-external-hero">
            <h2>Explore<br />External Coins</h2>
            <p>Trade popular coins from across the universe.</p>
            <img src={coinArtwork} alt="" />
          </section>

          <div className="rx-wallet-card">
            <div className="rx-wallet-art">
              <img src={orbitArtwork} alt="" />
            </div>
            <div>
              <strong>Connect External Wallet</strong>
              <p>Your funds stay in your wallet while you explore external coins.</p>
            </div>
            <button onClick={onConnect}>Connect Wallet</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function CreateCoin({ onBack }) {
  const [step, setStep] = useState(1);
  const [logo, setLogo] = useState(null);
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    description: "",
    supply: "1,000,000,000",
    network: "Solana",
  });

  const logoUrl = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo]);
  const valid =
    form.name.trim().length >= 2 &&
    /^[A-Za-z0-9]{2,10}$/.test(form.symbol.trim());

  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  return (
    <Shell>
      <style>{styles + createStyles}</style>
      <div className="rx-space-scroll">
        <div className="rx-space-inner">
          <Header title="Create Your Space Coin" onBack={onBack} />

          <div className="rx-create-art">
            <div className="rx-create-glow" />
            <img className="rx-platform" src={platformArtwork} alt="" />
            <img className="rx-orbit" src={orbitArtwork} alt="" />
            <img className="rx-rocket" src={rocketArtwork} alt="" />
          </div>

          <div className="rx-step">Step {Math.min(step, 4)} of 4</div>
          <div className="rx-progress">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={step >= n ? "on" : ""} />
            ))}
          </div>

          {step === 1 && (
            <>
              <label className="rx-upload">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => setLogo(e.target.files?.[0] || null)}
                />
                <span className="rx-upload-circle">
                  {logo ? (
                    <img src={logoUrl} alt="" />
                  ) : (
                    <Plus size={30} />
                  )}
                </span>
                <strong>Upload Coin Logo</strong>
                <small>PNG or JPG · Max 5MB</small>
              </label>

              <div className="rx-fields">
                <label>
                  Coin Name
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Enter coin name"
                  />
                </label>
                <label>
                  Symbol
                  <input
                    value={form.symbol}
                    onChange={(e) => set("symbol", e.target.value)}
                    placeholder="e.g. RXDOG"
                  />
                </label>
                <label>
                  Description
                  <input
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Tell the world about your coin"
                  />
                </label>
                <div className="rx-two-fields">
                  <label>
                    Total Supply
                    <input
                      value={form.supply}
                      onChange={(e) => set("supply", e.target.value)}
                    />
                  </label>
                  <label>
                    Network
                    <select
                      value={form.network}
                      onChange={(e) => set("network", e.target.value)}
                    >
                      <option>Solana</option>
                      <option>Ethereum</option>
                      <option>Base</option>
                    </select>
                  </label>
                </div>
              </div>
            </>
          )}

          {step > 1 && (
            <div className="rx-review">
              <div><span>Coin</span><strong>{form.name || "Your Space Coin"}</strong></div>
              <div><span>Symbol</span><strong>{form.symbol || "—"}</strong></div>
              <div><span>Description</span><strong>{form.description || "—"}</strong></div>
              <div><span>Total Supply</span><strong>{form.supply}</strong></div>
              <div><span>Network</span><strong>{form.network}</strong></div>
            </div>
          )}

          <div className="rx-create-actions">
            {step > 1 && (
              <button className="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                className="primary"
                disabled={step === 1 && !valid}
                onClick={() => setStep((s) => s + 1)}
              >
                Next Step <ArrowRight size={16} />
              </button>
            ) : (
              <button className="primary" onClick={() => setStep(5)}>
                Launch Coin <Rocket size={16} />
              </button>
            )}
          </div>

          {step === 5 && (
            <div className="rx-launched">
              <Check size={30} />
              <h2>Your Space Coin is launched!</h2>
              <p>The launch flow is complete.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function WalletSheet({ onClose }) {
  const wallets = ["MetaMask", "Trust Wallet", "Phantom", "Coinbase Wallet", "WalletConnect"];

  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rx-sheet-handle" />
        <div className="rx-sheet-head">
          <h3>Connect Wallet</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {wallets.map((wallet) => (
          <div className="rx-wallet-row" key={wallet}>
            <span>{wallet.slice(0, 1)}</span>
            <strong>{wallet}</strong>
            <button onClick={onClose}>Connect</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyCoinsSheet({ onClose }) {
  const rows = [
    ["STAR DOGE", "SDOGE", "$0.00241", "+18.27%", "$2.41M", "2,845"],
    ["COSMO CAT", "CCAT", "$0.00102", "+11.09%", "$1.02M", "1,256"],
    ["MOON PEPE", "MPEPE", "$0.00081", "-3.21%", "$810K", "985"],
  ];

  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-sheet rx-sheet-tall" onClick={(e) => e.stopPropagation()}>
        <div className="rx-sheet-handle" />
        <div className="rx-sheet-head">
          <h3>My Space Coins</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {rows.map((row) => (
          <div className="rx-mycoin" key={row[1]}>
            <img src={coinArtwork} alt="" />
            <div>
              <strong>{row[0]}</strong>
              <small>{row[1]}</small>
              <span>{row[4]} · {row[5]} holders</span>
            </div>
            <div className="rx-mycoin-price">
              <strong>{row[2]}</strong>
              <small className={row[3].startsWith("-") ? "red" : ""}>{row[3]}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuSheet({ onClose, onMyCoins }) {
  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rx-sheet-handle" />
        <div className="rx-sheet-head">
          <h3>Space Coins</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <button className="rx-menu-card" onClick={onMyCoins}>
          <span><WalletCards size={20} /></span>
          <strong>My Space Coins</strong>
          <small>View coins you created and joined</small>
        </button>
        <button className="rx-menu-card" onClick={onClose}>
          <span><Rocket size={20} /></span>
          <strong>New Launches</strong>
          <small>Explore newly launched space coins</small>
        </button>
      </div>
    </div>
  );
}

const styles = `
.rx-space-shell,.rx-space-shell *{box-sizing:border-box}
.rx-space-shell{
  position:fixed;inset:0;z-index:700;width:100%;height:100dvh;
  overflow:hidden;background:#fff;color:#111418;
  font-family:'Montserrat',sans-serif;overscroll-behavior:none;isolation:isolate
}
.rx-space-scroll{
  position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;
  -webkit-overflow-scrolling:touch;overscroll-behavior:none;
  touch-action:pan-y;scrollbar-width:none;
  padding:calc(10px + env(safe-area-inset-top)) 16px calc(30px + env(safe-area-inset-bottom))
}
.rx-space-scroll::-webkit-scrollbar{display:none}
.rx-space-inner{width:min(100%,480px);margin:0 auto}
.rx-space-header{
  height:52px;display:flex;align-items:center;justify-content:center;
  position:relative;margin-bottom:8px
}
.rx-space-header h1{margin:0;font-size:18px;font-weight:800;letter-spacing:-.4px}
.rx-icon-btn{
  position:absolute;width:40px;height:40px;border:0;background:transparent;
  color:#111418;display:grid;place-items:center;padding:0
}
.rx-icon-btn.rx-left{left:0}
.rx-icon-btn.rx-right{right:0}

.rx-space-banner{
  position:relative;width:100%;overflow:hidden;border-radius:18px;margin-bottom:12px
}
.rx-space-banner>img{display:block;width:100%;height:auto;max-width:100%}
.rx-space-banner-copy{
  position:absolute;left:7%;top:11%;width:53%;color:#fff;
  text-shadow:0 2px 8px rgba(0,0,0,.14)
}
.rx-space-banner-copy h2{
  margin:0;font-size:21px;line-height:1.04;font-weight:800;letter-spacing:-.7px
}
.rx-space-banner-copy p{margin:9px 0 0;font-size:10.5px;line-height:1.4;font-weight:600}
.rx-space-banner-copy button{
  margin-top:12px;height:40px;padding:0 13px;border:1px solid rgba(255,255,255,.7);
  border-radius:12px;background:rgba(255,255,255,.18);color:#fff;
  display:inline-flex;align-items:center;gap:8px;font:800 10.5px 'Montserrat',sans-serif;
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)
}

.rx-mode-toggle{
  height:62px;display:grid;grid-template-columns:1fr 1fr;gap:3px;
  padding:3px;margin-bottom:14px;border:1px solid #E7E8EA;
  border-radius:18px;background:#fff;box-shadow:0 3px 12px rgba(20,24,28,.04)
}
.rx-mode-toggle button{
  border:0;background:transparent;border-radius:15px;color:#6E747A;
  display:flex;align-items:center;justify-content:center;gap:8px;
  font:800 11.5px 'Montserrat',sans-serif
}
.rx-mode-toggle button.active{background:#F4D35E;color:#fff;box-shadow:0 4px 12px rgba(244,211,94,.2)}
.rx-mode-toggle img{width:30px;height:30px;object-fit:contain}

.rx-shortcuts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:22px}
.rx-shortcuts button{
  height:66px;border:1px solid #E3E5E7;border-radius:13px;background:#fff;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  color:#111418;font:800 8.5px 'Montserrat',sans-serif
}
.rx-shortcuts svg{width:19px;height:19px;stroke-width:2.2}
.rx-shortcuts button:first-child svg,.rx-shortcuts button:nth-child(3) svg,.rx-shortcuts button:nth-child(4) svg{fill:#111418}

.rx-space-section{margin-bottom:22px}
.rx-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.rx-section-head h2{margin:0;font-size:16px;font-weight:800;letter-spacing:-.3px}
.rx-section-head button{border:0;background:transparent;color:#C28F18;font:700 11px 'Montserrat',sans-serif}
.rx-coin-list{overflow:hidden;border:1px solid #E8EAEC;border-radius:15px;background:#fff}
.rx-coin-row{
  width:100%;min-height:68px;padding:10px 12px;display:flex;align-items:center;gap:10px;
  border:0;border-bottom:1px solid #ECEDEF;background:#fff;color:#12151A;text-align:left
}
.rx-coin-row:last-child{border-bottom:0}
.rx-coin-row>img{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:none}
.rx-coin-name{min-width:0;flex:1}
.rx-coin-name strong,.rx-coin-name small,.rx-coin-value strong,.rx-coin-value small{display:block}
.rx-coin-name strong{font-size:11px;font-weight:800}
.rx-coin-name small{margin-top:4px;color:#747A81;font-size:10px;font-weight:600}
.rx-coin-value{text-align:right}
.rx-coin-value strong{font-size:11px;font-weight:800}
.rx-coin-value small{margin-top:4px;color:#43A57C;font-size:10px;font-weight:800}

.rx-trending{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rx-trending button{
  height:46px;border:1px solid #E8EAEC;border-radius:12px;background:#fff;
  color:#14171B;font:800 10px 'Montserrat',sans-serif
}
.rx-trending b{color:#C28F18;margin-right:5px}

.rx-external-hero{
  position:relative;min-height:330px;border-radius:20px;
  background:linear-gradient(145deg,#fffdf2,#fff 60%);
  border:1px solid #ECEDEE;padding:28px 22px;overflow:hidden
}
.rx-external-hero h2{margin:0;font-size:28px;line-height:1.03;font-weight:800}
.rx-external-hero p{width:58%;margin:12px 0 0;color:#747A80;font-size:12px;line-height:1.5}
.rx-external-hero>img{
  position:absolute;width:205px;height:205px;object-fit:contain;right:-12px;bottom:-18px;
  filter:drop-shadow(0 18px 25px rgba(0,0,0,.12))
}
.rx-wallet-card{
  margin-top:14px;padding:16px;border:1px solid #E7E8EA;border-radius:16px;
  display:grid;grid-template-columns:48px 1fr;gap:10px;background:#fff
}
.rx-wallet-art{width:48px;height:48px;border-radius:14px;background:#F8F8F8;display:grid;place-items:center;overflow:hidden}
.rx-wallet-art img{width:42px;height:42px;object-fit:contain}
.rx-wallet-card strong{font-size:12px}
.rx-wallet-card p{margin:5px 0 0;color:#747A80;font-size:10px;line-height:1.4}
.rx-wallet-card button{
  grid-column:1/-1;height:42px;border:0;border-radius:11px;background:#D7A21A;color:#fff;
  font:800 11px 'Montserrat',sans-serif
}

.rx-overlay{
  position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.48);
  display:flex;align-items:flex-end;justify-content:center
}
.rx-sheet{
  width:min(100%,480px);background:#fff;color:#111418;border-radius:22px 22px 0 0;
  padding:9px 16px calc(22px + env(safe-area-inset-bottom));max-height:80dvh;overflow:auto
}
.rx-sheet-tall{max-height:86dvh}
.rx-sheet-handle{width:42px;height:4px;border-radius:9px;background:#D8DADC;margin:0 auto 12px}
.rx-sheet-head{height:38px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.rx-sheet-head h3{margin:0;font-size:16px;font-weight:800}
.rx-sheet-head button{border:0;background:transparent;color:#111418;padding:5px}

.rx-wallet-row{
  min-height:58px;border-bottom:1px solid #ECEDEF;display:grid;
  grid-template-columns:34px 1fr auto;align-items:center;gap:10px
}
.rx-wallet-row>span{width:32px;height:32px;border-radius:50%;background:#F4D35E;display:grid;place-items:center;font-weight:800}
.rx-wallet-row strong{font-size:12px}
.rx-wallet-row button{border:0;border-radius:9px;background:#F4D35E;color:#fff;padding:9px 11px;font:800 10px 'Montserrat',sans-serif}

.rx-mycoin{
  display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;
  padding:12px 0;border-bottom:1px solid #ECEDEF
}
.rx-mycoin>img{width:40px;height:40px;border-radius:50%}
.rx-mycoin strong,.rx-mycoin small,.rx-mycoin span{display:block}
.rx-mycoin strong{font-size:11px}
.rx-mycoin small{margin-top:3px;color:#747A80;font-size:9px}
.rx-mycoin span{margin-top:5px;color:#747A80;font-size:9px}
.rx-mycoin-price{text-align:right}
.rx-mycoin-price strong{font-size:10px}
.rx-mycoin-price small{color:#43A57C;font-weight:800}
.rx-mycoin-price small.red{color:#D94C4C}

.rx-menu-card{
  width:100%;text-align:left;border:1px solid #E8EAEC;background:#fff;
  border-radius:13px;padding:14px;margin:5px 0;display:grid;
  grid-template-columns:40px 1fr;column-gap:10px
}
.rx-menu-card>span{grid-row:span 2;width:40px;height:40px;border-radius:11px;background:#FFF7DA;display:grid;place-items:center;color:#C28F18}
.rx-menu-card strong{font-size:12px;align-self:end}
.rx-menu-card small{font-size:9px;color:#747A80;margin-top:4px}

@media(max-width:430px){
  .rx-space-banner-copy{left:7%;top:10%;width:53%}
  .rx-space-banner-copy h2{font-size:19px}
  .rx-space-banner-copy p{font-size:10px}
  .rx-space-banner-copy button{height:37px;font-size:10px}
  .rx-mode-toggle{height:60px}
  .rx-shortcuts{gap:7px}
  .rx-shortcuts button{height:64px;font-size:8px}
}

@media(prefers-reduced-motion:reduce){
  .rx-space-shell *{animation:none!important;transition:none!important}
}
`;

const createStyles = `
.rx-create-art{height:265px;position:relative;overflow:hidden;margin-bottom:5px}
.rx-create-glow{position:absolute;left:50%;bottom:10px;width:70%;height:45%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,rgba(244,211,94,.24),transparent 70%);filter:blur(18px)}
.rx-platform{position:absolute;left:50%;bottom:-30px;transform:translateX(-50%);width:290px;height:210px;object-fit:contain}
.rx-orbit{position:absolute;left:50%;top:30px;transform:translateX(-50%);width:220px;height:150px;object-fit:contain;opacity:.9}
.rx-rocket{position:absolute;right:18px;top:22px;width:95px;height:95px;object-fit:contain;transform:rotate(8deg)}
.rx-step{text-align:center;color:#747A80;font-size:10px;font-weight:700}
.rx-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0 18px}
.rx-progress span{height:4px;border-radius:8px;background:#E7E8EA}
.rx-progress span.on{background:#F4D35E}
.rx-upload{
  border:1px dashed #D8DADC;border-radius:15px;padding:16px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:#FAFAFA;cursor:pointer
}
.rx-upload input{display:none}
.rx-upload-circle{
  width:72px;height:72px;border-radius:50%;display:grid;place-items:center;
  background:#FFF7DA;color:#D7A21A;overflow:hidden;margin-bottom:8px
}
.rx-upload-circle img{width:100%;height:100%;object-fit:cover}
.rx-upload strong{font-size:12px}
.rx-upload small{margin-top:4px;color:#747A80;font-size:9px}
.rx-fields{display:grid;gap:10px;margin-top:14px}
.rx-fields label{display:grid;gap:5px;color:#535A60;font-size:9px;font-weight:700}
.rx-fields input,.rx-fields select{
  width:100%;height:42px;border:1px solid #E4E6E8;border-radius:10px;
  padding:0 11px;background:#fff;outline:none;color:#111418;
  font:600 11px 'Montserrat',sans-serif
}
.rx-two-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.rx-create-actions{display:flex;gap:9px;margin:16px 0}
.rx-create-actions button{
  height:44px;border-radius:11px;font:800 11px 'Montserrat',sans-serif
}
.rx-create-actions .primary{flex:1;border:0;background:#D7A21A;color:#fff}
.rx-create-actions .primary:disabled{opacity:.45}
.rx-create-actions .secondary{width:90px;border:1px solid #E1E3E5;background:#fff;color:#111418}
.rx-review{border:1px solid #E7E8EA;border-radius:15px;overflow:hidden}
.rx-review div{display:flex;justify-content:space-between;gap:15px;padding:12px;border-bottom:1px solid #ECEDEF}
.rx-review div:last-child{border-bottom:0}
.rx-review span{color:#747A80;font-size:10px}.rx-review strong{font-size:10px;text-align:right}
.rx-launched{text-align:center;padding:25px 10px;border:1px solid #E7E8EA;border-radius:16px}
.rx-launched>svg{color:#43A57C}
.rx-launched h2{font-size:17px;margin:9px 0 5px}.rx-launched p{font-size:10px;color:#747A80;margin:0}
`;

export default function SpaceCoinsDashboard({ onBack }) {
  const [mode, setMode] = useState("space");
  const [screen, setScreen] = useState("dashboard");
  const [overlay, setOverlay] = useState(null);

  if (screen === "create") {
    return <CreateCoin onBack={() => setScreen("dashboard")} />;
  }

  if (screen === "external") {
    return (
      <ExternalCoins
        setMode={(next) => {
          setMode(next);
          if (next === "space") setScreen("dashboard");
        }}
        onBack={() => setScreen("dashboard")}
        onConnect={() => setOverlay("wallet")}
      />
    );
  }

  return (
    <>
      <style>{styles}</style>
      <Dashboard
        setMode={(next) => {
          setMode(next);
          if (next === "external") setScreen("external");
        }}
        onCreate={() => setScreen("create")}
        onMenu={() => setOverlay("menu")}
        onMyCoins={() => setOverlay("coins")}
      />
      {overlay === "wallet" && <WalletSheet onClose={() => setOverlay(null)} />}
      {overlay === "coins" && <MyCoinsSheet onClose={() => setOverlay(null)} />}
      {overlay === "menu" && (
        <MenuSheet
          onClose={() => setOverlay(null)}
          onMyCoins={() => setOverlay("coins")}
        />
      )}
    </>
  );
}
