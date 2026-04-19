# Smart Reviewer

A single-page Next.js app that searches real-time news, generates an AI summary
plus sentiment in a single LLM call, and persists the results to MongoDB.

Built for the Smart Reviewer case study.

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui
- **News**: [GNews.io](https://gnews.io/) (free tier, 100 req/day)
- **GenAI**: OpenAI `gpt-4o-mini` in JSON mode — one call returns `{ summary, sentiment, sentimentScore }`
- **Database**: MongoDB (Atlas free tier recommended)

## Architecture

```
app/page.tsx ──► lib/api-client.ts ──► /api/news/search       ──► GNews.io
                                  └──► /api/articles          ──► MongoDB (read)
                                  └──► /api/articles/analyze  ──► OpenAI ─► MongoDB (upsert)
```

- `lib/gnews.ts` — fetch + map; article id = `sha1(url)` so the same article
  always has the same id (idempotent re-analysis, stable client-side dedup).
- `lib/openai.ts` — one structured-output call, response validated with `zod`.
- `lib/repository.ts` — `reviewed_articles` collection, `_id = article.id` for
  free uniqueness.
- `lib/mongodb.ts` — singleton client cached on `globalThis` for dev HMR.

### Why one LLM call?

The brief asks to "minimize calls" for sentiment. A single chat completion in
JSON mode returns the summary and the sentiment label + confidence together,
so we never make a second round-trip just for sentiment.

## Getting started

### 1. Prerequisites

- Node 20+ and `pnpm` (or use `npx pnpm ...`)
- An OpenAI API key — https://platform.openai.com/api-keys
- A GNews API key — https://gnews.io/
- A MongoDB connection string — easiest is a free Atlas cluster:
  https://www.mongodb.com/cloud/atlas/register

### 2. Install

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Then fill in `.env.local`:

```
OPENAI_API_KEY=sk-...
GNEWS_API_KEY=...
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=smart_reviewer
```

The collection (`reviewed_articles`) is created automatically on first write —
no manual schema setup needed.

### 4. Run

```bash
pnpm dev
```

Open http://localhost:3000.

## Deploying

Designed to deploy on Vercel + MongoDB Atlas:

1. Push the repo to GitHub.
2. Import the project on [vercel.com](https://vercel.com).
3. Add the four env vars above in **Project Settings → Environment Variables**.
4. In Atlas, allow Vercel's IPs by setting **Network Access → Allow access from anywhere** (`0.0.0.0/0`) for the case study, or use Atlas's Vercel integration for stricter rules.
5. Deploy. The same `next dev`/`next build` works on Vercel without changes.

## API

| Method | Path                                       | Purpose                                                       |
| ------ | ------------------------------------------ | ------------------------------------------------------------- |
| GET    | `/api/news/search?q=...&max=12`            | Search GNews, returns `{ articles: Article[] }`. `q` ≥ 2 chars. |
| POST   | `/api/articles/analyze`                    | `{ article }` → `{ article, cached }`. Idempotent on `id`.     |
| GET    | `/api/articles?cursor=&limit=50`           | Cursor-paginated reviewed list: `{ articles, nextCursor }`.   |
| GET    | `/api/suggestions?q=...`                   | Title autocomplete from already-analyzed articles.            |

All routes return `{ error: string }` with a 4xx/5xx status on failure. The
client wrapper in `lib/api-client.ts` throws those messages so the existing UI
toast/alert flow surfaces them. In production, only messages explicitly marked
safe (`PublicError` in `lib/api-errors.ts`) are forwarded — internal details
collapse to a generic 500 string.

## Operational design

A few choices that shaped the backend, plus the trade-offs they cost:

### Idempotency and dedup
- `_id = sha1(url)` in MongoDB gives free uniqueness. The same article URL
  always upserts the same document.
- The analyze route checks `findReviewedById(id)` **before** calling OpenAI and
  returns the cached document if present. This makes the route safe to retry
  and protects the OpenAI bill from accidental re-analyses (multi-tab,
  double-click, batch tools).

### Indexes (created lazily, once per process)
- `{ analyzedAt: -1 }` — backs the list query and cursor pagination.
- `{ title: "text" }` — backs `/api/suggestions`. Suggestion queries use `$text`
  with a prefix-wildcard on the last token (`tes*` → "Tesla"). The route layer
  rejects sub-2-char queries, so `$text` is sufficient on its own.

### Schema authority
Document shape is enforced at the application boundary by `zod` (in the
analyze route + the OpenAI response validator). This app is the only writer
to the collection, so a collection-level `$jsonSchema` validator would add
ceremony without catching anything in practice. If you ever open the database
to additional writers, add a strict validator via a one-off migration script.

### Persisted shape
`description` from GNews is consumed by OpenAI but **not** persisted — the AI
summary replaces it for display, so storing both would just create stale-data
risk. The persisted document is `{ _id, title, url, source, publishedAt,
analysis, analyzedAt }`.

### Rate limiting
In-memory token-bucket per `(scope, IP)` in `lib/rate-limit.ts`:

| Route                         | Budget        |
| ----------------------------- | ------------- |
| `POST /api/articles/analyze`  | 5 req / min   |
| `GET /api/news/search`        | 20 req / min  |
| `GET /api/suggestions`        | 60 req / min  |

This survives within a single Node.js process — fine for `next dev` and
adequate for low-traffic Vercel deploys (lambdas are sticky). For multi-region
production traffic, swap `lib/rate-limit.ts` for an Upstash Ratelimit /
Cloudflare Rate Limiting backend.

### Pagination and DB growth
`/api/articles` uses cursor pagination on `analyzedAt`. The list page loads 50
docs at a time and the table exposes a "Load more" button. There is no TTL on
analyzed documents — the collection grows monotonically. For long-running
deploys, add a TTL index on `analyzedAt` or an archival job; for the case
study scope, monotonic growth is fine.

### Trust boundary on article metadata
`POST /api/articles/analyze` accepts `title`, `url`, `source`, and
`publishedAt` from the client and stores them as-is (`description` is consumed
by the LLM but discarded after). A malicious caller could store fabricated
metadata attributed to a legitimate source.

This is a deliberate trade-off for the case study:
- The alternative (server re-fetches every article from GNews using the id
  before analyzing) would double our quota usage on the free 100/day tier.
- All callers in this app come from our own UI, which only forwards what
  GNews returned.

For real production, change the analyze route to look up the article by id
in a server-side cache of recent search results, or re-fetch from the source
provider before persisting.

### Errors
Internal exceptions never reach the client in production — only messages
wrapped in `PublicError` (e.g. quota-exceeded warnings) survive sanitization.
Full details still hit `console.error` for ops.

## Notes / out of scope

Things I would add with more time:

- Auth so each user sees their own analyzed list, plus per-user rate limits.
- Server-side cache (Redis / Upstash) for repeated GNews queries.
- Structured logging + Sentry for real observability.
- TTL or archival policy for old analyzed articles.
- Server-side topic aggregation (currently grouped client-side; fine up to a
  few thousand docs).
- Atlas Search for fuzzier title autocomplete than `$text` can give.
- DELETE endpoint + UI affordance to drop a bad analysis.
