import type { Collection, Document, Filter } from "mongodb";
import { getDb } from "./mongodb";
import type { ReviewedArticle } from "./types";

const COLLECTION = "reviewed_articles";
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// In Mongo, `_id` is the article id (sha1 of url) so we get free uniqueness
// and idempotent re-analysis. We strip it on the way out and re-add it as
// `id` to keep the client-facing shape in sync with `lib/types.ts`.
type ReviewedDoc = Omit<ReviewedArticle, "id"> & { _id: string };

// One-time index creation per process. `createIndex` is idempotent in Mongo,
// so a benign race between two concurrent first calls is harmless — the flag
// is just an optimization to skip the round-trip on subsequent requests.
let _indexesEnsured = false;

async function ensureIndexes(col: Collection<ReviewedDoc & Document>): Promise<void> {
  if (_indexesEnsured) return;
  await Promise.all([
    col.createIndex({ analyzedAt: -1 }, { name: "analyzedAt_-1" }),
    col.createIndex(
      { title: "text" },
      { name: "title_text", default_language: "english" },
    ),
  ]);
  _indexesEnsured = true;
}

async function collection(): Promise<Collection<ReviewedDoc & Document>> {
  const db = await getDb();
  const col = db.collection<ReviewedDoc & Document>(COLLECTION);
  await ensureIndexes(col);
  return col;
}

function toReviewed(doc: ReviewedDoc): ReviewedArticle {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export interface ListPage {
  articles: ReviewedArticle[];
  nextCursor: string | null;
}

export interface ListOptions {
  /** Cursor is the `analyzedAt` of the last item from the previous page. */
  cursor?: string;
  limit?: number;
}

export async function getReviewedArticles(opts: ListOptions = {}): Promise<ListPage> {
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

  const filter: Filter<ReviewedDoc & Document> = {};
  if (opts.cursor) {
    filter.analyzedAt = { $lt: opts.cursor };
  }

  // Fetch one extra to know whether there's a next page.
  const docs = await (await collection())
    .find(filter)
    .sort({ analyzedAt: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = hasMore ? page[page.length - 1].analyzedAt : null;

  return {
    articles: page.map((d) => toReviewed(d as unknown as ReviewedDoc)),
    nextCursor,
  };
}

export async function findReviewedById(id: string): Promise<ReviewedArticle | null> {
  const doc = await (await collection()).findOne({ _id: id });
  if (!doc) return null;
  return toReviewed(doc as unknown as ReviewedDoc);
}

export async function searchReviewedTitles(query: string, limit = 5): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Wildcard the last token so partials like "tes" match "Tesla" via the title
  // text index. The route layer already rejects sub-2-char queries, so $text
  // is sufficient on its own — no regex fallback needed.
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const last = tokens[tokens.length - 1];
  const search = [...tokens.slice(0, -1), `${last}*`].join(" ");

  const docs = await (await collection())
    .find({ $text: { $search: search } }, { projection: { title: 1, _id: 0 } })
    .sort({ analyzedAt: -1 })
    .limit(limit)
    .toArray();

  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of docs) {
    const t = (d as { title?: string }).title;
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export async function upsertReviewedArticle(article: ReviewedArticle): Promise<ReviewedArticle> {
  const col = await collection();
  const { id, ...rest } = article;

  // Upsert with just $set: when inserting, Mongo automatically uses the filter
  // (`{ _id: id }`) to populate the new doc's _id, so $setOnInsert is redundant.
  await col.updateOne({ _id: id }, { $set: rest }, { upsert: true });

  return article;
}
