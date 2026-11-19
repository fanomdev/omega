"use client";
import { useEffect, useState } from "react";
import { isBookmarked, toggleBookmark } from "@/lib/local";

export default function BookmarkButton({ manga }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isBookmarked(manga.id));
    const sync = () => setOn(isBookmarked(manga.id));
    window.addEventListener("akari:bookmarks", sync);
    return () => window.removeEventListener("akari:bookmarks", sync);
  }, [manga.id]);

  return (
    <button
      className={`bookmark-btn${on ? " on" : ""}`}
      onClick={() => setOn(toggleBookmark(manga))}
      aria-pressed={on}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M6 3h12v18l-6-4.5L6 21V3z" />
      </svg>
      {on ? "Saved to library" : "Save to library"}
    </button>
  );
}
