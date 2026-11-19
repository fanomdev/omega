"use client";
// Slim top bar that shows while a client-side navigation is in flight —
// pages with ISR/RSC fetches can take a moment, especially on slow networks.
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function LoadingBarInner() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState("idle"); // idle | loading | done
  const safetyTimer = useRef(null);
  const doneTimer = useRef(null);

  const key = `${pathname}?${search}`;
  const navKey = useRef(key);

  // Navigation finished — complete the bar, then fade it out.
  useEffect(() => {
    if (navKey.current === key) return;
    navKey.current = key;
    clearTimeout(safetyTimer.current);
    clearTimeout(doneTimer.current);
    setState((s) => (s === "loading" ? "done" : s));
    doneTimer.current = setTimeout(() => setState("idle"), 280);
  }, [key]);

  useEffect(() => {
    const start = () => {
      setState("loading");
      clearTimeout(safetyTimer.current);
      safetyTimer.current = setTimeout(() => setState("idle"), 15000); // never leave it up forever
    };

    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      let url;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      const target = `${url.pathname}?${url.search}${url.hash}`;
      const current = `${location.pathname}?${location.search}${location.hash}`;
      if (target === current) return; // same page / in-page anchor — nothing loads
      start();
    };
    const onPopState = () => start();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      clearTimeout(safetyTimer.current);
      clearTimeout(doneTimer.current);
    };
  }, []);

  if (state === "idle") return null;
  return <div className={`nav-progress ${state}`} role="progressbar" aria-label="Loading page" />;
}

export default function LoadingBar() {
  // useSearchParams must sit inside Suspense
  return (
    <Suspense fallback={null}>
      <LoadingBarInner />
    </Suspense>
  );
}
