import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Command,
  Database,
  Droplets,
  ExternalLink,
  LockKeyhole,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Wallet,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const LAUNCH_COST = 25;

function SpaceMotionMark({ T }) {
  return (
    <div className="rx-space-orbit" aria-hidden="true">
      <svg viewBox="0 0 320 240" role="presentation">
        <defs>
          <linearGradient id="spaceGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={T.goldBright} />
            <stop offset="1" stopColor={T.gold} />
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="120" rx="120" ry="54" fill="none" stroke={T.gold} strokeOpacity=".42" />
        <ellipse cx="160" cy="120" rx="92" ry="92" fill="none" stroke={T.gold} strokeOpacity=".14" transform="rotate(-38 160 120)" />
        <path d="M48 126c38-50 182-76 226-8" fill="none" stroke={T.goldBright} strokeOpacity=".3" strokeDasharray="4 8" />
        <circle cx="160" cy="120" r="42" fill={T.card} stroke="url(#spaceGold)" strokeWidth="2" />
        <circle cx="160" cy="120" r="30" fill="none" stroke={T.gold} strokeOpacity=".3" />
        <path d="M148 111h24M148 120h24M148 129h14" stroke={T.goldBright} strokeWidth="2" strokeLinecap="round" />
        <circle className="rx-space-orbit-dot rx-space-orbit-dot-a" cx="42" cy="120" r="5" fill={T.goldBright} />
        <circle className="rx-space-orbit-dot rx-space-orbit-dot-b" cx="268" cy="120" r="4" fill={T.sage} />
        <circle cx="224" cy="54" r="3" fill={T.goldBright} />
      </svg>
    </div>
  );
}

function SpaceButton({ children, onClick, secondary = false, disabled = false, full = false, T }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rx-space-button ${secondary ? "rx-space-button-secondary" : ""}`}
      style={{ width: full ? "100%" : undefined, borderColor: secondary ? T.cardBorder : T.gold, color: secondary ? T.paper : T.ink, background: secondary ? T.card : T.gold }}
    >
      {children}
    </button>
  );
}

function SpacePanel({ children, T, className = "" }) {
  return <section className={`rx-space-panel ${className}`} style={{ background: T.card, borderColor: T.cardBorder }}>{children}</section>;
}

function SpaceHeader({ title, subtitle, onBack, T }) {
  return (
    <header className="rx-space-header" style={{ borderColor: T.cardBorder }}>
      <button type="button" onClick={onBack} className="rx-space-icon-button" style={{ color: T.paper }} aria-label="Back to Space">
        <ArrowLeft size={19} />
      </button>
      <div>
        <div className="rx-space-eyebrow" style={{ color: T.goldBright }}>SPACE</div>
        <h1 style={{ color: T.paper }}>{title}</h1>
        {subtitle && <p style={{ color: T.muted }}>{subtitle}</p>}
      </div>
      <div style={{ width: 36 }} />
    </header>
  );
}

function SectionTitle({ eyebrow, title, detail, T }) {
  return (
    <div className="rx-space-section-title">
      <div>
        {eyebrow && <div className="rx-space-eyebrow" style={{ color: T.goldBright }}>{eyebrow}</div>}
        <h2 style={{ color: T.paper }}>{title}</h2>
      </div>
      {detail && <span style={{ color: T.muted }}>{detail}</span>}
    </div>
  );
}

function SpaceLanding({ onLaunch, onExplore, onManage, T }) {
  const process = [
    ["01", "Fund your launch", "Purchase or authorize launch credits from your existing wallet."],
    ["02", "Configure the coin", "Set the identity, supply, price, and creator allocation."],
    ["03", "Launch with control", "Review the terms, confirm, and manage liquidity after launch."],
    ["04", "Let it be discovered", "Keep the coin visible inside RainX for local discovery and trading."],
  ];

  return (
    <div className="rx-space-page" style={{ background: T.ink, color: T.paper }}>
      <div className="rx-space-topbar">
        <div className="rx-space-brand"><span style={{ color: T.goldBright }}>◌</span><span>Space</span></div>
        <div className="rx-space-status" style={{ color: T.muted, borderColor: T.cardBorder }}><span style={{ background: T.sage }} /> Creator-owned markets</div>
      </div>
      <section className="rx-space-hero">
        <div className="rx-space-hero-copy">
          <div className="rx-space-kicker" style={{ color: T.goldBright }}><Sparkles size={14} /> RAINX CREATOR ECONOMY</div>
          <h1 style={{ color: T.paper }}>Play Smart.<br /><span style={{ color: T.goldBright }}>Win More.</span></h1>
          <p style={{ color: T.muted }}>Create and discover community-owned coins with clear launch controls, local trading, and creator-first liquidity management.</p>
          <div className="rx-space-actions">
            <SpaceButton onClick={onLaunch} T={T}>Create a Coin <ArrowRight size={16} /></SpaceButton>
            <SpaceButton onClick={onExplore} secondary T={T}>Explore Coins</SpaceButton>
          </div>
          <button type="button" onClick={onManage} className="rx-space-text-button" style={{ color: T.goldBright }}>Open creator console <ChevronRight size={15} /></button>
        </div>
        <SpaceMotionMark T={T} />
      </section>

      <SpacePanel T={T} className="rx-space-principles">
        <div className="rx-space-principle"><ShieldAlert size={18} color={T.goldBright} /><div><strong style={{ color: T.paper }}>Built for accountable launches</strong><span style={{ color: T.muted }}>No hidden balance deductions. Confirmed server actions only.</span></div></div>
        <div className="rx-space-principle"><Database size={18} color={T.goldBright} /><div><strong style={{ color: T.paper }}>Inside RainX</strong><span style={{ color: T.muted }}>A focused local market, not a global exchange.</span></div></div>
      </SpacePanel>

      <section className="rx-space-process">
        <SectionTitle eyebrow="THE RAINX MODEL" title="A considered path from idea to market." T={T} />
        <div className="rx-space-process-list">
          {process.map(([number, title, copy]) => <div className="rx-space-process-row" key={number} style={{ borderColor: T.cardBorder }}>
            <span className="rx-space-process-number" style={{ color: T.goldBright }}>{number}</span>
            <div><h3 style={{ color: T.paper }}>{title}</h3><p style={{ color: T.muted }}>{copy}</p></div>
          </div>)}
        </div>
      </section>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder, step, T }) {
  return (
    <label className="rx-space-field">
      <span style={{ color: T.muted }}>{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step} style={{ color: T.paper, background: T.ink, borderColor: T.cardBorder }} />
    </label>
  );
}

function CoinLaunchFlow({ account, T, onBack, onOpenCoin }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", symbol: "", description: "", supply: "", decimals: "18", price: "", creatorAllocation: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletState, setWalletState] = useState("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    if (!account?.id) return undefined;
    setWalletState("loading");
    supabase.from("wallet_balances").select("balance").eq("user_id", account.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { setWalletState("unavailable"); return; }
      setWalletBalance(Number(data?.balance || 0));
      setWalletState("ready");
    }).catch(() => active && setWalletState("unavailable"));
    return () => { active = false; };
  }, [account?.id]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const identityValid = form.name.trim().length >= 2 && /^[A-Za-z0-9]{2,10}$/.test(form.symbol.trim());
  const settingsValid = Number(form.supply) > 0 && Number(form.decimals) >= 0 && Number(form.decimals) <= 18 && Number(form.price) > 0 && Number(form.creatorAllocation) >= 0 && Number(form.creatorAllocation) <= 100;
  const reviewReady = identityValid && settingsValid && confirmed;

  const next = () => {
    setNotice("");
    if (step === 1 && !identityValid) return setNotice("Enter a name and a symbol using 2–10 letters or numbers.");
    if (step === 2 && !settingsValid) return setNotice("Check the supply, decimals, initial price, and allocation values.");
    setStep((current) => Math.min(4, current + 1));
  };
  const requestLaunch = () => {
    if (!reviewReady) return setNotice("Review the launch details and accept the irreversible-action warning.");
    if (walletState !== "ready") return setNotice("Your wallet balance could not be verified. Launch is unavailable until it can be confirmed.");
    if (walletBalance < LAUNCH_COST) return setNotice(`You need at least ${LAUNCH_COST} launch credits. Your current balance is ${walletBalance.toFixed(2)}.`);
    setNotice("Launch authorization is not available yet because RainX has no coin-launch endpoint configured. No funds were moved.");
  };

  return (
    <div className="rx-space-page" style={{ background: T.ink, color: T.paper }}>
      <SpaceHeader title="Create a Coin" subtitle="A controlled, review-first launch flow" onBack={onBack} T={T} />
      <div className="rx-space-content">
        <div className="rx-space-stepper">{["Identity", "Settings", "Review", "Authorize"].map((label, index) => <div key={label} className={`rx-space-step ${step >= index + 1 ? "is-active" : ""}`} style={{ color: step >= index + 1 ? T.goldBright : T.muted }}><span>{index + 1}</span>{label}</div>)}</div>
        {step === 1 && <SpacePanel T={T}><SectionTitle eyebrow="STEP 1" title="Give the coin a clear identity." detail="Required" T={T} /><div className="rx-space-form-grid"><FormField label="Coin name" value={form.name} onChange={update("name")} placeholder="e.g. Northstar" T={T} /><FormField label="Symbol" value={form.symbol} onChange={update("symbol")} placeholder="NSTAR" T={T} /></div><FormField label="Description" value={form.description} onChange={update("description")} placeholder="What does this coin represent?" T={T} /></SpacePanel>}
        {step === 2 && <SpacePanel T={T}><SectionTitle eyebrow="STEP 2" title="Set the launch parameters." detail="Required" T={T} /><div className="rx-space-form-grid"><FormField label="Total supply" type="number" value={form.supply} onChange={update("supply")} placeholder="1000000" T={T} /><FormField label="Decimals" type="number" value={form.decimals} onChange={update("decimals")} step="1" T={T} /><FormField label="Initial price (GHS)" type="number" value={form.price} onChange={update("price")} placeholder="0.10" step="0.000001" T={T} /><FormField label="Creator allocation (%)" type="number" value={form.creatorAllocation} onChange={update("creatorAllocation")} placeholder="20" step="0.01" T={T} /></div><div className="rx-space-inline-note" style={{ color: T.muted }}><SlidersHorizontal size={15} color={T.goldBright} /> Liquidity allocation is calculated by the launch service after authorization.</div></SpacePanel>}
        {step === 3 && <SpacePanel T={T}><SectionTitle eyebrow="STEP 3" title="Review before you authorize." detail="Cannot be undone" T={T} /><div className="rx-space-review">{[["Coin", `${form.name || "—"} ${form.symbol ? `(${form.symbol.toUpperCase()})` : ""}`], ["Supply", form.supply || "—"], ["Initial price", form.price ? `GHS ${Number(form.price).toFixed(6)}` : "—"], ["Creator allocation", form.creatorAllocation ? `${form.creatorAllocation}%` : "—"], ["Estimated launch cost", `At least ${LAUNCH_COST} credits`]].map(([label, value]) => <div key={label}><span style={{ color: T.muted }}>{label}</span><strong style={{ color: T.paper }}>{value}</strong></div>)}</div><label className="rx-space-check" style={{ borderColor: confirmed ? T.gold : T.cardBorder }}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span style={{ color: T.paper }}>I understand that launch and liquidity actions may be irreversible after server confirmation.</span></label></SpacePanel>}
        {step === 4 && <SpacePanel T={T}><SectionTitle eyebrow="STEP 4" title="Confirm wallet authorization." detail="No silent deductions" T={T} /><div className="rx-space-wallet-check"><Wallet size={21} color={T.goldBright} /><div><strong style={{ color: T.paper }}>Existing wallet balance</strong><span style={{ color: T.muted }}>{walletState === "loading" ? "Checking balance…" : walletState === "ready" ? `${walletBalance.toFixed(2)} credits available` : "Balance verification unavailable"}</span></div><span className="rx-space-balance-state" style={{ color: walletState === "ready" ? T.sage : T.rust }}>{walletState === "ready" ? "VERIFIED" : "PENDING"}</span></div><div className="rx-space-unavailable" style={{ borderColor: T.cardBorder }}><LockKeyhole size={17} color={T.goldBright} /><div><strong style={{ color: T.paper }}>Launch authorization is not connected</strong><p style={{ color: T.muted }}>RainX does not currently expose a coin-launch endpoint or payment authorization route. This flow will not subtract credits or report a launch until the server confirms it.</p></div></div></SpacePanel>}
        {notice && <div className="rx-space-notice" style={{ borderColor: T.rust, color: T.paper }}><ShieldAlert size={16} color={T.rust} />{notice}</div>}
        <div className="rx-space-form-actions">{step > 1 && <SpaceButton secondary onClick={() => { setNotice(""); setStep((current) => current - 1); }} T={T}>Back</SpaceButton>}{step < 4 ? <SpaceButton onClick={next} T={T}>Continue <ArrowRight size={16} /></SpaceButton> : <SpaceButton onClick={requestLaunch} disabled T={T}>Authorize launch <LockKeyhole size={16} /></SpaceButton>}</div>
        {step === 4 && <div className="rx-space-disclaimer" style={{ color: T.muted }}>Need to leave? Your completed review stays on this screen until you navigate away.</div>}
      </div>
    </div>
  );
}

function PriceChart({ T }) {
  return <div className="rx-space-chart" style={{ borderColor: T.cardBorder }}><svg viewBox="0 0 600 160" preserveAspectRatio="none" aria-label="Price history unavailable"><path d="M0 132 C54 126 65 104 112 112 S165 84 208 99 S274 66 315 81 S370 52 414 68 S467 42 510 55 S560 26 600 34" fill="none" stroke={T.goldBright} strokeWidth="3" /><path d="M0 132 C54 126 65 104 112 112 S165 84 208 99 S274 66 315 81 S370 52 414 68 S467 42 510 55 S560 26 600 34 L600 160 L0 160Z" fill={T.gold} fillOpacity=".08" /></svg><span style={{ color: T.muted }}>Connected coin history appears after the market confirms trades.</span></div>;
}

function CoinDiscovery({ coins, loading, error, T, onBack, onSelect, onManage }) {
  return <div className="rx-space-page" style={{ background: T.ink, color: T.paper }}><SpaceHeader title="Explore Coins" subtitle="Discover creator-owned markets inside RainX" onBack={onBack} T={T} /><div className="rx-space-content"><div className="rx-space-discovery-note" style={{ borderColor: T.cardBorder }}><BarChart3 size={17} color={T.goldBright} /><span style={{ color: T.muted }}>Local RainX trading only. This is not global exchange infrastructure.</span></div>{loading ? <SpacePanel T={T}><div className="rx-space-loading" style={{ color: T.muted }}>Loading the coin registry…</div></SpacePanel> : error ? <UnavailableState title="Coin registry unavailable" body="The current RainX backend does not expose a readable coin registry yet. No sample coins are being shown." T={T} /> : coins.length === 0 ? <UnavailableState title="No coins launched yet" body="When creator launches are confirmed by the server, they will appear here for discovery." T={T} /> : <div className="rx-space-coin-list">{coins.map((coin) => <button type="button" className="rx-space-coin-card" key={coin.id} onClick={() => onSelect(coin)} style={{ background: T.card, borderColor: T.cardBorder, color: T.paper }}><span className="rx-space-coin-mark" style={{ color: T.goldBright, borderColor: T.gold }}>{(coin.symbol || coin.name || "?").slice(0, 1).toUpperCase()}</span><span className="rx-space-coin-copy"><strong>{coin.name || "Unnamed coin"} <small style={{ color: T.goldBright }}>{coin.symbol ? `$${coin.symbol}` : ""}</small></strong><span style={{ color: T.muted }}>{coin.description || "Creator-owned RainX market"}</span></span><ChevronRight size={17} color={T.muted} /></button>)}</div>}<button type="button" onClick={onManage} className="rx-space-text-button" style={{ color: T.goldBright }}>Manage your creator coins <ChevronRight size={15} /></button></div></div>;
}

function UnavailableState({ title, body, T }) {
  return <SpacePanel T={T} className="rx-space-empty"><CircleDollarSign size={26} color={T.goldBright} /><h3 style={{ color: T.paper }}>{title}</h3><p style={{ color: T.muted }}>{body}</p></SpacePanel>;
}

function CoinDetail({ coin, T, onBack }) {
  const [tradeMode, setTradeMode] = useState("buy");
  const [amount, setAmount] = useState("");
  return <div className="rx-space-page" style={{ background: T.ink, color: T.paper }}><SpaceHeader title={coin?.name || "Coin detail"} subtitle={coin?.symbol ? `$${coin.symbol}` : "RainX local market"} onBack={onBack} T={T} /><div className="rx-space-content"><SpacePanel T={T} className="rx-space-coin-overview"><div><div className="rx-space-eyebrow" style={{ color: T.goldBright }}>LOCAL MARKET</div><h2 style={{ color: T.paper }}>{coin?.name || "Unnamed coin"}</h2><p style={{ color: T.muted }}>{coin?.description || "Creator-owned coin inside RainX."}</p></div><div className="rx-space-price"><span style={{ color: T.muted }}>Current price</span><strong style={{ color: T.paper }}>Unavailable</strong></div></SpacePanel><PriceChart T={T} /><SpacePanel T={T}><SectionTitle eyebrow="TRADE" title="Buy or sell inside RainX." detail="Limited market" T={T} /><div className="rx-space-trade-tabs"><button type="button" onClick={() => setTradeMode("buy")} className={tradeMode === "buy" ? "is-active" : ""} style={{ color: tradeMode === "buy" ? T.goldBright : T.muted, borderColor: tradeMode === "buy" ? T.gold : T.cardBorder }}>Buy</button><button type="button" onClick={() => setTradeMode("sell")} className={tradeMode === "sell" ? "is-active" : ""} style={{ color: tradeMode === "sell" ? T.goldBright : T.muted, borderColor: tradeMode === "sell" ? T.gold : T.cardBorder }}>Sell</button></div><FormField label={`${tradeMode === "buy" ? "Amount to spend" : "Amount to sell"}`} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" T={T} /><div className="rx-space-trade-summary" style={{ color: T.muted }}><span>Estimated total</span><strong style={{ color: T.paper }}>Unavailable until price data is confirmed</strong></div><SpaceButton full disabled T={T}>{tradeMode === "buy" ? "Buy" : "Sell"} unavailable</SpaceButton><div className="rx-space-unavailable compact" style={{ borderColor: T.cardBorder }}><Clock3 size={15} color={T.goldBright} /><span style={{ color: T.muted }}>Trading is not enabled for this coin until RainX has a confirmed local trade endpoint.</span></div></SpacePanel></div></div>;
}

function CreatorManagement({ account, T, onBack }) {
  const [coins, setCoins] = useState([]);
  const [state, setState] = useState("loading");
  useEffect(() => {
    if (!account?.id) return undefined;
    let active = true;
    supabase.from("coins").select("*").eq("creator_id", account.id).order("created_at", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      setCoins(data || []);
      setState(error ? "unavailable" : "ready");
    }).catch(() => active && setState("unavailable"));
    return () => { active = false; };
  }, [account?.id]);
  return <div className="rx-space-page" style={{ background: T.ink, color: T.paper }}><SpaceHeader title="Creator console" subtitle="Manage coins you own" onBack={onBack} T={T} /><div className="rx-space-content"><div className="rx-space-management-summary"><div><span style={{ color: T.muted }}>Creator coins</span><strong style={{ color: T.paper }}>{state === "ready" ? coins.length : "—"}</strong></div><div><span style={{ color: T.muted }}>Liquidity controls</span><strong style={{ color: T.goldBright }}>Server-gated</strong></div></div>{state === "loading" && <SpacePanel T={T}><div className="rx-space-loading" style={{ color: T.muted }}>Loading your creator portfolio…</div></SpacePanel>}{state === "unavailable" && <UnavailableState title="Creator data unavailable" body="The current backend does not expose the creator coin registry yet. Management controls remain hidden until ownership can be verified." T={T} />}{state === "ready" && coins.length === 0 && <UnavailableState title="Your creator portfolio is empty" body="Confirmed launches will appear here after the server creates the coin record." T={T} />}{state === "ready" && coins.length > 0 && <div className="rx-space-coin-list">{coins.map((coin) => <SpacePanel T={T} key={coin.id}><div className="rx-space-management-card"><div className="rx-space-coin-mark" style={{ color: T.goldBright, borderColor: T.gold }}>{(coin.symbol || coin.name || "?").slice(0, 1).toUpperCase()}</div><div className="rx-space-coin-copy"><strong style={{ color: T.paper }}>{coin.name || "Unnamed coin"}</strong><span style={{ color: T.muted }}>{coin.symbol || "—"} · {coin.status || "pending"}</span></div><span className="rx-space-status-label" style={{ color: T.sage }}>{coin.status || "PENDING"}</span></div><div className="rx-space-management-grid">{["Current price", "Holders", "Liquidity", "Launch date"].map((label) => <div key={label}><span style={{ color: T.muted }}>{label}</span><strong style={{ color: T.paper }}>Unavailable</strong></div>)}</div><div className="rx-space-unavailable compact" style={{ borderColor: T.cardBorder }}><Droplets size={15} color={T.goldBright} /><span style={{ color: T.muted }}>Pause, resume, add, remove, and sweep controls will appear only when authorized server operations exist.</span></div></SpacePanel>)}</div>}</div></div>;
}

export default function SpaceTab({ account, T }) {
  const [view, setView] = useState("landing");
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [coins, setCoins] = useState([]);
  const [registryState, setRegistryState] = useState("loading");

  useEffect(() => {
    let active = true;
    supabase.from("coins").select("*").order("created_at", { ascending: false }).limit(30).then(({ data, error }) => {
      if (!active) return;
      setCoins(data || []);
      setRegistryState(error ? "unavailable" : "ready");
    }).catch(() => active && setRegistryState("unavailable"));
    return () => { active = false; };
  }, []);

  const shared = { account, T, onBack: () => setView("landing") };
  if (view === "launch") return <CoinLaunchFlow {...shared} onOpenCoin={(coin) => { setSelectedCoin(coin); setView("coin"); }} />;
  if (view === "explore") return <CoinDiscovery {...shared} coins={coins} loading={registryState === "loading"} error={registryState === "unavailable"} onSelect={(coin) => { setSelectedCoin(coin); setView("coin"); }} onManage={() => setView("manage")} />;
  if (view === "coin" && selectedCoin) return <CoinDetail {...shared} coin={selectedCoin} />;
  if (view === "manage") return <CreatorManagement {...shared} />;
  return <SpaceLanding T={T} onLaunch={() => setView("launch")} onExplore={() => setView("explore")} onManage={() => setView("manage")} />;
}