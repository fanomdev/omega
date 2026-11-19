// Wrap external image URLs in a proxy so the browser never hits a CDN
// directly. Local sidecar URLs (localhost:3101) stay as-is — the browser
// can reach them.

// Non-AniList images stream from the Cloudflare Worker (akari/worker) so
// cover/page bytes don't flow through Vercel. AniList manually blocks
// Cloudflare's egress network (403 "manually blocked"), so those stay on
// the Vercel /api/img proxy.
const CF_ORIGIN = "https://akari-img.ayanbasit269.workers.dev";
const ANILIST = /(^|\.)anilist\.co$/i;

const needsVercel = (src) => {
  try {
    return ANILIST.test(new URL(src).hostname);
  } catch {
    return true; // unparseable → let the Vercel route validate it
  }
};

export const proxyUrl = (src) => {
  if (!src) return null;
  if (src.startsWith("http://localhost:") || src.startsWith("https://localhost:")) return src;
  if (src.startsWith("/api/img")) return src; // already wrapped
  if (src.startsWith(CF_ORIGIN)) return src; // already wrapped by the data layer
  const enc = encodeURIComponent(src);
  return needsVercel(src) ? `/api/img?u=${enc}` : `${CF_ORIGIN}/?u=${enc}`;
};
