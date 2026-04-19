import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeWithOpenAI } from "@/lib/openai";
import {
  findReviewedById,
  upsertReviewedArticle,
} from "@/lib/repository";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  errorResponse,
  PublicError,
  rateLimitResponse,
} from "@/lib/api-errors";
import type { ReviewedArticle } from "@/lib/types";

export const runtime = "nodejs";

const articleSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).default(""),
  url: z.string().url().max(2000),
  source: z.string().min(1).max(200),
  publishedAt: z.string().min(1).max(64),
});

const bodySchema = z.object({ article: articleSchema });

export async function POST(request: Request) {
  // 1. Rate limit per client IP. Tight on this route because each call is
  //    real money (OpenAI) and a Mongo write.
  const rl = rateLimit({
    scope: "analyze",
    key: clientKey(request),
    tokensPerInterval: 5,
    intervalMs: 60_000,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  // 2. Parse + validate body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { article } = parsed.data;

  try {
    // 3. Server-side dedup. If we've already analyzed this article (by id),
    //    return the cached result instead of paying for another OpenAI call.
    const existing = await findReviewedById(article.id);
    if (existing) {
      return NextResponse.json({ article: existing, cached: true });
    }

    // 4. Analyze + persist.
    const analysis = await analyzeWithOpenAI(article);

    const reviewed: ReviewedArticle = {
      ...article,
      analysis,
      analyzedAt: new Date().toISOString(),
    };

    await upsertReviewedArticle(reviewed);

    return NextResponse.json({ article: reviewed, cached: false });
  } catch (err) {
    console.error("[/api/articles/analyze]", err);
    // Surface known-public errors verbatim (e.g. "OpenAI quota exceeded"); hide
    // everything else behind a generic message in production.
    if (err instanceof PublicError) return errorResponse(err);
    return errorResponse(err, "Failed to analyze article.");
  }
}
