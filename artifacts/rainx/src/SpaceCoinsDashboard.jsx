import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Menu,
  Plus,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import {
  SiCoinbase,
  SiWalletconnect,
} from "react-icons/si";

import galaxyDogeImage from "./assets/space-coins-galaxy-doge.jpg";
import moonCatImage from "./assets/space-coins-moon-cat.jpg";
import planetPepeImage from "./assets/space-coins-planet-pepe.jpg";
import rocketArtwork from "./assets/space-coins-rocket.png";
import orbitArtwork from "./assets/space-coins-orbit.png";
import platformArtwork from "./assets/space-coins-platform.png";
import coinArtwork from "./assets/space-coins-coin.png";
import externalBanner from "./assets/space-coins-external-banner.png";
import galaxyDogeToken from "./assets/space-coins-galaxy-doge.svg";
import moonCatToken from "./assets/space-coins-moon-cat.svg";
import planetPepeToken from "./assets/space-coins-planet-pepe.svg";
import metamaskLogo from "./assets/metamask.svg";
import trustWalletLogo from "./assets/trust-wallet.svg";
import phantomLogo from "./assets/phantom.svg";

const REAL_FLAME_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3BHloZy6zhOMmqbVkiEIfVkbiDF/hf_20260821_145856_91a13b8e-c366-4951-be01-e7f1846cbbc6.mp4";
const REAL_CLOUD_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3BHloZy6zhOMmqbVkiDF/hf_20260821_153425_e7dbe97e-35f8-4ada-80e3-d11209f83006.mp4";

const COINS = [
  { name: "GALAXY DOGE", ticker: "GDOGE", price: "$0.000245", change: "+23.14%", image: galaxyDogeToken },
  { name: "MOON CAT", ticker: "MCAT", price: "$0.000182", change: "+12.08%", image: moonCatToken },
  { name: "PLANET PEPE", ticker: "PPEPE", price: "$0.000092", change: "+8.19%", image: planetPepeToken },
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
        <span className="rx-header-spacer" aria-hidden="true" />
      )}
      <h1>{title}</h1>
      {!onBack && (
        <button className="rx-icon-btn rx-right" onClick={onMenu} aria-label="Space Coins menu">
          <Menu size={24} />
        </button>
      )}
    </header>
  );
}

function ModeToggle({ mode, setMode, swipeProgress = null, swiping = false }) {
  const progress = swipeProgress == null ? (mode === "external" ? 1 : 0) : swipeProgress;
  return (
    <div className="rx-mode-toggle" role="tablist" aria-label="Coin type">
      <span className="rx-mode-indicator" style={{ transform: `translateX(${progress * 100}%)`, transition: swiping ? "none" : undefined }} />
      <button
        className={mode === "space" ? "active" : ""}
        onClick={() => setMode("space")}
        role="tab"
        aria-selected={mode === "space"}
      >
        <img src={coinArtwork} alt="" />
        <span>Space Coins</span>
      </button>

      <button
        className={mode === "external" ? "active" : ""}
        onClick={() => setMode("external")}
        role="tab"
        aria-selected={mode === "external"}
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
        <button key={label} onClick={label === "My Coins" ? onMyCoins : undefined}>
          <span className="rx-shortcut-icon">
            <Icon />
          </span>
          <span className="rx-shortcut-label">{label}</span>
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

function ExternalPanel({ onConnect }) {
  return (
    <section className="rx-external-panel">
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
    </section>
  );
}

function SwipeArea({ mode, setMode, onMyCoins, onConnect, onProgress }) {
  const start = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setSwiping(true);
    setDragX(0);
  };
  const onPointerMove = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) <= Math.abs(dy) && Math.abs(dy) > 12) return;
    if (e.cancelable) e.preventDefault();
    const width = e.currentTarget.getBoundingClientRect().width || window.innerWidth;
    const bounded = Math.max(-width, Math.min(width, dx));
    setDragX(bounded);
    const progress = Math.max(0, Math.min(1, (mode === "external" ? 1 : 0) + bounded / width));
    onProgress?.(progress);
  };
  const onPointerEnd = () => {
    if (!start.current) return;
    const width = window.innerWidth;
    if (dragX < -width * 0.16) setMode("external");
    else if (dragX > width * 0.16) setMode("space");
    start.current = null;
    setDragX(0);
    setSwiping(false);
    onProgress?.(null);
  };

  return (
    <div
      className="rx-swipe-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div
        className={`rx-swipe-track ${mode === "external" ? "external" : ""}`}
        style={swiping ? {
          transform: `translate3d(${(Math.max(0, Math.min(1, (mode === "external" ? 1 : 0) + dragX / (window.innerWidth || 1))) * -50)}%,0,0)`,
          transition: "none",
        } : undefined}
      >
        <div className="rx-swipe-panel">
          <Shortcuts onMyCoins={onMyCoins} />
          <CoinList />
          <Trending />
        </div>

        <div className="rx-swipe-panel rx-external-slide">
          <ExternalPanel onConnect={onConnect} />
        </div>
      </div>
    </div>
  );
}

function Dashboard({ mode, setMode, onCreate, onMenu, onMyCoins, onConnect }) {
  const [swipeProgress, setSwipeProgress] = useState(0);

  return (
    <Shell>
      <style>{styles}</style>

      <div className="rx-space-scroll">
        <div className="rx-space-inner">
          <Header onMenu={onMenu} />
          <CreateBanner onCreate={onCreate} />
          <ModeToggle mode={mode} setMode={setMode} swipeProgress={swipeProgress} swiping={swipeProgress !== null} />

          <SwipeArea
            mode={mode}
            setMode={setMode}
            onMyCoins={onMyCoins}
            onConnect={onConnect}
            onProgress={setSwipeProgress}
          />
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="rx-create-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function useEdgeBack(onBack) {
  const ref = useRef(null);

  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      ref.current = t.clientX < 28 ? { x: t.clientX, y: t.clientY } : null;
    },

    onTouchEnd: (e) => {
      if (!ref.current) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - ref.current.x;
      const dy = Math.abs(t.clientY - ref.current.y);

      ref.current = null;

      if (dx > 48 && dy < 90) onBack?.();
    },

    onTouchCancel: () => {
      ref.current = null;
    },
  };
}

function CreateCoin({ onBack }) {
  const [step, setStep] = useState(1);
  const [logo, setLogo] = useState(null);
  const [networkOpen, setNetworkOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    symbol: "",
    description: "",
    supply: "1,000,000,000",
    network: "Solana",
  });

  const logoUrl = useMemo(
    () => (logo ? URL.createObjectURL(logo) : null),
    [logo]
  );

  useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl]);

  const valid =
    form.name.trim().length >= 2 &&
    /^[A-Za-z0-9]{2,10}$/.test(form.symbol.trim());

  const edge = useEdgeBack(onBack);

  const set = (key, value) => {
    setForm((old) => ({ ...old, [key]: value }));
  };

  return (
    <Shell>
      <style>{styles + createStyles}</style>

      <div className="rx-space-scroll" {...edge}>
        <div className="rx-space-inner">
          <header className="rx-space-header">
            <button
              className="rx-icon-btn rx-left"
              onClick={onBack}
              aria-label="Back"
            >
              <ArrowLeft size={23} />
            </button>
            <h1>Create Your Space Coin</h1>
          </header>

          <section className="rx-create-stage" aria-hidden="true">
            <div className="rx-create-glow" />

            <video
              className="rx-cloud-video"
              src={REAL_CLOUD_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />

            <img
              src={platformArtwork}
              className="rx-platform"
              alt=""
              draggable="false"
            />

            <img
              src={coinArtwork}
              className="rx-side-coin rx-side-left"
              alt=""
              draggable="false"
            />

            <img
              src={coinArtwork}
              className="rx-side-coin rx-side-right"
              alt=""
              draggable="false"
            />

            <img
              src={orbitArtwork}
              className="rx-side-art"
              alt=""
              draggable="false"
            />

            <video
              className="rx-flame-video"
              src={REAL_FLAME_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />

            <div className="rx-rocket-crop">
              <img src={rocketArtwork} alt="" draggable="false" />
            </div>
          </section>

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
                  onChange={(e) =>
                    setLogo(e.target.files?.[0] || null)
                  }
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
                <Field
                  label="Coin Name"
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  placeholder="Enter coin name"
                />

                <Field
                  label="Symbol"
                  value={form.symbol}
                  onChange={(v) => set("symbol", v)}
                  placeholder="e.g. RXDOG"
                />

                <Field
                  label="Description"
                  value={form.description}
                  onChange={(v) => set("description", v)}
                  placeholder="Tell the world about your coin"
                />

                <div className="rx-two-fields">
                  <Field
                    label="Total Supply"
                    value={form.supply}
                    onChange={(v) => set("supply", v)}
                    placeholder="1,000,000,000"
                  />

                  <label className="rx-create-field">
                    <span>Network</span>

                    <div className="rx-network-select">
                      <button
                        type="button"
                        className={`rx-network-trigger ${networkOpen ? "open" : ""}`}
                        onClick={() => setNetworkOpen((open) => !open)}
                        aria-expanded={networkOpen}
                      >
                        <span>{form.network}</span>
                        <ChevronDown
                          className={`rx-chevron ${networkOpen ? "rotated" : ""}`}
                          size={18}
                        />
                      </button>
                      <div className={`rx-network-menu ${networkOpen ? "open" : ""}`}>
                        {["Solana", "Ethereum", "Base"].map((network) => (
                          <button
                            type="button"
                            key={network}
                            className={form.network === network ? "selected" : ""}
                            onClick={() => {
                              set("network", network);
                              setNetworkOpen(false);
                            }}
                          >
                            {network}
                          </button>
                        ))}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}

          {step > 1 && (
            <div className="rx-review">
              <div>
                <span>Coin</span>
                <strong>{form.name || "Your Space Coin"}</strong>
              </div>

              <div>
                <span>Symbol</span>
                <strong>{form.symbol || "—"}</strong>
              </div>

              <div>
                <span>Description</span>
                <strong>{form.description || "—"}</strong>
              </div>

              <div>
                <span>Total Supply</span>
                <strong>{form.supply}</strong>
              </div>

              <div>
                <span>Network</span>
                <strong>{form.network}</strong>
              </div>
            </div>
          )}

          <div className="rx-create-actions">
            {step > 1 && (
              <button
                className="secondary"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}

            {step < 4 ? (
              <button
                className="primary"
                disabled={step === 1 && !valid}
                onClick={() => setStep((s) => s + 1)}
              >
                <ArrowRight className="rx-action-arrow" size={16} />
                <span>Next Step</span>
              </button>
            ) : (
              <button
                className="primary"
                onClick={() => setStep(5)}
              >
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
  const [expanded, setExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerStart = useRef(null);
  const wallets = [
    ["MetaMask", metamaskLogo],
    ["Trust Wallet", trustWalletLogo],
    ["Phantom", phantomLogo],
    ["Coinbase Wallet", SiCoinbase],
    ["WalletConnect", SiWalletconnect],
  ];

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerStart.current = e.clientY;
    setDragging(true);
    setDragY(0);
  };

  const onPointerMove = (e) => {
    if (pointerStart.current == null) return;
    if (e.cancelable) e.preventDefault();
    setDragY(e.clientY - pointerStart.current);
  };
  const onPointerEnd = () => {
    if (pointerStart.current == null) return;
    if (dragY < -45) setExpanded(true);
    else if (dragY > 45) setExpanded(false);
    pointerStart.current = null;
    setDragging(false);
    setDragY(0);
  };

  return (
    <div className="rx-overlay" onClick={onClose}>
      <div
        className={`rx-sheet ${expanded ? "expanded" : ""} ${dragging ? "dragging" : ""}`}
        style={{ transform: dragging ? `translate3d(0, ${Math.max(-window.innerHeight * .72, Math.min(0, dragY))}px, 0)` : undefined }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <button
          type="button"
          className="rx-sheet-handle"
          onClick={() => setExpanded((open) => !open)}
          aria-label={expanded ? "Collapse wallet sheet" : "Expand wallet sheet"}
        />

        <div className="rx-sheet-head">
          <h3>Connect Wallet</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {wallets.map(([wallet, Icon]) => (
          <div className="rx-wallet-row" key={wallet}>
            <span>{typeof Icon === "string" ? <img src={Icon} alt="" /> : <Icon />}</span>
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
      <div
        className="rx-sheet rx-sheet-tall"
        onClick={(e) => e.stopPropagation()}
      >
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
              <small className={row[3].startsWith("-") ? "red" : ""}>
                {row[3]}
              </small>
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
.rx-header-spacer{width:40px;height:40px}
.rx-icon-btn{
  position:absolute;width:40px;height:40px;border:0;background:transparent;
  color:#111418;display:grid;place-items:center;padding:0
}
.rx-icon-btn.rx-left{left:0}
.rx-icon-btn.rx-right{right:0}

.rx-space-banner{
  position:relative;width:104%;max-width:none;height:auto;
  overflow:visible;border-radius:20px;margin:0 -2% 14px;background:transparent;aspect-ratio:2000 / 1414
}
.rx-space-banner>img{
  display:block;width:100%;height:100%;max-width:100%;
  object-fit:contain;object-position:center;background:transparent
}
.rx-space-banner-copy{
  position:absolute;left:7%;top:11%;width:53%;color:#fff;
  text-shadow:0 2px 8px rgba(0,0,0,.14)
}
.rx-space-banner-copy h2{
  margin:0;font-size:21px;line-height:1.04;font-weight:800;letter-spacing:-.7px
}
.rx-space-banner-copy p{
  margin:9px 0 0;font-size:10.5px;line-height:1.4;font-weight:600
}
.rx-space-banner-copy button{
  margin-top:12px;height:40px;padding:0 13px;
  border:1px solid rgba(255,255,255,.7);border-radius:12px;
  background:rgba(255,255,255,.18);color:#fff;
  display:inline-flex;align-items:center;gap:8px;
  font:800 10.5px 'Montserrat',sans-serif;
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)
}

.rx-mode-toggle{
  position:relative;height:62px;display:grid;grid-template-columns:1fr 1fr;gap:3px;
  padding:3px;margin-bottom:14px;border:1px solid #E7E8EA;
  border-radius:18px;background:#fff;box-shadow:0 3px 12px rgba(20,24,28,.04)
}
.rx-mode-indicator{position:absolute;z-index:0;left:3px;top:3px;width:calc(50% - 3px);height:calc(100% - 6px);border-radius:15px;background:#F4D35E;box-shadow:0 4px 12px rgba(244,211,94,.2);transition:transform .34s cubic-bezier(.22,.8,.2,1);pointer-events:none}
.rx-mode-toggle button{position:relative;z-index:1;border:0;background:transparent;border-radius:15px;color:#6E747A;
  display:flex;align-items:center;justify-content:center;gap:8px;
  font:800 11.5px 'Montserrat',sans-serif
}
.rx-mode-toggle button.active{
  background:transparent;color:#fff;box-shadow:none
}
.rx-mode-toggle img{width:30px;height:30px;object-fit:contain}

.rx-swipe-viewport{
  width:100%;overflow:hidden;touch-action:pan-y;user-select:none;cursor:grab
}
.rx-swipe-track{
  display:flex;width:200%;
  transform:translate3d(0,0,0);
  transition:transform .42s cubic-bezier(.22,.8,.2,1);
  will-change:transform
}
.rx-swipe-track.external{transform:translate3d(-50%,0,0)}
.rx-swipe-panel{width:50%;min-width:50%}

.rx-shortcuts{
  display:grid;grid-template-columns:repeat(4,1fr);
  gap:4px;margin-bottom:20px
}
.rx-shortcuts button{
  height:70px;min-width:0;border:0;
  border-radius:0;background:transparent;
  display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:7px;color:#555B61;
  font:700 8px 'Montserrat',sans-serif;
  text-align:center
}
.rx-shortcut-icon{
  width:42px;height:42px;border-radius:50%;
  background:#F1F2F3;display:grid;place-items:center;
  box-shadow:0 2px 7px rgba(20,24,28,.07)
}
.rx-shortcut-icon svg{
  width:18px;height:18px;stroke-width:2.2;color:#343A40
}
.rx-shortcuts button:first-child .rx-shortcut-icon svg,
.rx-shortcuts button:nth-child(3) .rx-shortcut-icon svg,
.rx-shortcuts button:nth-child(4) .rx-shortcut-icon svg{
  fill:#111418
}
.rx-shortcuts button:nth-child(2) .rx-shortcut-icon svg{stroke-width:2.5}
.rx-shortcut-label{white-space:nowrap}

.rx-space-section{margin-bottom:22px}
.rx-section-head{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:9px
}
.rx-section-head h2{
  margin:0;font-size:17px;line-height:1.12;
  font-weight:800;letter-spacing:-.55px
}
.rx-section-head button{
  border:0;background:transparent;color:#C28F18;
  font:700 10.5px 'Montserrat',sans-serif
}
.rx-coin-list{
  overflow:hidden;border:1px solid #E8EAEC;
  border-radius:15px;background:#fff
}
.rx-coin-row{
  width:100%;min-height:72px;padding:10px 12px;
  display:flex;align-items:center;gap:11px;
  border:0;border-bottom:1px solid #ECEDEF;
  background:#fff;color:#12151A;text-align:left
}
.rx-coin-row:last-child{border-bottom:0}
.rx-coin-row>img{
  width:44px;height:44px;border-radius:50%;
  object-fit:contain;flex:none;display:block
}
.rx-coin-name{min-width:0;flex:1;overflow:hidden}
.rx-coin-name strong{
  display:block;font-size:12px;line-height:1.18;
  font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
.rx-coin-name small{
  display:block;margin-top:4px;color:#747A81;
  font-size:10.5px;line-height:1;font-weight:600
}
.rx-coin-value{
  min-width:82px;text-align:right;flex:0 0 auto
}
.rx-coin-value strong{
  display:block;font-size:12px;line-height:1.15;
  font-weight:800;white-space:nowrap
}
.rx-coin-value small{
  display:block;margin-top:5px;color:#43A57C;
  font-size:10.5px;line-height:1;font-weight:800;white-space:nowrap
}

.rx-trending{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rx-trending button{
  height:46px;border:1px solid #E8EAEC;border-radius:12px;
  background:#fff;color:#14171B;font:800 10px 'Montserrat',sans-serif
}
.rx-trending b{color:#C28F18;margin-right:5px}

.rx-external-hero{
  position:relative;min-height:300px;border-radius:20px;
  background:linear-gradient(145deg,#fffdf2,#fff 60%);
  border:1px solid #ECEDEE;padding:28px 22px;overflow:hidden
}
.rx-external-hero h2{
  margin:0;font-size:28px;line-height:1.03;font-weight:800
}
.rx-external-hero p{
  width:58%;margin:12px 0 0;color:#747A80;
  font-size:12px;line-height:1.5
}
.rx-external-hero>img{
  position:absolute;width:205px;height:205px;
  object-fit:contain;right:-12px;bottom:-18px;
  filter:drop-shadow(0 18px 25px rgba(0,0,0,.12))
}
.rx-wallet-card{
  margin-top:14px;padding:16px;border:1px solid #E7E8EA;
  border-radius:16px;display:grid;grid-template-columns:48px 1fr;
  gap:10px;background:#fff
}
.rx-wallet-art{
  width:48px;height:48px;border-radius:14px;
  background:#F8F8F8;display:grid;place-items:center;overflow:hidden
}
.rx-wallet-art img{width:42px;height:42px;object-fit:contain}
.rx-wallet-card strong{font-size:12px}
.rx-wallet-card p{
  margin:5px 0 0;color:#747A80;font-size:10px;line-height:1.4
}
.rx-wallet-card button{
  grid-column:1/-1;height:42px;border:0;border-radius:11px;
  background:#D7A21A;color:#fff;font:800 11px 'Montserrat',sans-serif
}

.rx-overlay{
  position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.48);
  display:flex;align-items:flex-end;justify-content:center;
  animation:rx-overlay-fade .2s ease-out both;touch-action:none
}
.rx-sheet{
  width:min(100%,480px);background:#fff;color:#111418;
  border-radius:22px 22px 0 0;
  padding:9px 16px calc(22px + env(safe-area-inset-bottom));
  max-height:80dvh;overflow:auto;
  transform:translate3d(0,0,0);
  animation:rx-sheet-enter .28s cubic-bezier(.22,.8,.2,1) both;
  transition:transform .38s cubic-bezier(.22,.8,.2,1),max-height .38s ease;will-change:transform;
  touch-action:none
}
.rx-sheet.expanded{max-height:96dvh}
.rx-sheet.dragging{transition:none}
.rx-sheet img{display:block}
.rx-sheet-tall{max-height:86dvh}
.rx-sheet-handle{
  width:100%;height:22px;border:0;border-radius:0;background:transparent;
  margin:0 auto 4px;display:grid;place-items:start center;cursor:grab
}
.rx-sheet-handle::after{
  content:"";display:block;width:42px;height:4px;border-radius:9px;
  background:#D8DADC;margin-top:3px
}
.rx-sheet-head{
  height:38px;display:flex;align-items:center;
  justify-content:space-between;margin-bottom:8px
}
.rx-sheet-head h3{margin:0;font-size:16px;font-weight:800}
.rx-sheet-head button{border:0;background:transparent;color:#111418;padding:5px}

.rx-wallet-row{
  min-height:58px;border-bottom:1px solid #ECEDEF;
  display:grid;grid-template-columns:34px 1fr auto;
  align-items:center;gap:10px
}
.rx-wallet-row>span{
  width:34px;height:34px;border-radius:50%;
  background:#F7F7F7;display:grid;place-items:center;font-size:21px
}
.rx-wallet-row strong{font-size:12px}
.rx-wallet-row button{
  border:0;border-radius:9px;background:#F4D35E;color:#fff;
  padding:9px 11px;font:800 10px 'Montserrat',sans-serif
}
.rx-wallet-row>span svg,.rx-wallet-row>span img{width:21px;height:21px;object-fit:contain}

.rx-mycoin{
  display:grid;grid-template-columns:40px 1fr auto;
  gap:10px;align-items:center;padding:12px 0;
  border-bottom:1px solid #ECEDEF
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
  width:100%;text-align:left;border:1px solid #E8EAEC;
  background:#fff;border-radius:13px;padding:14px;margin:5px 0;
  display:grid;grid-template-columns:40px 1fr;column-gap:10px
}
.rx-menu-card>span{
  grid-row:span 2;width:40px;height:40px;border-radius:11px;
  background:#FFF7DA;display:grid;place-items:center;color:#C28F18
}
.rx-menu-card strong{font-size:12px;align-self:end}
.rx-menu-card small{font-size:9px;color:#747A80;margin-top:4px}

@media(max-width:430px){
  .rx-space-banner{width:104%;height:auto;aspect-ratio:2000 / 1414}
  .rx-space-banner-copy{left:7%;top:10%;width:55%}
  .rx-space-banner-copy h2{font-size:20px}
  .rx-space-banner-copy p{font-size:10.5px}
  .rx-space-banner-copy button{height:37px;font-size:10px}
  .rx-mode-toggle{height:60px}
  .rx-shortcuts{gap:2px}
  .rx-shortcuts button{height:68px;font-size:7.5px}
  .rx-shortcut-icon{width:40px;height:40px}
  .rx-coin-row{min-height:70px;padding-left:10px;padding-right:10px}
  .rx-coin-row>img{width:42px;height:42px}
  .rx-coin-value{min-width:78px}
}

@media(prefers-reduced-motion:reduce){
  .rx-space-shell *{animation:none!important;transition:none!important}
}
`;

const createStyles = `
.rx-create-stage{
  height:310px;position:relative;overflow:hidden;margin-top:2px
}
.rx-create-glow{
  position:absolute;left:50%;bottom:28px;width:70%;height:42%;
  transform:translateX(-50%);border-radius:50%;
  background:radial-gradient(circle,rgba(244,211,94,.22),transparent 70%);
  filter:blur(17px)
}
.rx-platform{
  position:absolute;z-index:1;left:50%;bottom:-28px;
  width:300px;height:220px;transform:translateX(-50%);
  object-fit:contain;filter:drop-shadow(0 12px 12px rgba(160,110,10,.12))
}
.rx-cloud-video{
  position:absolute;z-index:2;left:50%;bottom:8px;
  width:330px;height:180px;transform:translateX(-50%);
  object-fit:cover;mix-blend-mode:screen;
  filter:brightness(1.08) contrast(.9);opacity:.96;
  pointer-events:none;
  mask-image:radial-gradient(ellipse at center,black 55%,transparent 100%);
  -webkit-mask-image:radial-gradient(ellipse at center,black 55%,transparent 100%)
}
.rx-rocket-crop{
  position:absolute;z-index:5;left:50%;top:48px;width:108px;height:106px;
  transform:translateX(-50%);overflow:visible;pointer-events:none;
  filter:drop-shadow(0 12px 10px rgba(0,0,0,.10));
  animation:rx-float 2.8s ease-in-out infinite
}
.rx-rocket-crop img{
  display:block;width:108px;height:112px;
  object-fit:contain;object-position:top center
}
.rx-flame-video{
  position:absolute;z-index:4;left:50%;top:151px;
  width:58px;height:112px;transform:translateX(-50%);
  object-fit:cover;mix-blend-mode:screen;
  filter:brightness(1.15) saturate(1.08);opacity:.99;
  pointer-events:none;
  mask-image:radial-gradient(ellipse at center,black 42%,transparent 80%);
  -webkit-mask-image:radial-gradient(ellipse at center,black 42%,transparent 80%)
}
.rx-side-coin{
  position:absolute;z-index:7;top:116px;width:30px;height:30px;
  object-fit:contain;filter:drop-shadow(0 7px 7px rgba(198,145,18,.16));
  animation:rx-side-float 3.2s ease-in-out infinite
}
.rx-side-left{left:calc(50% - 112px)}
.rx-side-right{right:calc(50% - 112px);animation-delay:-1.6s}
.rx-side-art{
  position:absolute;z-index:3;right:calc(50% - 112px);top:104px;
  width:86px;height:86px;object-fit:contain;opacity:.98;
  filter:drop-shadow(0 7px 7px rgba(198,145,18,.14))
}
.rx-step{text-align:center;color:#747A80;font-size:10px;font-weight:700}
.rx-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0 18px}
.rx-progress span{height:4px;border-radius:8px;background:#E7E8EA}
.rx-progress span.on{background:#F4D35E}

.rx-upload{
  border:1px dashed #D8DADC;border-radius:15px;padding:16px;
  display:flex;flex-direction:column;align-items:center;
  justify-content:center;background:#FAFAFA;cursor:pointer
}
.rx-upload input{display:none}
.rx-upload-circle{
  width:72px;height:72px;border-radius:50%;display:grid;
  place-items:center;background:#FFF7DA;color:#D7A21A;
  overflow:hidden;margin-bottom:8px
}
.rx-upload-circle img{width:100%;height:100%;object-fit:cover}
.rx-upload strong{font-size:12px}
.rx-upload small{margin-top:4px;color:#747A80;font-size:9px}

.rx-fields{display:grid;gap:10px;margin-top:14px}
.rx-create-field{display:grid;gap:5px;color:#535A60;font-size:9px;font-weight:700}
.rx-create-field input,.rx-create-field select{
  width:100%;height:42px;border:1px solid #E4E6E8;border-radius:10px;
  padding:0 11px;background:#fff;outline:none;color:#111418;
  font:600 11px 'Montserrat',sans-serif
}
.rx-create-field input::placeholder{color:#B0B4B8}
.rx-two-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.rx-select-wrap{position:relative}
.rx-select-wrap select{appearance:none;padding-right:35px}
.rx-network-select{position:relative}
.rx-network-trigger{
  width:100%;height:42px;border:1px solid #E4E6E8;border-radius:10px;
  padding:0 11px;background:#fff;color:#111418;
  display:flex;align-items:center;justify-content:space-between;
  font:600 11px 'Montserrat',sans-serif
}
.rx-network-trigger.open{border-color:#D7A21A}
.rx-network-trigger .rx-chevron{position:static;transform:none;pointer-events:none;transition:transform .22s ease}
.rx-network-trigger .rx-chevron.rotated{transform:rotate(180deg)}
.rx-network-menu{
  position:absolute;z-index:30;left:0;right:0;bottom:calc(100% + 8px);
  padding:5px;border:1px solid #E4E6E8;border-radius:12px;
  background:#fff;box-shadow:0 12px 30px rgba(20,24,28,.12);
  opacity:0;visibility:hidden;transform:translateY(8px) scale(.985);
  transform-origin:bottom center;
  transition:opacity .22s ease,transform .22s ease,visibility .22s ease;
  pointer-events:none
}
.rx-network-menu.open{
  opacity:1;visibility:visible;transform:translateY(0) scale(1);
  pointer-events:auto
}
.rx-network-menu button{
  width:100%;height:38px;border:0;border-radius:8px;
  background:transparent;text-align:left;padding:0 10px;
  color:#111418;font:600 10.5px 'Montserrat',sans-serif
}
.rx-network-menu button.selected,.rx-network-menu button:active{background:#FFF7DA}

.rx-create-actions{display:flex;gap:9px;margin:16px 0}
.rx-create-actions button{height:44px;border-radius:11px;font:800 11px 'Montserrat',sans-serif}
.rx-create-actions .primary{flex:1;border:0;background:#D7A21A;color:#fff}
.rx-create-actions .primary{
  position:relative;display:flex;align-items:center;justify-content:center;gap:8px
}
.rx-create-actions .primary:disabled{opacity:.45}
.rx-action-arrow{position:absolute;left:12px}
.rx-create-actions .secondary{
  width:90px;border:1px solid #E1E3E5;background:#fff;color:#111418
}

.rx-review{border:1px solid #E7E8EA;border-radius:15px;overflow:hidden}
.rx-review div{
  display:flex;justify-content:space-between;gap:15px;
  padding:12px;border-bottom:1px solid #ECEDEF
}
.rx-review div:last-child{border-bottom:0}
.rx-review span{color:#747A80;font-size:10px}
.rx-review strong{font-size:10px;text-align:right}

.rx-launched{
  text-align:center;padding:25px 10px;
  border:1px solid #E7E8EA;border-radius:16px
}
.rx-launched>svg{color:#43A57C}
.rx-launched h2{font-size:17px;margin:9px 0 5px}
.rx-launched p{font-size:10px;color:#747A80;margin:0}

@keyframes rx-side-float{
  0%,100%{transform:translateY(0) rotate(-3deg)}
  50%{transform:translateY(-6px) rotate(3deg)}
}
@keyframes rx-overlay-fade{
  from{opacity:0}
  to{opacity:1}
}
@keyframes rx-sheet-enter{
  from{transform:translate3d(0,100%,0)}
  to{transform:translate3d(0,0,0)}
}
@keyframes rx-float{
  0%,100%{transform:translateX(-50%) translateY(0) rotate(-.3deg)}
  50%{transform:translateX(-50%) translateY(-5px) rotate(.3deg)}
}

@media(max-width:430px){
  .rx-create-stage{height:300px}
  .rx-platform{width:300px;height:215px}
  .rx-rocket-crop{top:51px;width:98px;height:102px}
  .rx-rocket-crop img{width:98px;height:102px}
  .rx-flame-video{top:148px;width:54px;height:106px}
  .rx-cloud-video{width:320px;height:174px}
  .rx-side-coin{width:29px;height:29px}
  .rx-side-left{left:calc(50% - 106px)}
  .rx-side-right{right:calc(50% - 106px)}
  .rx-side-art{right:calc(50% - 106px);top:99px;width:82px;height:82px}
}
`;

export default function SpaceCoinsDashboard({ onBack }) {
  const [mode, setMode] = useState("space");
  const [screen, setScreen] = useState("dashboard");
  const [overlay, setOverlay] = useState(null);

  if (screen === "create") {
    return <CreateCoin onBack={() => setScreen("dashboard")} />;
  }

  return (
    <>
      <style>{styles}</style>

      <Dashboard
        mode={mode}
        setMode={setMode}
        onCreate={() => setScreen("create")}
        onMenu={() => setOverlay("menu")}
        onMyCoins={() => setOverlay("coins")}
        onConnect={() => setOverlay("wallet")}
      />

      {overlay === "wallet" && (
        <WalletSheet onClose={() => setOverlay(null)} />
      )}

      {overlay === "coins" && (
        <MyCoinsSheet onClose={() => setOverlay(null)} />
      )}

      {overlay === "menu" && (
        <MenuSheet
          onClose={() => setOverlay(null)}
          onMyCoins={() => setOverlay("coins")}
        />
      )}
    </>
  );
}
