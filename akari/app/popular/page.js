import Link from "next/link";
import TopBar from "@/components/TopBar";
import { proxyUrl } from "@/lib/proxy";
import { getPopular } from "@/lib/manga";

export const revalidate = 300;
export const metadata = { title: "Akari — Popular" };

const SORTS = [
  { key: "followed", label: "Most followed" },
  { key: "top", label: "Top rated" },
  { key: "new", label: "Newest" },
];

export default async function PopularPage({ searchParams }) {
  const params = await searchParams;
  const sort = SORTS.some((s) => s.key === params?.sort) ? params.sort : "followed";
  const page = Math.max(1, parseInt(params?.page, 10) || 1);

  let data = null;
  let failed = false;
  try {
    data = await getPopular(sort, page);
  } catch {
    failed = true;
  }

  return (
    <main className="page">
      <TopBar />
      <section className="section" style={{ marginTop: 6 }}>
        <div className="section-head" style={{ marginBottom: 14 }}>
          <h2><span className="bar" />Popular this season</h2>
        </div>

        <nav className="seg" aria-label="Sort popular manga">
          {SORTS.map((s) => (
            <Link key={s.key} href={`/popular?sort=${s.key}`} aria-current={s.key === sort}>
              {s.label}
            </Link>
          ))}
        </nav>

        {failed ? (
          <div className="error-box" style={{ marginTop: 10 }}>
            <b>Couldn’t load the rankings</b>
            The manga source didn’t respond. <Link href={`/popular?sort=${sort}`} style={{ color: "var(--accent)" }}>Retry</Link>
          </div>
        ) : (
          <>
            <div className="rows">
              {data.list.map((m, i) => (
                <Link href={`/manga/${m.id}`} key={m.id} className="row">
                  <span className="rank">{String((page - 1) * 24 + i + 1).padStart(2, "0")}</span>
                  {m.cover && (
                    <img className="row-cover" src={proxyUrl(m.coverSmall || m.cover)} alt="" width={54} height={81} loading="lazy" decoding="async" />
                  )}
                  <span className="row-body">
                    <span className="row-title">{m.title}</span>
                    <span className="row-sub">
                      {m.rating != null && <>★ {m.rating.toFixed(2)}<span className="dot" /></>}
                      {m.follows != null && <>{formatCount(m.follows)} follows<span className="dot" /></>}
                      {m.chapter || m.status}
                    </span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--muted)", flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
                </Link>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
              {page > 1
                ? <Link className="chip" href={`/popular?sort=${sort}&page=${page - 1}`}>← Newer</Link>
                : <span />}
              {page < data.totalPages &&
                <Link className="chip" href={`/popular?sort=${sort}&page=${page + 1}`}>Next page →</Link>}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
