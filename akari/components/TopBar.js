import Link from "next/link";

export default function TopBar() {
  return (
    <header className="topbar">
      <Link href="/" className="wordmark" aria-label="Akari home">
        <b>AKARI</b>
        <span>Read the light</span>
      </Link>
      <Link href="/search" className="icon-btn" aria-label="Search manga">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </Link>
    </header>
  );
}
