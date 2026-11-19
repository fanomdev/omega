// Akari image proxy on Cloudflare Workers — drop-in replacement for the
// Vercel /api/img route. Same allowlist, same per-host Referer, but bytes
// flow through Cloudflare's edge (cached 7d at the PoP) instead of Vercel's.

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

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

    const url = new URL(request.url);
    const u = url.searchParams.get("u");
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

    // Edge cache — covers between the same PoP (key = the proxy URL itself)
    const cacheKey = new Request(url.toString());
    const hit = await caches.default.match(cacheKey);
    if (hit) return hit;

    const referer = host.endsWith("mangadex.org")
      ? "https://mangadex.org/"
      : /readdetectiveconan\.com$|mangapill\.com$/i.test(host)
        ? "https://mangapill.com/"
        : "https://allmanga.to/";

    let res;
    try {
      res = await fetch(target, {
        headers: { referer, "User-Agent": UA, Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
        redirect: "follow",
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

    const out = new Response(res.body, {
      status: 200,
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=604800, immutable",
        "x-content-type-options": "nosniff",
        "access-control-allow-origin": "*",
      },
    });
    ctx.waitUntil(caches.default.put(cacheKey, out.clone()));
    return out;
  },
};
