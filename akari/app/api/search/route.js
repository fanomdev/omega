import { searchManga } from "@/lib/manga";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") || "1", 10) || 1);
  if (q.trim().length < 2) return Response.json({ list: [], totalPages: 1, page });
  try {
    return Response.json(await searchManga(q, page));
  } catch {
    return Response.json({ error: "Search source unavailable" }, { status: 502 });
  }
}
