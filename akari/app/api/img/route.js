// Image proxy. Every <img> in Akari goes through here so the browser never
// talks to a CDN directly — those 403 / ERR_BLOCKED_BY_ORB on restricted
// networks, while this same fetch server-side works with a proper Referer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

const ALLOWED_HOSTS = [
  /(^|\.)readdetectiveconan\.com$/i,
  /(^|\.)cdn\.readdetectiveconan\.com$/i,
  /(^|\.)mangapill\.com$/i,
  /(^|\.)youtube-anime\.com$/i,
  /(^|\.)anilist\.co$/i,
  /(^|\.)allmanga\.to$/i,
  /(^|\.)allanime\.day$/i,
  /(^|\.)kitsu\.io$/i,
  /^uploads\.mangadex\.org$/i,
  /(^|\.)mangadex\.network$/i,
];

const IMAGE_TYPE = /^(image\/(?!svg)|application\/octet-stream|binary\/)/i;
const EXT_TYPES = {
  avif: "image/avif", gif: "image/gif", jpeg: "image/jpeg", jpg: "image/jpeg",
  png: "image/png", webp: "image/webp", bmp: "image/bmp",
};

export async function GET(request) {
  const u = request.nextUrl.searchParams.get("u");
  if (!u) return new Response("Missing u parameter", { status: 400 });
  let target;
  try {
    target = new URL(u);
  } catch {
    return new Response("Invalid image URL", { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return new Response("Invalid scheme", { status: 400 });
  }
  const host = target.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.some((re) => re.test(host))) {
    return new Response("Host not allowed", { status: 403 });
  }

  // Per-host Referer — Mangapill's CDN blocks foreign referrers outright (403);
  // AllAnime CDNs expect the manga domain.
  const referer = host.endsWith("mangadex.org") ? "https://mangadex.org/"
    : /readdetectiveconan\.com$|mangapill\.com$/i.test(host) ? "https://mangapill.com/"
    : "https://allmanga.to/";
  let res;
  try {
    res = await fetch(target, {
      headers: { referer, "User-Agent": UA, Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }

  let type = res.headers.get("content-type") || "";
  if (!IMAGE_TYPE.test(type)) {
    const ext = target.pathname.split(".").pop()?.toLowerCase() ?? "";
    type = EXT_TYPES[ext] || "";
    if (!type) {
      void res.body?.cancel();
      return new Response("Image unavailable", { status: 502 });
    }
  }
  if (!res.ok || !res.body) {
    void res.body?.cancel();
    return new Response("Image unavailable", { status: res.status === 404 ? 404 : 502 });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=604800, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
