"use client";

import { useMemo } from "react";
import { TrendingUp, ExternalLink } from "lucide-react";
import type { ReviewedArticle, Sentiment } from "@/lib/types";

interface ArticleTickerProps {
  articles: ReviewedArticle[];
  isLoading?: boolean;
}

const sentimentDot: Record<Sentiment, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-zinc-400",
  negative: "bg-rose-500",
};

export function ArticleTicker({ articles, isLoading }: ArticleTickerProps) {
  // Take the most recent 12 — enough to fill the strip without it looping in 2 seconds.
  const items = useMemo(() => articles.slice(0, 12), [articles]);

  if (isLoading) {
    return (
      <div
        aria-hidden
        className="rounded-full border bg-card/40 backdrop-blur-sm h-10 mb-6 animate-pulse"
      />
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-full border bg-card/40 backdrop-blur-sm h-10 mb-6 flex items-center justify-center gap-2 px-4 text-xs text-muted-foreground">
        <TrendingUp className="size-3.5 text-indigo-500" />
        <span>Analyze your first article to populate the live ticker</span>
      </div>
    );
  }

  // Duplicate the list so the marquee loops seamlessly. The keyframes translate
  // by -50%, which is exactly the width of one copy of the list.
  const loop = [...items, ...items];

  return (
    <section
      aria-label="Recently analyzed articles"
      className="relative mb-8 rounded-full border bg-card/40 backdrop-blur-sm overflow-hidden group"
    >
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center gap-1.5 px-3 bg-gradient-to-r from-card via-card/95 to-transparent pr-6 text-[11px] uppercase tracking-wider font-semibold text-indigo-500">
        <TrendingUp className="size-3.5" />
        <span className="hidden sm:inline">Live</span>
      </div>

      <div className="mask-fade-x">
        <div
          className="flex gap-6 py-2.5 pl-20 animate-marquee whitespace-nowrap will-change-transform"
          style={{ width: "max-content" }}
        >
          {loop.map((a, i) => (
            <a
              key={`${a.id}-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-foreground/80 hover:text-foreground transition-colors"
            >
              <span
                className={`size-1.5 rounded-full ${sentimentDot[a.analysis.sentiment]} shadow-[0_0_8px_currentColor]`}
                aria-hidden
              />
              <span className="font-medium max-w-[42ch] truncate">
                {a.title}
              </span>
              <span className="text-muted-foreground">— {a.source}</span>
              <ExternalLink className="size-3 text-muted-foreground/60 shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Pause on hover */}
      <style jsx>{`
        section:hover .animate-marquee {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
