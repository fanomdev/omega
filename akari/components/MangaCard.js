"use client";
import Link from "next/link";
import { useState } from "react";
import { proxyUrl } from "@/lib/proxy";

// NOTE: everything external flows through Akari's /api/img proxy — CDNs 403
// direct browser traffic from restricted networks, the proxied host doesn't.
export default function MangaCard({ manga, isNew = false }) {
  const [failed, setFailed] = useState(false);
  const src = manga.coverSmall || manga.cover;
  const showCover = src && !failed;

  return (
    <Link href={`/manga/${manga.id}`} className="card" aria-label={manga.title}>
      <div className="card-cover">
        {isNew && <span className="badge-new">New</span>}
        {showCover ? (
          <img
            src={proxyUrl(src)}
            alt={manga.title}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="cover-fallback">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"/><path d="M14 3v6h6"/></svg>
            <span>{failed ? "Cover unavailable" : "No cover"}</span>
          </div>
        )}
        {manga.rating != null && !failed && (
          <span className="card-rating">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {manga.rating.toFixed(2)}
          </span>
        )}
      </div>
      <p className="card-title">{manga.title}</p>
      {manga.chapter && <p className="card-meta">{manga.chapter}</p>}
    </Link>
  );
}
