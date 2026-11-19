import Link from "next/link";
import TopBar from "@/components/TopBar";
import { proxyUrl } from "@/lib/proxy";
import BookmarkButton from "@/components/BookmarkButton";
import { getManga } from "@/lib/manga";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const { manga } = await getManga(id);
    return { title: `${manga.title} — Akari`, description: manga.description?.slice(0, 160) };
  } catch {
    return { title: "Manga — Akari" };
  }
}

export default async function MangaDetail({ params }) {
  const { id } = await params;

  let manga = null, chapters = [], failed = false;
  try {
    ({ manga, chapters } = await getManga(id));
  } catch (e) {
    failed = true;
    console.error("[akari] getManga failed:", e);
  }

  if (failed || !manga) {
    return (
      <main className="page">
        <TopBar />
        <div className="error-box">
          <b>Couldn’t load this manga</b>
          The manga source didn’t respond. <Link href="/" style={{ color: "var(--accent)" }}>Back to suggestions</Link>
        </div>
      </main>
    );
  }

  const statusLabel = { ongoing: "Ongoing", completed: "Completed", hiatus: "Hiatus", cancelled: "Cancelled" }[manga.status] || manga.status;
  const readableCount = chapters.filter((c) => !c.external).length;

  return (
    <main className="page">
      <TopBar />

      <article className="detail">
        {manga.cover && (
          <div className="detail-cover">
            <img src={proxyUrl(manga.cover)} alt={`Cover of ${manga.title}`} width={440} height={660} decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div>
          <h1>{manga.title}</h1>
          <div className="stat-strip">
            {manga.rating != null && <div className="stat"><b>★ {manga.rating.toFixed(2)}</b><span>Rating</span></div>}
            {manga.follows != null && <div className="stat"><b>{Intl.NumberFormat("en", { notation: "compact" }).format(manga.follows)}</b><span>Follows</span></div>}
            {manga.year && <div className="stat"><b>{manga.year}</b><span>Year</span></div>}
            <div className="stat"><b style={{ textTransform: "capitalize" }}>{statusLabel}</b><span>Status</span></div>
          </div>

          {manga.tags?.length > 0 && (
            <div className="chips" style={{ marginBottom: 14 }}>
              {manga.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
            </div>
          )}

          {manga.description && <p className="desc">{manga.description}</p>}
          <BookmarkButton manga={{ id: manga.id, title: manga.title, cover: manga.cover, coverSmall: manga.coverSmall, chapter: manga.chapter }} />
        </div>
      </article>

      <section className="section" aria-label="Chapters">
        <div className="section-head">
          <h2><span className="bar" />Chapters <span style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-ui)" }}>{readableCount}</span></h2>
        </div>
        {(() => {
          const readable = chapters.filter((c) => !c.external);
          const external = chapters.filter((c) => c.external);
          return (
            <>
              {readable.length > 0 && (
                <div className="chapter-list">
                  {readable.map((c) => (
                    <Link key={c.id} className="chapter-row" href={`/read/${c.id}`}>
                      <span>
                        <span className="chapter-label">{c.label}</span>
                        <span className="chapter-sub">{[c.group, c.date].filter(Boolean).join(" · ")}</span>
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--muted)", flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
                    </Link>
                  ))}
                </div>
              )}
              {readable.length === 0 && external.length === 0 && (
                <div className="empty"><b>No English chapters listed</b>This title may only be available officially or in other languages.</div>
              )}
              {external.length > 0 && (
                <details className="external-chapters">
                  <summary>{external.length} chapter{external.length === 1 ? "" : "s"} on official publisher sites — can’t be read here</summary>
                  <div className="chapter-list">
                    {external.map((c) => (
                      <div key={c.id} className="chapter-row" style={{ opacity: 0.6 }}>
                        <span>
                          <span className="chapter-label">{c.label}</span>
                          <span className="chapter-sub">Official source{c.group ? ` · ${c.group}` : ""} — open in your browser</span>
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", flexShrink: 0 }}><path d="M7 17L17 7M9 7h8v8"/></svg>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          );
        })()}
      </section>
    </main>
  );
}
