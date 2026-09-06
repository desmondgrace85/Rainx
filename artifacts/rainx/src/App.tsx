import React, { useEffect, useRef, useState } from "react";
import RainXApp from "./RainxApp";
import MoreLandingOverride from "./MoreLandingOverride";
import NativeLockOverride from "./NativeLockOverride";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { consumeNativeBack } from "./nativeBackStack";
import { supabase } from "./supabaseClient";
import { clearNativeSessionUnlock, getNativeLockConfig, hasNativeUnlockedSession } from "./nativeSecurity";

const LOCK_EVENT = "rainx:native-lock-state";
const LOCK_CONFIG_EVENT = "rainx:native-lock-config-changed";
const ROUTE_EVENT = "rainx:route-change";
const NATIVE_BACK_EVENT = "rainx:native-back";

function readHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [tab, sub] = raw.split("/");
  return { tab: tab || null, sub: sub ? decodeURIComponent(sub) : null };
}

function isVisibleBackControl(element) {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && style.pointerEvents !== "none" && rect.width > 0 && rect.height > 0;
}

function clickVisibleBackControl() {
  const selectors = [
    "[data-native-back]",
    "button[aria-label*='back' i]",
    "[role='button'][aria-label*='back' i]",
    "button[title*='back' i]",
    ".rx-native-back",
    ".rx-back",
    "button[aria-label*='close' i]",
    "[role='button'][aria-label*='close' i]"
  ];
  for (const selector of selectors) {
    const controls = document.querySelectorAll(selector);
    for (const control of controls) {
      if (!isVisibleBackControl(control)) continue;
      control.click();
      return true;
    }
  }
  return false;
}

function dispatchNativeBack() {
  if (consumeNativeBack()) return true;
  if (clickVisibleBackControl()) return true;
  const detail = { handled: false };
  try { window.dispatchEvent(new CustomEvent(NATIVE_BACK_EVENT, { detail })); } catch {}
  if (detail.handled) return true;
  const current = readHash();
  if (!current.tab || current.tab === "home") return false;
  if (window.history.state?.rainxRoute) { window.history.back(); return true; }
  window.history.replaceState(window.history.state || null, "", "#home");
  try { window.dispatchEvent(new Event(ROUTE_EVENT)); } catch {}
  return true;
}

function installNativeEdgeBackGesture() {
  let gesture = null;
  const onStart = (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (touch.clientX > 32) return;
    const target = event.target;
    if (target?.closest?.("input, textarea, select, [contenteditable=\"true\"]")) return;
    gesture = { startX: touch.clientX, startY: touch.clientY, dx: 0, dy: 0 };
  };
  const onMove = (event) => {
    if (!gesture || event.touches.length !== 1) return;
    const touch = event.touches[0];
    gesture.dx = touch.clientX - gesture.startX;
    gesture.dy = touch.clientY - gesture.startY;
    if (gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) event.preventDefault();
  };
  const onEnd = () => {
    if (!gesture) return;
    const { dx, dy } = gesture;
    gesture = null;
    if (dx > 72 && dx > Math.abs(dy) * 1.2) dispatchNativeBack();
  };
  window.addEventListener("touchstart", onStart, { passive: true, capture: true });
  window.addEventListener("touchmove", onMove, { passive: false, capture: true });
  window.addEventListener("touchend", onEnd, { passive: true, capture: true });
  window.addEventListener("touchcancel", onEnd, { passive: true, capture: true });
  return () => {
    window.removeEventListener("touchstart", onStart, true);
    window.removeEventListener("touchmove", onMove, true);
    window.removeEventListener("touchend", onEnd, true);
    window.removeEventListener("touchcancel", onEnd, true);
  };
}

function installRouteBridge() {
  const h = window.history as any;
  if (h.__rainxRouteBridgeInstalled) return () => {};
  const push = h.pushState.bind(h), replace = h.replaceState.bind(h);
  const notify = () => { try { window.dispatchEvent(new Event(ROUTE_EVENT)); } catch {} };
  h.pushState = function(...args) { const r = push(...args); notify(); return r; };
  h.replaceState = function(...args) { const r = replace(...args); notify(); return r; };
  h.__rainxRouteBridgeInstalled = true;
  return () => {
    if (h.pushState !== push) h.pushState = push;
    if (h.replaceState !== replace) h.replaceState = replace;
    delete h.__rainxRouteBridgeInstalled;
  };
}

/*
 * Keep one native scroll surface for the app, but do not use CSS containment.
 * Containment changes the containing block for position: fixed descendants,
 * which makes the bottom navigation and profile controls move while scrolling.
 */
const APP_SURFACE = {
  position: "relative",
  width: "100%",
  height: "100dvh",
  minHeight: "100dvh",
  overflowX: "hidden",
  background: "#0F0E0B",
  isolation: "isolate",
  overflowY: "hidden",
  overscrollBehavior: "none",
  touchAction: "pan-y",
} as const;

export default function App() {
  const [route,setRoute]=useState(()=>readHash()),[account,setAccount]=useState(null),[authReady,setAuthReady]=useState(false),[lockReady,setLockReady]=useState(!Capacitor.isNativePlatform()),[locked,setLocked]=useState(false);
  const previousAccountId=useRef(null),forceLockOnNextAccountLoad=useRef(false);

  useEffect(()=>{
    const update=()=>setRoute(readHash());
    const remove=installRouteBridge();
    window.addEventListener("hashchange",update);
    window.addEventListener("popstate",update);
    window.addEventListener(ROUTE_EVENT,update);
    update();
    return()=>{remove();window.removeEventListener("hashchange",update);window.removeEventListener("popstate",update);window.removeEventListener(ROUTE_EVENT,update)}
  },[]);

  useEffect(() => {
    const cleanupGesture = installNativeEdgeBackGesture();
    let listener;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener("backButton", () => { dispatchNativeBack(); })
        .then(handle => { listener = handle; })
        .catch(() => {});
    }
    return () => { cleanupGesture(); listener?.remove?.(); };
  }, []);

  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{
      if(!mounted)return;
      const u=data.session?.user;
      previousAccountId.current=u?.id||null;
      setAccount(u?{id:u.id,email:u.email}:null);
      setAuthReady(true)
    }).catch(()=>mounted&&setAuthReady(true));

    const startupTimer=setTimeout(()=>mounted&&setAuthReady(true),8000);
    const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!mounted)return;
      const u=session?.user,id=u?.id||null,changed=id&&id!==previousAccountId.current;
      if(!u){
        clearNativeSessionUnlock();
        forceLockOnNextAccountLoad.current=false;
        previousAccountId.current=null;
        setLocked(false);
        setLockReady(true)
      }else if(event==="SIGNED_IN"&&changed){
        clearNativeSessionUnlock();
        forceLockOnNextAccountLoad.current=true
      }
      previousAccountId.current=id;
      setAccount(u?{id:u.id,email:u.email}:null);
      setAuthReady(true)
    });
    return()=>{mounted=false;clearTimeout(startupTimer);listener?.subscription?.unsubscribe()}
  },[]);

  useEffect(()=>{
    if(!Capacitor.isNativePlatform()){setLockReady(true);setLocked(false);return}
    if(!authReady){setLockReady(false);return}
    if(!account?.id){setLocked(false);setLockReady(true);return}
    let mounted=true;
    setLockReady(false);
    const lockTimer=setTimeout(()=>{if(mounted){setLocked(false);setLockReady(true)}},8000);
    getNativeLockConfig(account.id).then(config=>{
      if(!mounted)return;
      const fresh=forceLockOnNextAccountLoad.current;
      forceLockOnNextAccountLoad.current=false;
      const already=hasNativeUnlockedSession(account.id);
      setLocked(!!config.appLock&&(fresh||!already));
      setLockReady(true);clearTimeout(lockTimer)
    }).catch(()=>{
      if(mounted){clearTimeout(lockTimer);setLocked(true);setLockReady(true)}
    });
    return()=>{mounted=false;clearTimeout(lockTimer)}
  },[account?.id,authReady]);

  useEffect(()=>{
    const onLock=e=>{
      if(!Capacitor.isNativePlatform())return;
      setLocked(!!e?.detail?.locked);
      setLockReady(true)
    };
    const onConfig=async()=>{
      if(!Capacitor.isNativePlatform()||!account?.id)return;
      try{
        const c=await getNativeLockConfig(account.id);
        setLockReady(true);
        if(!c.appLock){
          setLocked(false);
          clearNativeSessionUnlock()
        }
      }catch{}
    };
    window.addEventListener(LOCK_EVENT,onLock);
    window.addEventListener(LOCK_CONFIG_EVENT,onConfig);
    return()=>{
      window.removeEventListener(LOCK_EVENT,onLock);
      window.removeEventListener(LOCK_CONFIG_EVENT,onConfig)
    }
  },[account?.id]);

  useEffect(()=>{
    if(!Capacitor.isNativePlatform()||!authReady||!account?.id)return;
    let mounted=true,wasBackgrounded=false,listener;
    CapacitorApp.addListener("appStateChange",async({isActive})=>{
      if(!mounted)return;
      if(!isActive){wasBackgrounded=true;return}
      if(!wasBackgrounded)return;
      wasBackgrounded=false;
      try{
        const c=await getNativeLockConfig(account.id);
        if(!mounted||!c.appLock)return;
        clearNativeSessionUnlock();
        setLocked(true);
        setLockReady(true);
        window.dispatchEvent(new CustomEvent(LOCK_EVENT,{detail:{locked:true}}))
      }catch{}
    }).then(h=>listener=h).catch(()=>{});
    return()=>{mounted=false;listener?.remove?.()}
  },[account?.id,authReady]);

  const isMoreLanding=route.tab==="more"&&!route.sub;

  if(Capacitor.isNativePlatform()&&!authReady)return <div style={APP_SURFACE}/>;
  if(Capacitor.isNativePlatform()&&account?.id&&!lockReady)return <div style={APP_SURFACE}/>;
  if(Capacitor.isNativePlatform()&&account?.id&&locked)return <div style={APP_SURFACE}><NativeLockOverride account={account} initialLocked/></div>;
  if(account?.id&&isMoreLanding)return <div style={APP_SURFACE}><MoreLandingOverride account={account}/></div>;
  return <div style={APP_SURFACE}><RainXApp/><>{account?.id&&<NativeLockOverride account={account} initialLocked={false}/>}</></div>;
}
