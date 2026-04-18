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
}

export interface ReviewedArticle extends Article {
  analysis: Analysis;
  analyzedAt: string;
}
