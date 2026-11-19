import Link from "next/link";
import TopBar from "@/components/TopBar";
import ReaderShell from "@/components/ReaderShell";
import { getChapterPages, getManga } from "@/lib/manga";

export const revalidate = 0;
export const metadata = { title: "Reading — Akari" };

export default async function ReadPage({ params }) {
  const { chapterId } = await params;

  let data = null, failed = false;
  try {
    data = await getChapterPages(chapterId);
  } catch {
    failed = true;
  }

  if (failed || !data) {
    return (
      <main className="page">
        <TopBar />
        <div className="error-box">
          <b>Couldn’t load this chapter</b>
          The page server didn’t respond. <Link href="/" style={{ color: "var(--accent)" }}>Back to suggestions</Link>
        </div>
      </main>
    );
  }

  if (data.external) {
    return (
      <main className="page">
        <TopBar />
        <div className="error-box">
          <b>No readable twin found for this chapter</b>
          Neither MangaDex nor Mangapill carries this one in English, so it opens on AllManga. Or set <code>MANGA_PROVIDER=mangadex</code> for a different catalog.
          <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {data.externalUrl && <a className="hero-cta" href={data.externalUrl} target="_blank" rel="noopener noreferrer">Read on AllManga ↗</a>}
            <Link href={data.mangaId ? `/manga/${data.mangaId}` : "/"} className="hero-cta" style={{ background: "var(--card)", color: "var(--text)" }}>Back to the manga</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!data.pages.length) {
    return (
      <main className="page">
        <TopBar />
        <div className="error-box"><b>No pages found</b>This chapter appears to be empty.</div>
      </main>
    );
  }

  // Next chapter = the next readable chapter in ascending numeric order.
  let next = null;
  if (data.mangaId) {
    try {
      const { chapters } = await getManga(data.mangaId);
      next = nextChapter(chapterId, data.title, chapters);
    } catch { /* button just doesn't render */ }
  }

  return <ReaderShell pages={data.pages} title={data.title} mangaId={data.mangaId} chapterId={chapterId} next={next} />;
}

function chapterNum(s) {
  const m = String(s ?? "").match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

function nextChapter(chapterId, title, chapters) {
  const nOf = (s) => chapterNum(s);
  const readable = chapters
    .map((c) => ({ ...c, n: nOf(c.label) }))
    .filter((c) => !c.external && Number.isFinite(c.n))
    .sort((a, b) => a.n - b.n);
  const i = readable.findIndex((c) => c.id === chapterId);
  if (i !== -1) return readable[i + 1] ?? null;
  const cur = nOf(title);
  return Number.isFinite(cur) ? readable.find((c) => c.n > cur) ?? null : null;
}
