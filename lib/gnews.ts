import { createHash } from "node:crypto";
import type { Article } from "./types";
import { PublicError } from "./api-errors";

const GNEWS_ENDPOINT = "https://gnews.io/api/v4/search";

interface GNewsArticle {
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

export interface SearchOptions {
  query: string;
  max?: number;
  lang?: string;
}

function articleId(url: string): string {
  return createHash("sha1").update(url).digest("hex");
}

export async function searchGNews({ query, max = 12, lang = "en" }: SearchOptions): Promise<Article[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    throw new Error("GNEWS_API_KEY is not set. Add it to .env.local.");
  }

  const url = new URL(GNEWS_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("lang", lang);
  url.searchParams.set("max", String(Math.min(Math.max(max, 1), 25)));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url, {
    // News results don't need to be fresh per request, but we don't want
    // Next to cache forever either – 5 minutes feels right.
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    if (res.status === 429 || res.status === 403) {
      throw new PublicError("News API quota exceeded. Try again later.", 503);
    }
    const body = await res.text().catch(() => "");
    // Internal-only message; never reaches the client in production.
    throw new Error(`GNews request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as GNewsResponse;

  return data.articles.map((a) => ({
    id: articleId(a.url),
    title: a.title,
    description: a.description ?? "",
    url: a.url,
    source: a.source.name,
    publishedAt: a.publishedAt,
  }));
}
