import { NextResponse } from "next/server";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  getReviewedArticles,
} from "@/lib/repository";
import { errorResponse } from "@/lib/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;

  const limitParam = searchParams.get("limit");
  let limit = DEFAULT_PAGE_SIZE;
  if (limitParam) {
    const n = Number(limitParam);
    if (Number.isNaN(n) || n < 1) {
      return NextResponse.json(
        { error: "`limit` must be a positive integer." },
        { status: 400 },
      );
    }
    limit = Math.min(n, MAX_PAGE_SIZE);
  }

  try {
    const page = await getReviewedArticles({ cursor, limit });
    return NextResponse.json(page);
  } catch (err) {
    console.error("[/api/articles]", err);
    return errorResponse(err, "Failed to load articles.");
  }
}
