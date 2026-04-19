import type { ReviewedArticle, Sentiment } from "./types";

export const UNTAGGED_KEY = "__untagged__";
export const UNTAGGED_LABEL = "Other";

export interface ThemeGroup {
  /** Stable lowercased key used for grouping. */
  key: string;
  /** Title-cased display label. */
  label: string;
  articles: ReviewedArticle[];
  counts: Record<Sentiment, number>;
  /** Majority sentiment label (ties resolve to neutral). */
  dominant: Sentiment;
  /**
   * Mean signed sentiment in [-1, +1] where positive contributes +score,
   * negative contributes -score, neutral contributes 0. Useful for a needle.
   */
  meanScore: number;
}

function titleCase(label: string): string {
  // Preserve common acronyms / brand casings the model may have used.
  const KEEP_UPPER = new Set(["ai", "us", "uk", "eu", "un", "nasa", "fbi", "ceo", "gpt", "tsla"]);
  return label
    .split(" ")
    .map((w) => {
      const lower = w.toLowerCase();
      if (KEEP_UPPER.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function signedScore(sentiment: Sentiment, score: number): number {
  if (sentiment === "positive") return score;
  if (sentiment === "negative") return -score;
  return 0;
}

export function groupByTheme(articles: ReviewedArticle[]): ThemeGroup[] {
  // key -> partial group state
  const map = new Map<
    string,
    {
      label: string;
      articles: ReviewedArticle[];
      counts: Record<Sentiment, number>;
      sumSigned: number;
    }
  >();

  for (const a of articles) {
    const topics = a.analysis.topics?.length ? a.analysis.topics : [UNTAGGED_KEY];

    for (const rawKey of topics) {
      const key = rawKey.trim().toLowerCase();
      if (!key) continue;

      const label = key === UNTAGGED_KEY ? UNTAGGED_LABEL : titleCase(key);

      let bucket = map.get(key);
      if (!bucket) {
        bucket = {
          label,
          articles: [],
          counts: { positive: 0, neutral: 0, negative: 0 },
          sumSigned: 0,
        };
        map.set(key, bucket);
      }

      bucket.articles.push(a);
      bucket.counts[a.analysis.sentiment] += 1;
      bucket.sumSigned += signedScore(a.analysis.sentiment, a.analysis.sentimentScore);
    }
  }

  const groups: ThemeGroup[] = [];
  for (const [key, b] of map.entries()) {
    const total = b.articles.length;
    const meanScore = total === 0 ? 0 : b.sumSigned / total;

    // Dominant: argmax with neutral tiebreak.
    const order: Sentiment[] = ["positive", "neutral", "negative"];
    let dominant: Sentiment = "neutral";
    let bestCount = -1;
    for (const s of order) {
      if (b.counts[s] > bestCount) {
        bestCount = b.counts[s];
        dominant = s;
      }
    }
    // Tie between positive and negative → neutral.
    if (
      b.counts.positive === b.counts.negative &&
      b.counts.positive > b.counts.neutral
    ) {
      dominant = "neutral";
    }

    groups.push({
      key,
      label: b.label,
      articles: b.articles,
      counts: b.counts,
      dominant,
      meanScore: Number(meanScore.toFixed(3)),
    });
  }

  // Sort: largest groups first, untagged always last.
  groups.sort((a, b) => {
    if (a.key === UNTAGGED_KEY) return 1;
    if (b.key === UNTAGGED_KEY) return -1;
    return b.articles.length - a.articles.length;
  });

  return groups;
}
