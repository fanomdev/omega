"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { proxyUrl } from "@/lib/proxy";

export default function HeroCarousel({ items }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);
  const count = items.length;

  const go = useCallback(
    (i) => setIndex(((i % count) + count) % count),
    [count]
  );

  const resetTimer = useCallback(() => {
    clearInterval(timer.current);
    if (count > 1) timer.current = setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % count);
    }, 6000);
  }, [count]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timer.current);
  }, [resetTimer]);

  if (!count) return null;
  const m = items[index];

  return (
    <div className="hero" aria-roledescription="carousel" aria-label="Featured manga">
      <div className="hero-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {items.map((item, i) => (
          <div className="hero-slide" key={item.id} aria-hidden={i !== index}>
            {item.cover && (
              <img src={proxyUrl(item.cover)} alt="" width={1024} height={512} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 18%" }} />
            )}
            <div className="hero-scrim" />
            <div className="hero-copy">
              <span className="hero-kicker">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Spotlight
              </span>
              <h1>{item.title}</h1>
              <p>{item.description}</p>
              <Link href={`/manga/${item.id}`} className="hero-cta" tabIndex={i === index ? 0 : -1}>
                Read now
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </Link>
            </div>
          </div>
        ))}
      </div>
      <div className="hero-dots" role="tablist" aria-label="Choose spotlight">
        {items.map((item, i) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={i === index}
            aria-label={`Spotlight ${i + 1}: ${item.title}`}
            onClick={() => { go(i); resetTimer(); }}
          />
        ))}
      </div>
    </div>
  );
}
