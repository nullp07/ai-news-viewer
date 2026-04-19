"use client";

import { ExternalLink, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Article } from "@/lib/types";

interface ArticleCardProps {
  article: Article;
  onAnalyze: (article: Article) => void;
  isAnalyzing: boolean;
  justAnalyzed: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ArticleCard({
  article,
  onAnalyze,
  isAnalyzing,
  justAnalyzed,
}: ArticleCardProps) {
  return (
    <div className="group relative">
      {/* Gradient halo on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/30 to-emerald-400/30 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
      />
      <Card className="relative p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-indigo-500/60 hover:shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs transition-colors group-hover:border-indigo-500/50">
            {article.source}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(article.publishedAt)}
          </span>
        </div>

        <h3 className="font-semibold text-foreground line-clamp-2 mb-2 text-balance">
          {article.title}
        </h3>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {article.description}
        </p>

        <div className="flex items-center justify-between">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-500 hover:text-indigo-600 inline-flex items-center gap-1 transition-colors group/link"
          >
            Read original
            <ExternalLink className="size-3 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </a>

          <Button
            size="sm"
            onClick={() => onAnalyze(article)}
            disabled={isAnalyzing || justAnalyzed}
            className="bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-100 shimmer-on-hover transition-transform active:scale-95"
          >
            {justAnalyzed ? (
              <>
                <Check className="size-4 text-emerald-400" />
                <span>Done</span>
              </>
            ) : isAnalyzing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Analyze</span>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function ArticleCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-16 bg-accent animate-pulse rounded-md" />
        <div className="h-4 w-20 bg-accent animate-pulse rounded-md" />
      </div>
      <div className="h-6 w-full bg-accent animate-pulse rounded-md mb-2" />
      <div className="h-5 w-3/4 bg-accent animate-pulse rounded-md mb-2" />
      <div className="h-4 w-full bg-accent animate-pulse rounded-md mb-1" />
      <div className="h-4 w-2/3 bg-accent animate-pulse rounded-md mb-4" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-accent animate-pulse rounded-md" />
        <div className="h-8 w-20 bg-accent animate-pulse rounded-md" />
      </div>
    </Card>
  );
}
