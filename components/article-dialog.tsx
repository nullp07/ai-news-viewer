"use client";

import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SentimentBadge } from "@/components/sentiment-badge";
import type { ReviewedArticle } from "@/lib/types";

interface ArticleDialogProps {
  article: ReviewedArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ArticleDialog({ article, open, onOpenChange }: ArticleDialogProps) {
  if (!article) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl leading-relaxed pr-8 text-balance">
            {article.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{article.source}</Badge>
            <span className="text-sm text-muted-foreground">
              {formatDate(article.publishedAt)}
            </span>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-500 hover:text-indigo-600 inline-flex items-center gap-1 transition-colors ml-auto"
            >
              Read original
              <ExternalLink className="size-3" />
            </a>
          </div>

          {/* Sentiment */}
          <div className="flex items-center gap-4">
            <SentimentBadge
              sentiment={article.analysis.sentiment}
              size="lg"
            />
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {article.analysis.summary}
            </p>
          </div>

          {/* Sentiment Analysis Breakdown */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-3">
              Sentiment Analysis
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Classification</span>
                <p className="font-medium capitalize mt-1">
                  {article.analysis.sentiment}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Confidence Score</span>
                <p className="font-medium mt-1">
                  {(article.analysis.sentimentScore * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Analyzed on {formatDate(article.analyzedAt)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
