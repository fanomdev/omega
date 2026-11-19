import Link from "next/link";
import TopBar from "@/components/TopBar";
import { proxyUrl } from "@/lib/proxy";
import HeroCarousel from "@/components/HeroCarousel";
import MangaCard from "@/components/MangaCard";
import { getSuggestions } from "@/lib/manga";

export const revalidate = 300;
export const metadata = { title: "Akari — Suggestions" };

export default async function SuggestionsPage() {
  let data = null;
  let failed = false;
  try {
    data = await getSuggestions();
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <main className="page">
        <TopBar />
        <div className="error-box">
          <b>Couldn’t reach the manga source</b>
          The connection to the data provider failed. Check your network — or, if you
          set <code>MANGA_PROVIDER=mangahook</code>, make sure the mangahook server is running on port 3100.
          <div style={{ marginTop: 18 }}><Link href="/" className="hero-cta">Try again</Link></div>
        </div>
      </main>
    );
  }

  const spotlight = data.trending.slice(0, 5);

  return (
    <main className="page">
      <TopBar />

      <HeroCarousel items={spotlight} />

      <section className="section" aria-label="Trending now">
        <div className="section-head">
          <h2><span className="bar" />Trending now</h2>
          <Link className="section-link" href="/popular">See all popular →</Link>
        </div>
        <div className="rail">
          {data.trending.map((m) => <MangaCard key={m.id} manga={m} />)}
        </div>
      </section>

      <section className="section" aria-label="Latest chapters">
        <div className="section-head">
          <h2><span className="bar" />Fresh off the press</h2>
        </div>
        <div className="rows">
          {data.latest.slice(0, 6).map((m, i) => (
            <Link href={`/manga/${m.id}`} key={m.id} className="row">
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              {m.cover && <img className="row-cover" src={proxyUrl(m.coverSmall || m.cover)} alt="" width={54} height={81} loading="lazy" decoding="async" />}
              <span className="row-body">
                <span className="row-title">{m.title}</span>
                <span className="row-sub">{m.chapter && <>{m.chapter}<span className="dot" /></>}Updated recently</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--muted)", flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
            </Link>
          ))}
        </div>
      </section>

      <section className="section" aria-label="Top rated picks">
        <div className="section-head">
          <h2><span className="bar" />Top rated picks</h2>
          <Link className="section-link" href="/popular?sort=top">Ranked list →</Link>
        </div>
        <div className="grid">
          {data.picks.map((m) => <MangaCard key={m.id} manga={m} />)}
        </div>
      </section>
    </main>
  );
}
