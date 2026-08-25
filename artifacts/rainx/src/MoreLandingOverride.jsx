import React, { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Gift, UsersRound, CircleDollarSign, Share2 } from "lucide-react";
import { supabase } from "./supabaseClient";

const FONT = "'Montserrat', sans-serif";
const ASSET = {
  verified: "/verified_banner_slim.png",
  gold: "/rewards_gold_ref.png",
  black: "/rewards_black_ref.png",
};

function formatCount(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K`;
  return n.toLocaleString();
}
function go(route) { window.location.hash = route; }

async function loadCreatorAnalytics(accountId) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: posts = [] } = await supabase.from("community_posts")
    .select("id,views,created_at").eq("user_id", accountId).gte("created_at", since);
  const postIds = posts.map((p) => p.id).filter(Boolean);
  let likes = [];
  if (postIds.length) {
    const received = await supabase.from("post_likes")
      .select("id,post_id,created_at").in("post_id", postIds).gte("created_at", since);
    if (!received.error) likes = received.data || [];
  }
  if (!likes.length && postIds.length) {
    const fallback = await supabase.from("post_likes").select("id,post_id,created_at").in("post_id", postIds);
    if (!fallback.error) likes = fallback.data || [];
  }
  const { data: follows = [] } = await supabase.from("follows")
    .select("id,created_at").eq("followed_id", accountId).gte("created_at", since);
  return {
    views: posts.reduce((sum, row) => sum + Number(row.views || 0), 0),
    followers: follows.length,
    likes: likes.length,
  };
}

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #F0F1F2",
  borderRadius: 20,
  boxShadow: "0 1px 8px rgba(17,20,24,0.045)",
};


function GiftsRewardsScreen({ onBack, account }) {
  const touchStart = React.useRef(null);
  const [closing, setClosing] = useState(false);
  const [settings, setSettings] = useState(false);
  const [giftsOn, setGiftsOn] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [eligibility, setEligibility] = useState({ moderation: false, subscription: false, age: false, personal: false });
  const close = () => { if (closing) return; setClosing(true); window.setTimeout(onBack, 360); };
  const onTouchStart = (event) => { touchStart.current = event.touches[0].clientX; };
  const onTouchEnd = (event) => { if (touchStart.current !== null && event.changedTouches[0].clientX - touchStart.current > 70) close(); touchStart.current = null; };
  useEffect(() => { if (!account?.id) return; Promise.all([supabase.from("follows").select("id", { count: "exact", head: true }).eq("followed_id", account.id), supabase.from("profiles").select("*").eq("id", account.id).maybeSingle()]).then(([followResult, profileResult]) => { setFollowers(followResult.count || 0); const p = profileResult.data || {}; const subDate = p.subscription_started_at || p.subscribed_at || p.subscription_start; const subDays = subDate ? (Date.now() - new Date(subDate).getTime()) / 864e5 : 0; const dob = p.date_of_birth || p.birth_date; const age = Number(p.age || 0) || (dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 864e5)) : 0); const accountType = String(p.account_type || p.user_type || "").toLowerCase(); setEligibility({ moderation: p.moderation_passed === true || p.video_moderation_passed === true || p.videos_approved === true, subscription: p.subscription_active === true || p.is_subscribed === true || subDays >= 30, age: age >= 18, personal: accountType ? !/(government|politician|political party)/.test(accountType) : false }); }).catch(() => {}); }, [account?.id]);
  const requirements = [
    [followers >= 1000, "Have at least 1,000 followers"],
    [eligibility.moderation, "Videos must pass safety moderation to be eligible for Gifts"],
    [eligibility.subscription, "Have an active subscription for at least 30 days"],
    [eligibility.age, "Meet the age requirement"],
    [eligibility.personal, "Accounts not used by government, politicians and political parties"],
  ];
  const pageStyle = { position: "fixed", inset: 0, zIndex: 20, background: "#FFFFFF", color: "#17191B", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif", animation: closing ? "rainxGiftOut .36s cubic-bezier(.4,0,1,1) both" : "rainxGiftIn .48s cubic-bezier(.22,1,.36,1) both" };
  if (settings) return <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={pageStyle}><style>{'@keyframes rainxGiftIn{from{transform:translateX(100%);opacity:1}to{transform:translateX(0);opacity:1}}@keyframes rainxGiftOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:1}}'}</style><main style={{maxWidth:480,minHeight:"100dvh",margin:"0 auto",background:"#FFF"}}><header style={{height:60,borderBottom:"1px solid #E5E5E5",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px"}}><button onClick={()=>setSettings(false)} aria-label="Back" style={{border:0,background:"none",padding:0}}><ArrowLeft size={28}/></button><strong style={{fontSize:22}}>Gifts settings</strong><span style={{fontSize:25,fontWeight:700}}>?</span></header><section style={{padding:"20px 21px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><strong style={{fontSize:20}}>Gifts</strong><p style={{margin:"10px 0 0",color:"#92979B",fontSize:17,lineHeight:1.32,maxWidth:335}}>Viewers can send Gifts on your eligible videos when the feature is turned on</p></div><button aria-label={giftsOn?"Turn gifts off":"Turn gifts on"} onClick={()=>setGiftsOn(v=>!v)} style={{width:giftsOn?66:64,height:38,border:0,borderRadius:22,padding:3,background:giftsOn?"#F4D35E":"#D8DADC",transition:"all 520ms cubic-bezier(.22,1,.36,1)",cursor:"pointer",flexShrink:0}}><span style={{display:"block",width:32,height:32,borderRadius:"50%",background:"#FFF",boxShadow:"0 1px 3px #7775",transform:giftsOn?"translateX(27px)":"translateX(0)",transition:"transform 520ms cubic-bezier(.22,1,.36,1)"}} /></button></section></main></div>;
  return <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={pageStyle}><style>{'@keyframes rainxGiftIn{from{transform:translateX(100%);opacity:1}to{transform:translateX(0);opacity:1}}@keyframes rainxGiftOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:1}}'}</style><main style={{maxWidth:480,minHeight:"100dvh",margin:"0 auto",padding:"10px 22px 34px",boxSizing:"border-box"}}><header style={{height:48,display:"flex",alignItems:"center",justifyContent:"space-between"}}><button onClick={close} aria-label="Back" style={{width:42,height:42,marginLeft:-9,border:0,background:"transparent",display:"grid",placeItems:"center"}}><ArrowLeft size={28} strokeWidth={2.2}/></button><button onClick={()=>{try{navigator.share?.({title:"RainX Rewards Program",text:"Earn more with RainX"});}catch{}}} aria-label="Share rewards" style={{width:38,height:38,marginRight:-6,border:0,background:"transparent"}}><span style={{fontSize:27}}>↗</span></button></header><h2 style={{textAlign:"center",color:"#BD8C05",fontSize:21,lineHeight:1.2,fontWeight:700,margin:"10px 0 10px"}}>RainX Rewards Program</h2><h1 style={{textAlign:"center",fontSize:35,lineHeight:1.06,letterSpacing:-1, fontWeight:750,margin:"0 auto 10px",maxWidth:390}}>Earn more with RainX</h1><p style={{textAlign:"center",color:"#596269",fontSize:17,lineHeight:1.43,margin:"0 auto 12px",maxWidth:385}}>RainX Rewards is now live! Earn gifts for your Posts and Profile. More activity, more rewards.</p><img src="/rewards-gifts-hero.webp" alt="Creator earning rewards" draggable="false" style={{display:"block",width:"calc(100% + 24px)",margin:"0 -12px 12px",height:"auto",objectFit:"contain"}}/><div style={{display:"flex",alignItems:"flex-start",gap:12,margin:"0 8px 16px"}}><span style={{flex:"0 0 21px",width:21,height:21,marginTop:2,borderRadius:"50%",background:"linear-gradient(90deg,#1555C9 0 50%,#F4D35E 50%)"}}/><p style={{margin:0,color:"#3F474D",fontSize:15,lineHeight:1.35}}>Stay active on RainX and unlock exciting gifts.<br/>Your activity powers your rewards.</p></div><div style={{borderTop:"2px dotted #E0E1E2",paddingTop:16}}><h3 style={{fontSize:21,lineHeight:1.2,fontWeight:750,margin:"0 0 15px 68px"}}>How to earn rewards</h3><div style={{display:"grid",gridTemplateColumns:"54px 1fr",columnGap:13,rowGap:16,alignItems:"center"}}><div style={{fontSize:30,textAlign:"center"}}>🎁</div><div><strong style={{fontSize:18}}>Gifts for your <span style={{color:"#BD8C05"}}>Posts</span></strong><p style={{margin:"3px 0 0",color:"#596269",fontSize:15,lineHeight:1.3}}>Create and share quality posts to earn gifts from the RainX community.</p></div><div style={{fontSize:30,textAlign:"center"}}>👥</div><div><strong style={{fontSize:18}}>Gifts for your <span style={{color:"#BD8C05"}}>Profile</span></strong><p style={{margin:"3px 0 0",color:"#596269",fontSize:15,lineHeight:1.3}}>Keep your profile active and engaging to receive more profile gifts.</p></div></div></div><section style={{marginTop:22}}><p style={{textAlign:"center",color:"#3F474D",fontSize:15,lineHeight:1.4,margin:"0 0 18px"}}>Eligible accounts and videos must be in good standing, follow our Community Guidelines, agree to the Terms of Service, Privacy Policy and Rewards Policy, and meet and maintain certain eligibility criteria, which include:</p>{requirements.map(([met,label])=><div key={label} style={{display:"flex",alignItems:"flex-start",gap:16,margin:"0 4px 16px"}}><span style={{color:met?"#F4D35E":"#D9DCDE",fontSize:31,lineHeight:.8,fontWeight:800}}>✓</span><span style={{fontSize:17,lineHeight:1.3,fontWeight:650}}>{label}</span></div>)}<button onClick={()=>setSettings(true)} style={{width:"100%",height:61,border:0,borderRadius:18,background:"#F4D35E",color:"#17191B",fontSize:21,fontWeight:750,display:"flex",alignItems:"center",justifyContent:"center",gap:17,marginTop:4}}>🎁 <span>Turn on Gifts</span></button></section><div style={{display:"flex",gap:14,alignItems:"center",background:"#FFF8E7",borderRadius:12,padding:"12px 14px",marginTop:18,color:"#30363B",fontSize:14,lineHeight:1.3}}><span style={{fontSize:27}}>🛡️</span><span>Stay active, create meaningful content,<br/>and enjoy exclusive rewards only on RainX.</span></div></main></div>;
}

export default function MoreLandingOverride({ account }) {
  const [analytics, setAnalytics] = useState({ views: 0, followers: 0, likes: 0 });
  const [giftScreen, setGiftScreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (account?.id) {
      loadCreatorAnalytics(account.id).then((data) => {
        if (!cancelled) setAnalytics(data);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [account?.id]);

  if (giftScreen) return <GiftsRewardsScreen onBack={() => setGiftScreen(false)} />;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FFFFFF",
        color: "#111418",
        fontFamily: FONT,
        overflow: "hidden",
        width: "100%",
        height: "100%",
        contain: "layout paint size",
        overscrollBehavior: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          minHeight: 0,
          width: "100%",
          boxSizing: "border-box",
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehaviorY: "none",
          overscrollBehaviorX: "none",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          scrollbarWidth: "none",
          padding: "0 14px 18px",
        }}
      >
        <header
          style={{
            height: 72,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            aria-label="Back"
            onClick={() => go("#home")}
            style={{
              position: "absolute",
              left: -3,
              top: 16,
              width: 40,
              height: 40,
              border: 0,
              background: "transparent",
              display: "grid",
              placeItems: "center",
              color: "#111418",
              padding: 0,
            }}
          >
            <ArrowLeft size={28} strokeWidth={2.15} />
          </button>
          <div
            style={{
              fontSize: 21,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: -0.7,
            }}
          >
            Trader’s Space
          </div>
        </header>

        <div
          style={{
            height: 52,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            borderBottom: "1px solid #E7E8EA",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "3px solid #111418",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Posts
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#858A91",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Space Talk
          </div>
        </div>

        <section
          style={{
            ...cardStyle,
            padding: "20px 20px 18px",
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => go("#more/analytics")}
            style={{
              width: "100%",
              padding: 0,
              border: 0,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#111418",
              textAlign: "left",
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: -0.45,
              }}
            >
              Analytics
            </span>
            <ChevronRight size={25} strokeWidth={2.15} />
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              columnGap: 10,
              marginTop: 22,
            }}
          >
            {[
              ["Post views", formatCount(analytics.views)],
              ["Net followers", formatCount(analytics.followers)],
              ["Likes", formatCount(analytics.likes)],
            ].map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.25,
                    fontWeight: 700,
                    marginBottom: 7,
                    whiteSpace: "nowrap",
                    letterSpacing: -0.15,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 29,
                    lineHeight: 1,
                    fontWeight: 800,
                    letterSpacing: -1,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    marginTop: 11,
                    fontSize: 13,
                    lineHeight: 1,
                    color: "#329CE6",
                    fontWeight: 700,
                  }}
                >
                  ▲ 7d
                </div>
              </div>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={() => go("#more/verification")}
          aria-label="Get Verified"
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            margin: "0 0 16px",
            border: 0,
            outline: "none",
            background: "transparent",
            overflow: "visible",
          }}
        >
          <img
            src={ASSET.verified}
            alt="Get Verified — Earn your badge & unlock exclusive rewards"
            draggable="false"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              border: 0,
              outline: "none",
            }}
          />
        </button>

        <section
          style={{
            ...cardStyle,
            padding: "20px 20px 18px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: -0.45,
              }}
            >
              Monetisation
            </div>
            <ChevronRight size={25} strokeWidth={2.15} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={() => go("#more/rewards")}
              style={imageButtonStyle}
            >
              <img
                src={ASSET.gold}
                alt="Grab Rewards for your 10K+ posts views"
                draggable="false"
                style={imageStyle}
              />
            </button>

            <button
              type="button"
              onClick={() => go("#more/rewards")}
              style={imageButtonStyle}
            >
              <img
                src={ASSET.black}
                alt="monetize in the same orbit"
                draggable="false"
                style={imageStyle}
              />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
              marginTop: 13,
            }}
          >
            {[
              ["Gifts", Gift, "#more/rewards", true],
              ["Referrals", UsersRound, "#more/referrals"],
              ["Space Talk\nEarnings", CircleDollarSign, "#more/rewards"],
            ].map(([label, Icon, route, gift]) => (
              <button
                key={label}
                type="button"
                onClick={() => gift ? setGiftScreen(true) : go(route)}
                style={{
                  minWidth: 0,
                  border: 0,
                  background: "transparent",
                  color: "#111418",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: 0,
                  fontFamily: FONT,
                }}
              >
                <span
                  style={{
                    width: "100%",
                    height: 54,
                    border: "1px solid #E4E6E8",
                    borderRadius: 13,
                    background: "#F5F6F7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                >
                  <Icon size={20} strokeWidth={2.05} />
                </span>
                <span
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    lineHeight: 1.18,
                    fontWeight: 600,
                    whiteSpace: "pre-line",
                    textAlign: "center",
                  }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => go("#more/rewards")}
            style={{
              width: "100%",
              height: 40,
              marginTop: 16,
              border: 0,
              borderRadius: 12,
              background: "#F1F2F3",
              color: "#111418",
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            More ways to get paid
          </button>
        </section>
      </div>
    </div>
  );
}

const imageButtonStyle = {
  display: "block",
  width: "100%",
  padding: 0,
  border: 0,
  outline: "none",
  borderRadius: 0,
  overflow: "visible",
  background: "transparent",
};

const imageStyle = {
  display: "block",
  width: "100%",
  height: "auto",
  aspectRatio: "292 / 331",
  objectFit: "cover",
  objectPosition: "center",
  border: 0,
  outline: "none",
};
