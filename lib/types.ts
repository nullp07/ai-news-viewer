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

export interface ReviewedArticle extends Article {
  analysis: Analysis;
  analyzedAt: string;
}
