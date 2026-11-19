// Public pass-through to RapidAPI "mangapi3" (mangapi3.p.rapidapi.com).
// Purpose: let the site's owner poke at the API from anywhere before
// wiring it into Akari. The RapidAPI key is a Worker secret and is never
// exposed to clients.
//
// Setup: cd worker-mangapi && npx wrangler secret put RAPIDAPI_KEY
// (CF api token via CLOUDFLARE_API_TOKEN env var)
//
// Then any RapidAPI path/query works verbatim:
//   https://mangapi.ayanbasit269.workers.dev/<path>?<query>

const UPSTREAM = "https://mangapi3.p.rapidapi.com";
const HOST_HEADER = "mangapi3.p.rapidapi.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }
    if (request.method !== "GET" && request.method !== "POST") {
      return json({ error: "Only GET/POST are proxied" }, 405);
    }
    if (!env.RAPIDAPI_KEY) {
      return json(
        {
          error: "RAPIDAPI_KEY secret is not set",
          fix: "cd worker-mangapi && npx wrangler secret put RAPIDAPI_KEY",
        },
        500
      );
    }

    const target = UPSTREAM + url.pathname + url.search;
    const headers = new Headers();
    headers.set("x-rapidapi-key", env.RAPIDAPI_KEY);
    headers.set("x-rapidapi-host", HOST_HEADER);
    headers.set("accept", request.headers.get("accept") || "application/json");
    const reqBody = request.method === "POST" ? request.body : undefined;

    let upstream;
    try {
      upstream = await fetch(target, {
        method: request.method,
        headers,
        body: reqBody,
        redirect: "follow",
      });
    } catch (e) {
      return json({ error: "upstream fetch failed: " + (e?.message || e) }, 502);
    }

    const body = await upstream.arrayBuffer();
    const respHeaders = corsHeaders();
    respHeaders.set("content-type", upstream.headers.get("content-type") || "application/octet-stream");
    respHeaders.set("cache-control", "no-store");
    return new Response(body, { status: upstream.status, headers: respHeaders });
  },
};

function corsHeaders() {
  const h = new Headers();
  h.set("access-control-allow-origin", "*");
  h.set("access-control-allow-methods", "GET, POST, OPTIONS");
  h.set("access-control-allow-headers", "accept, content-type");
  return h;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { ...Object.fromEntries(corsHeaders()), "content-type": "application/json" },
  });
}
