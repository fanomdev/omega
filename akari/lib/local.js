"use client";
// Tiny localStorage store. Bookmarks keep a minimal snapshot of the manga so the
// profile page renders without refetching.

const KEY = "akari.bookmarks";
const STATS_KEY = "akari.stats";
const RECENT_KEY = "akari.recentSearches";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function getBookmarks() {
  return read(KEY, []);
}

export function isBookmarked(id) {
  return getBookmarks().some((b) => b.id === id);
}

export function toggleBookmark(manga) {
  const list = getBookmarks();
  const exists = list.find((b) => b.id === manga.id);
  const next = exists
    ? list.filter((b) => b.id !== manga.id)
    : [{ id: manga.id, title: manga.title, cover: manga.cover, coverSmall: manga.coverSmall || manga.cover, chapter: manga.chapter }, ...list];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("akari:bookmarks"));
  return !exists;
}

export function removeBookmark(id) {
  localStorage.setItem(KEY, JSON.stringify(getBookmarks().filter((b) => b.id !== id)));
  window.dispatchEvent(new Event("akari:bookmarks"));
}

export function getStats() {
  return read(STATS_KEY, { read: 0 });
}

export function incrementChaptersRead() {
  const s = getStats();
  localStorage.setItem(STATS_KEY, JSON.stringify({ ...s, read: (s.read || 0) + 1 }));
}

export function getRecentSearches() {
  return read(RECENT_KEY, []);
}

export function addRecentSearch(q) {
  const list = [q, ...getRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

export function clearAllData() {
  [KEY, STATS_KEY, RECENT_KEY, "akari.profile"].forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new Event("akari:bookmarks"));
}
