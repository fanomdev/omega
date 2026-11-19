"use client";
import Link from "next/link";
import { proxyUrl } from "@/lib/proxy";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { getBookmarks, removeBookmark, getStats, getRecentSearches, clearAllData } from "@/lib/local";

const PROFILE_KEY = "akari.profile";

export default function ProfilePage() {
  const [name, setName] = useState("Reader");
  const [bookmarks, setBookmarks] = useState([]);
  const [stats, setStats] = useState({ read: 0 });
  const [recent, setRecent] = useState([]);
  const [confirming, setConfirming] = useState(false);

  const refresh = () => {
    setBookmarks(getBookmarks());
    setStats(getStats());
    setRecent(getRecentSearches());
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) setName(JSON.parse(saved).name || "Reader");
    } catch { /* fresh profile */ }
    refresh();
    window.addEventListener("akari:bookmarks", refresh);
    return () => window.removeEventListener("akari:bookmarks", refresh);
  }, []);

  const saveName = (value) => {
    const clean = value.slice(0, 32);
    setName(clean);
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: clean }));
  };

  const initial = (name.trim() || "R")[0].toUpperCase();

  return (
    <main className="page">
      <TopBar />
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: "6px 2px 14px" }}>Profile</h1>

      <section className="profile-head">
        <div className="avatar" aria-hidden="true">{initial}</div>
        <div style={{ minWidth: 0 }}>
          <input
            className="profile-name-input"
            value={name}
            onChange={(e) => saveName(e.target.value)}
            aria-label="Display name"
            maxLength={32}
          />
          <p className="profile-sub">Your library lives on this device — no account needed.</p>
          <div className="profile-stats">
            <div><b>{bookmarks.length}</b><span>Saved</span></div>
            <div><b>{stats.read || 0}</b><span>Chapters read</span></div>
            <div><b>{recent.length}</b><span>Recent searches</span></div>
          </div>
        </div>
      </section>

      <section className="section" aria-label="Saved manga">
        <div className="section-head">
          <h2><span className="bar" />Saved to your library</h2>
        </div>
        {bookmarks.length === 0 ? (
          <div className="empty">
            <b>Nothing saved yet</b>
            Tap “Save to library” on any manga page and it’ll wait for you here.
            <div style={{ marginTop: 16 }}><Link href="/" className="hero-cta">Find something to read</Link></div>
          </div>
        ) : (
          <div className="grid">
            {bookmarks.map((b) => (
              <div key={b.id} style={{ position: "relative" }}>
                <Link href={`/manga/${b.id}`} className="card" style={{ width: "100%" }}>
                  <div className="card-cover">
                    {b.cover && <img src={proxyUrl(b.coverSmall || b.cover)} alt={b.title} loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <p className="card-title">{b.title}</p>
                  {b.chapter && <p className="card-meta">{b.chapter}</p>}
                </Link>
                <button
                  onClick={() => removeBookmark(b.id)}
                  aria-label={`Remove ${b.title} from library`}
                  style={{
                    position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%",
                    border: 0, background: "rgba(10,10,12,0.72)", color: "#fff", cursor: "pointer",
                    display: "grid", placeItems: "center", backdropFilter: "blur(6px)",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-label="Danger zone">
        <div className="section-head"><h2><span className="bar" style={{ background: "var(--red)" }} />Data</h2></div>
        {confirming ? (
          <div className="error-box" style={{ margin: 0, textAlign: "left" }}>
            <b>Clear everything?</b>
            This removes your saved library, reading stats, recent searches and display name from this device.
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="danger-btn" style={{ marginTop: 0 }} onClick={() => { clearAllData(); setName("Reader"); setConfirming(false); refresh(); }}>Yes, erase</button>
              <button className="chip" style={{ marginTop: 0 }} onClick={() => setConfirming(false)}>Keep my data</button>
            </div>
          </div>
        ) : (
          <button className="danger-btn" onClick={() => setConfirming(true)}>Clear saved data…</button>
        )}
      </section>
    </main>
  );
}
