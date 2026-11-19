"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Suggestions",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6-4.6-1.9 4.6-1.9L12 3z" />
        <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
      </svg>
    ),
  },
  {
    href: "/popular",
    label: "Popular",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c.8 3.2-.6 4.8-2 6.4C8.7 11 8 12.6 8 14.2A4.2 4.2 0 0 0 12.2 18.4c2.9 0 4.3-2 4.3-4.6 0-1.6-.7-2.9-1.7-4.3-.5 1.1-1.4 1.8-2.6 2.1.6-2.2.2-6.4-.2-8.6z" />
        <path d="M9.5 21h5" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </svg>
    ),
  },
];

export default function Dock() {
  const pathname = usePathname();
  // The reader is full-bleed; it has its own back control. No dock there.
  if (pathname.startsWith("/read")) return null;
  const active = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="dock-wrap" aria-label="Primary">
      <div className="dock">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="dock-item" aria-current={active(t.href) ? "page" : undefined}>
            {t.icon}
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
