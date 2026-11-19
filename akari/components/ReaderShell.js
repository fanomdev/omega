"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { incrementChaptersRead } from "@/lib/local";

export default function ReaderShell({ pages, title, mangaId, chapterId, next }) {
  const [barVisible, setBarVisible] = useState(false);
  const counted = useRef(false);
  const hideTimer = useRef(null);
  const barRef = useRef(null);
  const pctRef = useRef(null);
  const rafRef = useRef(0);

  // Count this chapter as read, once per mount.
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    incrementChaptersRead();
  }, [chapterId]);

  useEffect(() => {
    // rAF-throttled and written straight to the DOM — no re-render per scroll frame.
    const update = () => {
      rafRef.current = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      if (barRef.current) barRef.current.style.width = `${pct}%`;
      if (pctRef.current) pctRef.current.textContent = `${Math.round(pct)}%`;
      setBarVisible(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setBarVisible(false), 1800);
    };
    const onScroll = () => { if (!rafRef.current) rafRef.current = requestAnimationFrame(update); };
    onScroll();
    // Images change the document height as they load — keep the bar honest.
    window.addEventListener("load", onScroll);
    document.addEventListener("load", onScroll, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", onScroll);
      document.removeEventListener("load", onScroll, true);
      clearTimeout(hideTimer.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Keyboard: ← back to manga, → jump to bottom (end of chapter)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft" && mangaId) window.location.href = `/manga/${mangaId}`;
      if (e.key === "ArrowRight") window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mangaId]);

  return (
    <main style={{ minHeight: "100vh", background: "#050507" }}>
      <div className="reader-progress" ref={barRef} aria-hidden="true" />

      <div className={`reader-top${barVisible ? " show" : ""}`} role="toolbar" aria-label="Reader controls">
        <Link href={mangaId ? `/manga/${mangaId}` : "/"} aria-label="Back to manga"
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        </Link>
        <span ref={pctRef} style={{ fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>0%</span>
      </div>

      <div style={{ paddingBottom: 90 }} onClick={() => setBarVisible((v) => !v)}>
        {pages.map((src, i) => (
          <div className="reader-page-img" key={i}>
            <img
              src={src}
              alt={`Page ${i + 1}`}
              loading={i < 2 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
              onError={(e) => { e.currentTarget.style.opacity = 0.25; e.currentTarget.alt = `Page ${i + 1} failed to load`; }}
            />
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", padding: "0 16px 140px" }}>
        <p style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>End of chapter</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
          {next && (
            <Link href={`/read/${next.id}`} className="hero-cta">
              Next: {next.label.split(" — ")[0]}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </Link>
          )}
          {mangaId && (
            <Link href={`/manga/${mangaId}`} className="hero-cta" style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)", boxShadow: "none" }}>Back to chapters</Link>
          )}
        </div>
      </div>
    </main>
  );
}
