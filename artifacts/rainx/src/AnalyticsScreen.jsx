import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { supabase } from "./supabaseClient";

const FONT = "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const GOLD = "#F4D35E";
const INK = "#0F1419";
const MUTED = "#7B8086";
const BG = "#F5F5F5";
const CARD = "#FFFFFF";
const LINE = "#E3E5E7";
const BLUE = "#D4AF37";
const BAR = "#DCE1E5";
const TABS = ["Overview", "Content", "Viewers", "Followers"];
const SOURCES = [["for_you", "For You"], ["profile", "Personal profile"], ["search", "Search"], ["following", "Following"], ["sound", "Sound"]];

const daysFor = (p) => p === "7 days" ? 7 : p === "28 days" ? 28 : p === "60 days" ? 60 : 365;
const dayKey = (v) => { const d = new Date(v); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const dayLabel = (k) => new Date(`${k}T12:00:00`).toLocaleDateString("en", { month:"short", day:"numeric" });
const fmt = (v, compact=false) => { const n=Number(v||0); if(!compact) return n.toLocaleString(); if(n>=1e6) return `${(n/1e6).toFixed(n>=1e7?0:1).replace(/\.0$/,'')}M`; if(n>=1e3) return `${(n/1e3).toFixed(n>=1e5?0:1).replace(/\.0$/,'')}K`; return n.toLocaleString(); };
const pct = (a,b) => b ? ((a-b)/b)*100 : (a ? 100 : 0);

function SmoothChart({ points, height=190 }) {
  if (!points?.length || points.every(p => !Number(p.value))) return <div style={{height,display:"grid",placeItems:"center",color:MUTED,fontSize:13}}>No data yet</div>;
  const W=640,P={t:16,r:58,b:30,l:10}, iw=W-P.l-P.r, ih=height-P.t-P.b, max=Math.max(...points.map(p=>Number(p.value)||0),1);
  const c=points.map((p,i)=>({x:P.l+(i/Math.max(points.length-1,1))*iw,y:P.t+ih-(Number(p.value)||0)/max*ih}));
  const path=c.map((p,i)=>{if(!i)return `M ${p.x} ${p.y}`;const q=c[i-1],m=(q.x+p.x)/2;return `C ${m} ${q.y}, ${m} ${p.y}, ${p.x} ${p.y}`;}).join(" ");
  const area=`${path} L ${c[c.length-1].x} ${height-P.b} L ${c[0].x} ${height-P.b} Z`;
  const labels=[0,Math.floor((points.length-1)/2),points.length-1];
  return <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none">
    <defs><linearGradient id="rainxAnalyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity=".28"/><stop offset="100%" stopColor={GOLD} stopOpacity=".02"/></linearGradient></defs>
    {[0,.5,1].map(r=><line key={r} x1={P.l} x2={W-P.r} y1={P.t+ih*r} y2={P.t+ih*r} stroke="#D9DDE0" strokeDasharray="4 5"/>)}
    <path d={area} fill="url(#rainxAnalyticsFill)"/><path d={path} fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round"/>
    {c.slice(-1).map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill={GOLD} stroke="#fff" strokeWidth="2"/>)}
    <text x={W-P.r+8} y={P.t+4} fill={MUTED} fontSize="13">{fmt(max,true)}</text><text x={W-P.r+8} y={P.t+ih/2+4} fill={MUTED} fontSize="13">{fmt(max/2,true)}</text><text x={W-P.r+8} y={height-P.b+4} fill={MUTED} fontSize="13">0</text>
    {labels.map((i,n)=>{const p=c[i];return <text key={n} x={p.x} y={height-7} textAnchor={n===0?"start":n===2?"end":"middle"} fill={MUTED} fontSize="12">{dayLabel(points[i].date)}</text>;})}
  </svg>;
}

function Metric({label,value,delta,highlight=false}){const up=Number(delta||0)>=0;return <div style={{border:`1px solid ${highlight?"#65A9CF":LINE}`,borderRadius:14,padding:"14px 12px 12px",background:highlight?"#F7FCFF":CARD,minHeight:96,boxSizing:"border-box"}}><div style={{fontSize:14,fontWeight:650}}>{label}</div><div style={{fontSize:27,lineHeight:1.05,fontWeight:800,letterSpacing:-1.0,marginTop:6}}>{typeof value==="string"?value:fmt(value,true)}</div><div style={{marginTop:6,fontSize:12,color:delta===undefined?MUTED:up?BLUE:"#C04444",fontWeight:700}}>{delta===undefined?"All time":`${up?"↑":"↓"} ${Math.abs(delta).toFixed(1)}%`}</div></div>}
function Section({title,children}){return <section style={{background:CARD,borderRadius:16,padding:"16px 16px",marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:13}}><h2 style={{margin:0,fontSize:18,lineHeight:1.15,fontWeight:800,letterSpacing:-.4}}>{title}</h2><Info size={15} color={MUTED}/></div>{children}</section>}
function Pills({items,active,onChange}){return <div style={{display:"flex",gap:8,overflowX:"auto",overflowY:"hidden",scrollbarWidth:"none",touchAction:"pan-x",overscrollBehaviorX:"contain",paddingBottom:2}}>{items.map(x=><button key={x} onClick={()=>onChange(x)} style={{flexShrink:0,border:0,borderRadius:22,padding:"9px 16px",background:active===x?"#000":"#E9EAEC",color:active===x?"#fff":"#73777C",fontFamily:FONT,fontWeight:700,fontSize:14}}>{x}</button>)}</div>}

export default function AnalyticsScreen({account,onBack}){
  const [tab,setTab]=useState("Overview"),[period,setPeriod]=useState("7 days"),[insight,setInsight]=useState("Gender"),[data,setData]=useState(null),[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{
    if(!account?.id)return;setLoading(true);const days=daysFor(period),since=new Date(Date.now()-days*864e5).toISOString(),prevSince=new Date(Date.now()-days*2*864e5).toISOString();
    const {data:posts}=await supabase.from("community_posts").select("id,views,likes_count,comments_count,reposts_count,created_at,text").eq("user_id",account.id);const all=posts||[],current=all.filter(p=>new Date(p.created_at)>=new Date(since)),ids=all.map(p=>p.id),currentIds=current.map(p=>p.id);
    const [ve,prevVe,likes,comments,reposts,pv,fe,followers]=await Promise.all([
      supabase.from("post_view_events").select("post_id,viewer_id,source,created_at").eq("creator_id",account.id).gte("created_at",since),
      supabase.from("post_view_events").select("created_at").eq("creator_id",account.id).gte("created_at",prevSince).lt("created_at",since),
      ids.length?supabase.from("post_likes").select("post_id,created_at").in("post_id",ids).gte("created_at",since):Promise.resolve({data:[]}),
      ids.length?supabase.from("post_comments").select("post_id,created_at").in("post_id",ids).gte("created_at",since):Promise.resolve({data:[]}),
      ids.length?supabase.from("post_reposts").select("post_id,created_at").in("post_id",ids).gte("created_at",since):Promise.resolve({data:[]}),
      supabase.from("profile_view_events").select("viewer_id,created_at").eq("profile_id",account.id).gte("created_at",since),
      supabase.from("follower_events").select("follower_id,event_type,created_at").eq("creator_id",account.id).gte("created_at",since),
      supabase.from("follows").select("follower_id").eq("followed_id",account.id)
    ]);
    const events=ve.data||[],prev=prevVe.data||[],likeRows=likes.data||[],commentRows=comments.data||[],repostRows=reposts.data||[],profileViews=pv.data||[],followEvents=fe.data||[],totalFollowers=(followers.data||[]).length;
    const daily=Array.from({length:days},(_,i)=>{const k=dayKey(new Date(Date.now()-(days-1-i)*864e5));return{date:k,value:events.filter(e=>dayKey(e.created_at)===k).length};});
    const source={};SOURCES.forEach(([k])=>source[k]=0);events.forEach(e=>source[e.source]=(source[e.source]||0)+1);const totalSource=Math.max(events.length,1);
    const net=followEvents.reduce((s,e)=>s+(e.event_type==="follow"?1:-1),0),views=events.length||current.reduce((s,p)=>s+Number(p.views||0),0),likesCount=likeRows.length||current.reduce((s,p)=>s+Number(p.likes_count||0),0),commentsCount=commentRows.length||current.reduce((s,p)=>s+Number(p.comments_count||0),0),shares=repostRows.length||current.reduce((s,p)=>s+Number(p.reposts_count||0),0);
    const viewerIds=[...new Set(events.map(e=>e.viewer_id).filter(Boolean))];const followerIds=[...new Set((followers.data||[]).map(x=>x.follower_id))];
    const [vp,fp]=await Promise.all([viewerIds.length?supabase.from("public_profiles").select("id,location").in("id",viewerIds.slice(0,500)):Promise.resolve({data:[]}),followerIds.length?supabase.from("public_profiles").select("id,location").in("id",followerIds.slice(0,500)):Promise.resolve({data:[]})]);
    const loc=(rows)=>{const m={};(rows||[]).forEach(x=>{if(x.location)m[x.location]=(m[x.location]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6)};
    const hours=(rows)=>Array.from({length:24},(_,h)=>({hour:h,value:(rows||[]).filter(e=>new Date(e.created_at).getHours()===h).length}));
    const viewerDaily=Array.from({length:days},(_,i)=>{const k=dayKey(new Date(Date.now()-(days-1-i)*864e5));return{date:k,value:new Set(events.filter(e=>dayKey(e.created_at)===k).map(e=>e.viewer_id||e.id)).size};});
    const followerDaily=Array.from({length:days},(_,i)=>{const k=dayKey(new Date(Date.now()-(days-1-i)*864e5));const delta=followEvents.filter(e=>dayKey(e.created_at)<=k).reduce((s,e)=>s+(e.event_type==="follow"?1:-1),0);return{date:k,value:Math.max(0,totalFollowers-delta)}});
    const top=[...current].sort((a,b)=>Number(b.views||0)-Number(a.views||0)).slice(0,8);
    setData({views,likes:likesCount,comments:commentsCount,shares,profileViews:profileViews.length,net,totalFollowers,daily,deltaViews:pct(views,prev.length),source:SOURCES.map(([k,label])=>({key:k,label,pct:source[k]/totalSource*100})),top,viewers:{total:viewerIds.length||events.length,new:viewerIds.length||events.length,daily:viewerDaily,locations:loc(vp.data),hours:hours(events)},followers:{total:totalFollowers,net,daily:followerDaily,locations:loc(fp.data),hours:hours(followEvents)}});setLoading(false);
  },[account?.id,period]);
  useEffect(()=>{load()},[load]);
  const d=data||{views:0,likes:0,comments:0,shares:0,profileViews:0,net:0,totalFollowers:0,daily:[],source:[],top:[],viewers:null,followers:null};const insightData=tab==="Viewers"?d.viewers:d.followers;
  return <div style={{position:"fixed",inset:0,zIndex:100,background:BG,color:INK,fontFamily:FONT,overflow:"hidden"}}><div style={{height:"100%",overflowY:"auto",overflowX:"hidden",overscrollBehaviorY:"none",overscrollBehaviorX:"none",WebkitOverflowScrolling:"touch",touchAction:"pan-y",scrollbarWidth:"none",paddingBottom:30}}>
    <header style={{height:64,display:"flex",alignItems:"center",justifyContent:"center",position:"sticky",top:0,zIndex:20,background:"rgba(245,245,245,.97)",backdropFilter:"blur(8px)"}}><button onClick={onBack} style={{position:"absolute",left:14,border:0,background:"transparent",padding:5,color:INK}}><ArrowLeft size={27}/></button><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:-.7}}>Analytics</h1></header>
    <div style={{display:"flex",overflowX:"auto",borderBottom:`1px solid ${LINE}`,scrollbarWidth:"none"}}>{TABS.map(x=><button key={x} onClick={()=>setTab(x)} style={{flex:"0 0 auto",minWidth:tab==="Viewers"?86:104,height:48,border:0,borderBottom:tab===x?"3px solid #111":"3px solid transparent",background:"transparent",color:tab===x?INK:"#858A91",fontFamily:FONT,fontWeight:tab===x?800:650,fontSize:15}}>{x}</button>)}</div>
    <div style={{padding:"18px 16px 0"}}><Pills items={["7 days","28 days","60 days","365 days"]} active={period} onChange={setPeriod}/>
      {tab==="Overview"&&<><Section title="Key metrics"><div style={{color:MUTED,fontSize:14,marginTop:-7,marginBottom:13}}>{new Date(Date.now()-(daysFor(period)-1)*864e5).toLocaleDateString("en",{month:"short",day:"numeric"})} - {new Date().toLocaleDateString("en",{month:"short",day:"numeric"})}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Metric label="Post views" value={d.views} delta={d.deltaViews} highlight/><Metric label="Profile views" value={d.profileViews}/><Metric label="Likes" value={d.likes}/><Metric label="Comments" value={d.comments}/><Metric label="Shares" value={d.shares}/><Metric label="Est. rewards" value="$0.00"/></div><div style={{marginTop:16}}><SmoothChart points={d.daily}/></div></Section>
        <Section title="Traffic sources">{(d.source.length?d.source:SOURCES.map(([key,label])=>({key,label,pct:0}))).map(r=><div key={r.key} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:7}}><span>{r.label}</span><strong>{r.pct.toFixed(1)}%</strong></div><div style={{height:16,borderRadius:4,background:BAR,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,r.pct)}%`,background:r.key==="for_you"?GOLD:BLUE,borderRadius:4}}/></div></div>)}</Section>
        <Section title="Search queries">{d.source.find(x=>x.key==="search")?.pct? <div style={{color:MUTED,fontSize:13}}>Search traffic is being tracked. Detailed query text will appear when query-level search events are recorded.</div>:<div style={{color:MUTED,fontSize:13}}>Search query tracking will appear here as people discover your posts through search.</div>}</Section></>}
      {tab==="Content"&&<Section title="Top content">{!d.top.length?<div style={{color:MUTED,fontSize:13}}>Post something to see your content performance.</div>:d.top.map((p,i)=><div key={p.id} style={{display:"flex",gap:10,alignItems:"center",padding:"11px 0",borderBottom:i<d.top.length-1?`1px solid ${LINE}`:"none"}}><div style={{width:32,height:32,borderRadius:8,background:"#F0F1F2",display:"grid",placeItems:"center",fontWeight:800}}>{i+1}</div><div style={{minWidth:0,flex:1}}><div style={{fontSize:13,fontWeight:650,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.text||"Media post"}</div><div style={{fontSize:11,color:MUTED,marginTop:2}}>{fmt(p.views)} views · {fmt(p.likes_count)} likes · {fmt(p.comments_count)} comments</div></div></div>)}</Section>}
      {(tab==="Viewers"||tab==="Followers")&&<><Section title="Key metrics"><div style={{color:MUTED,fontSize:14,marginTop:-7,marginBottom:13}}>{new Date(Date.now()-(daysFor(period)-1)*864e5).toLocaleDateString("en",{month:"short",day:"numeric"})} - {new Date().toLocaleDateString("en",{month:"short",day:"numeric"})}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{tab==="Viewers"?<><Metric label="Total viewers" value={insightData?.total||0} highlight/><Metric label="New viewers" value={insightData?.new||0}/></>:<><Metric label="Total followers" value={insightData?.total||0} highlight/><Metric label="Net followers" value={insightData?.net||0}/></>}</div><div style={{marginTop:16}}><SmoothChart points={insightData?.daily||[]}/></div></Section>
        <Section title={tab==="Viewers"?"Viewer insights":"Follower insights"}><Pills items={["Gender","Age","Locations"]} active={insight} onChange={setInsight}/>{insight==="Locations"?<div style={{marginTop:16}}>{insightData?.locations?.length?insightData.locations.map(([name,count])=><div key={name} style={{marginBottom:13}}><div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:6}}><span>{name}</span><strong>{((count/(insightData.locations[0]?.[1]||1))*100).toFixed(1)}%</strong></div><div style={{height:14,background:BAR,borderRadius:4}}><div style={{height:"100%",width:`${(count/(insightData.locations[0]?.[1]||1))*100}%`,background:GOLD,borderRadius:4}}/></div></div>):<div style={{color:MUTED,fontSize:13}}>Location insights will appear as viewers share a public location.</div>}</div>:<div style={{marginTop:16,padding:"16px 4px",color:MUTED,fontSize:13,lineHeight:1.5}}>Gender and age are not currently stored for RainX viewers. The analytics structure is ready for those fields without inventing demographic data.</div>}</Section>
        <Section title="Most active times"><div style={{fontSize:14,lineHeight:1.4,marginBottom:13}}>{tab==="Viewers"?"Your viewers were most active during the busiest tracked hour.":"Your followers were most active during the busiest tracked hour."}</div><div style={{display:"flex",alignItems:"flex-end",gap:3,height:150}}>{(insightData?.hours||[]).map(x=>{const max=Math.max(...(insightData?.hours||[]).map(a=>a.value),1);return <div key={x.hour} title={`${x.hour}:00 · ${fmt(x.value)}`} style={{flex:1,height:`${Math.max(3,x.value/max*130)}px`,background:GOLD,borderRadius:"3px 3px 0 0"}}/>})}</div><div style={{display:"flex",justifyContent:"space-between",color:MUTED,fontSize:10,marginTop:4}}><span>12a</span><span>4a</span><span>8a</span><span>12p</span><span>4p</span><span>8p</span></div></Section></>}
    </div>{loading&&<div style={{position:"absolute",top:64,right:12,fontSize:10,color:MUTED}}>Updating…</div>}
  </div></div>;
}
