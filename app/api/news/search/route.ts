import { NextResponse } from "next/server";
import { searchGNews } from "@/lib/gnews";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { errorResponse, rateLimitResponse } from "@/lib/api-errors";

export const runtime = "nodejs";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 200;

export async function GET(request: Request) {
  const rl = rateLimit({
    scope: "news-search",
    key: clientKey(request),
    tokensPerInterval: 20,
    intervalMs: 60_000,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  const maxParam = searchParams.get("max");
  const max = maxParam ? Number(maxParam) : 12;

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at most ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (Number.isNaN(max) || max < 1 || max > 25) {
    return NextResponse.json(
      { error: "`max` must be a number between 1 and 25." },
      { status: 400 },
    );
  }

  try {
    const articles = await searchGNews({ query, max });
    return NextResponse.json({ articles });
  } catch (err) {
    console.error("[/api/news/search]", err);
    return errorResponse(err, "Failed to search news.");
  }
}
