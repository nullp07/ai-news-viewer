import type { Article, ReviewedArticle } from "./types";

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    // fall through
  }
  return `Request failed with status ${res.status}`;
}

export async function searchArticles(query: string): Promise<Article[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const res = await fetch(`/api/news/search?q=${encodeURIComponent(trimmed)}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const data = (await res.json()) as { articles: Article[] };
  return data.articles;
}

export async function analyzeArticle(article: Article): Promise<ReviewedArticle> {
  const res = await fetch("/api/articles/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ article }),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const data = (await res.json()) as { article: ReviewedArticle };
  return data.article;
}

export async function fetchSuggestions(query: string, signal?: AbortSignal): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const res = await fetch(`/api/suggestions?q=${encodeURIComponent(trimmed)}`, {
      method: "GET",
      signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions: string[] };
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

export interface AnalyzedPage {
  articles: ReviewedArticle[];
  nextCursor: string | null;
}

export async function fetchAnalyzedArticles(opts?: {
  cursor?: string;
  limit?: number;
}): Promise<AnalyzedPage> {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();

  const res = await fetch(`/api/articles${qs ? `?${qs}` : ""}`, { method: "GET" });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const data = (await res.json()) as AnalyzedPage;
  return { articles: data.articles ?? [], nextCursor: data.nextCursor ?? null };
}
