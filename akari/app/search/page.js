"use client";
import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import MangaCard from "@/components/MangaCard";
import { getRecentSearches, addRecentSearch, clearRecentSearches } from "@/lib/local";

const POPULAR_TERMS = ["Solo Leveling", "One Piece", "Chainsaw Man", "Berserk", "Jujutsu Kaisen", "Frieren"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = idle, [] = no hits
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    setRecent(getRecentSearches());
    boxRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); setLoading(false); setError(false); return; }
    setLoading(true);
    setError(false);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        setResults(data.list);
      } catch (e) {
        if (e.name !== "AbortError") { setError(true); setResults([]); }
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  const record = (q) => {
    const t = q.trim();
    if (t.length < 2) return;
    addRecentSearch(t);
    setRecent(getRecentSearches());
  };

  const pick = (term) => { setQuery(term); record(term); };

  const onKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); record(query); }
  };

  return (
    <main className="page">
      <TopBar />
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: "6px 2px 14px" }}>Search</h1>

      <label className="search-box" htmlFor="q">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
        <input id="q" ref={boxRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Search manga, authors, genres…" autoComplete="off" spellCheck={false} enterKeyHint="search" />
        {query && (
          <button className="icon-btn" style={{ width: 34, height: 34, borderRadius: 999 }} onClick={() => setQuery("")} aria-label="Clear search">
            <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        )}
      </label>

      {loading && <div className="spinner" role="status" aria-label="Searching" />}

      {error && <div className="error-box" style={{ marginTop: 8 }}><b>Search failed</b>The manga source didn’t respond — try again.</div>}

      {!loading && results === null && (
        <>
          {recent.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="section-head" style={{ marginBottom: 4 }}>
                <h2 style={{ fontSize: 14 }}><span className="bar" />Recent</h2>
                <button className="section-link" style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)" }} onClick={() => { clearRecentSearches(); setRecent([]); }}>Clear</button>
              </div>
              <div className="chips">{recent.map((r) => <button className="chip" key={r} onClick={() => pick(r)}>{r}</button>)}</div>
            </div>
          )}
          <div style={{ marginTop: 22 }}>
            <div className="section-head" style={{ marginBottom: 4 }}><h2 style={{ fontSize: 14 }}><span className="bar" />Popular searches</h2></div>
            <div className="chips">{POPULAR_TERMS.map((t) => <button className="chip" key={t} onClick={() => pick(t)}>{t}</button>)}</div>
          </div>
        </>
      )}

      {!loading && results && results.length > 0 && (
        <>
          <p className="hint" style={{ textAlign: "left", margin: "0 2px 12px" }}>{results.length} result{results.length === 1 ? "" : "s"} for “{query.trim()}”</p>
          <div className="grid" onClickCapture={() => record(query)}>{results.map((m) => <MangaCard key={m.id} manga={m} />)}</div>
        </>
      )}

      {!loading && results && results.length === 0 && !error && (
        <div className="empty"><b>Nothing found for “{query.trim()}”</b>Try a different spelling, or browse Popular instead.</div>
      )}
    </main>
  );
}
