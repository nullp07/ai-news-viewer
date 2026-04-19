import { NextResponse } from "next/server";
import { searchReviewedTitles } from "@/lib/repository";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Suggestions get hammered while typing — keep it loose but bounded.
  const rl = rateLimit({
    scope: "suggestions",
    key: clientKey(request),
    tokensPerInterval: 60,
    intervalMs: 60_000,
  });
  if (!rl.ok) return NextResponse.json({ suggestions: [] });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();

  if (!query || query.length < 2 || query.length > 100) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await searchReviewedTitles(query, 5);
    return NextResponse.json({ suggestions });
  } catch (err) {
    // Suggestions are non-critical; degrade silently rather than breaking the search bar.
    console.error("[/api/suggestions]", err);
    return NextResponse.json({ suggestions: [] });
  }
}
