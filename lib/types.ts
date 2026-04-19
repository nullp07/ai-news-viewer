export type Sentiment = "positive" | "neutral" | "negative";

export interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

export interface Analysis {
  summary: string;
  sentiment: Sentiment;
  sentimentScore: number;
  /** 1–3 canonical topic tags (e.g. "Tesla", "AI Regulation"). Optional for legacy docs. */
  topics?: string[];
}

// `description` is consumed by the LLM at analyze time but never shown for
// already-analyzed articles (the AI summary replaces it), so we don't persist it.
export interface ReviewedArticle extends Omit<Article, "description"> {
  analysis: Analysis;
  analyzedAt: string;
}
