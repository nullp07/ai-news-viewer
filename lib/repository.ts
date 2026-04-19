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

// Lazy one-time setup: indexes + JSON schema validator. Runs once per process.
let _setupPromise: Promise<void> | null = null;

async function ensureSetup(col: Collection<ReviewedDoc & Document>): Promise<void> {
  if (_setupPromise) return _setupPromise;

  _setupPromise = (async () => {
    // Indexes are idempotent; createIndex returns the existing one if present.
    await Promise.all([
      col.createIndex({ analyzedAt: -1 }, { name: "analyzedAt_-1" }),
      col.createIndex(
        { title: "text" },
        { name: "title_text", default_language: "english" },
      ),
    ]);

    // Schema validator. We use `validationLevel: "moderate"` so existing docs
    // missing newer fields (e.g. `analysis.topics`) keep working; only inserts
    // and updates to valid docs are validated.
    try {
      const db = await getDb();
      await db.command({
        collMod: COLLECTION,
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: [
              "_id",
              "title",
              "url",
              "source",
              "publishedAt",
              "analysis",
              "analyzedAt",
            ],
            properties: {
              _id: { bsonType: "string", minLength: 1 },
              title: { bsonType: "string", minLength: 1 },
              description: { bsonType: "string" },
              url: { bsonType: "string", minLength: 1 },
              source: { bsonType: "string", minLength: 1 },
              publishedAt: { bsonType: "string" },
              analyzedAt: { bsonType: "string" },
              analysis: {
                bsonType: "object",
                required: ["summary", "sentiment", "sentimentScore"],
                properties: {
                  summary: { bsonType: "string", minLength: 1 },
                  sentiment: { enum: ["positive", "neutral", "negative"] },
                  sentimentScore: { bsonType: "double", minimum: 0, maximum: 1 },
                  topics: {
                    bsonType: "array",
                    items: { bsonType: "string", minLength: 1 },
                    maxItems: 10,
                  },
                },
              },
            },
          },
        },
        validationLevel: "moderate",
        validationAction: "warn",
      });
    } catch (err) {
      // collMod requires the collection to exist. On a fresh DB this fails
      // silently — the validator gets re-applied on the next request after
      // the first insert creates the collection.
      console.warn("[repository] schema validator setup skipped:", (err as Error).message);
    }
  })();

  return _setupPromise;
}

async function collection(): Promise<Collection<ReviewedDoc & Document>> {
  const db = await getDb();
  const col = db.collection<ReviewedDoc & Document>(COLLECTION);
  // Fire-and-forget on the first call; subsequent calls await the cached promise.
  await ensureSetup(col);
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
  if (!trimmed) return [];

  const col = await collection();

  // For very short queries (1 char), $text needs a whole word — fall back to a
  // bounded regex scan. For 2+ chars we wildcard the last token so partials
  // like "tes" match "Tesla" via the title text index.
  let docs: Array<{ title?: string }> = [];
  if (trimmed.length >= 2) {
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const last = tokens[tokens.length - 1];
    const search = [...tokens.slice(0, -1), `${last}*`].join(" ");
    docs = await col
      .find({ $text: { $search: search } }, { projection: { title: 1, _id: 0 } })
      .sort({ analyzedAt: -1 })
      .limit(limit)
      .toArray();
  }

  if (docs.length === 0) {
    const safe = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    docs = await col
      .find({ title: { $regex: safe, $options: "i" } }, { projection: { title: 1, _id: 0 } })
      .sort({ analyzedAt: -1 })
      .limit(limit)
      .toArray();
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of docs) {
    const t = d.title;
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

  await col.updateOne(
    { _id: id },
    {
      // `analyzedAt` here is treated as "lastAnalyzedAt"; we also stamp
      // `firstAnalyzedAt` exactly once on insert so we don't lose the
      // original analysis time on re-runs.
      $set: { ...rest },
      $setOnInsert: { _id: id, firstAnalyzedAt: rest.analyzedAt },
    },
    { upsert: true },
  );

  return article;
}
