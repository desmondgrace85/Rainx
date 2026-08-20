import React, { useEffect, useState } from "react";
import RainXApp from "./RainxApp";
import MoreLandingOverride from "./MoreLandingOverride";
import NativeLockOverride from "./NativeLockOverride";
import { supabase } from "./supabaseClient";

function readHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [tab, sub] = raw.split("/");
  return { tab: tab || null, sub: sub ? decodeURIComponent(sub) : null };
}

export default function App() {
  const [route, setRoute] = useState(() => readHash());
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setAccount(
          data.session?.user
            ? { id: data.session.user.id, email: data.session.user.email }
            : null
        );
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setAccount(
            session?.user
              ? { id: session.user.id, email: session.user.email }
              : null
          );
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const showMoreLanding = !!account?.id && route.tab === "more" && !route.sub;

  return (
    <>
      <RainXApp />
      {account?.id && <NativeLockOverride account={account} />}
      {showMoreLanding && <MoreLandingOverride account={account} />}
    </>
  );
}
