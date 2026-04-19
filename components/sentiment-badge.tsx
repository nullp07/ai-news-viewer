import { cn } from "@/lib/utils";
import type { Sentiment } from "@/lib/types";

interface SentimentBadgeProps {
  sentiment: Sentiment;
  score?: number;
  size?: "sm" | "md" | "lg";
}

const sentimentConfig = {
  positive: {
    label: "Positive",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/20",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  neutral: {
    label: "Neutral",
    bgClass: "bg-zinc-500/10 dark:bg-zinc-500/20",
    textClass: "text-zinc-600 dark:text-zinc-400",
  },
  negative: {
    label: "Negative",
    bgClass: "bg-rose-500/10 dark:bg-rose-500/20",
    textClass: "text-rose-600 dark:text-rose-400",
  },
};

export function SentimentBadge({ sentiment, score, size = "md" }: SentimentBadgeProps) {
  const config = sentimentConfig[sentiment];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <div className="inline-flex flex-col items-center">
      <span
        className={cn(
          "inline-flex items-center rounded-full font-medium capitalize",
          "transition-transform duration-200 hover:scale-105",
          config.bgClass,
          config.textClass,
          sizeClasses[size]
        )}
      >
        {config.label}
      </span>
      {score !== undefined && (
        <span className="text-xs text-muted-foreground mt-0.5">
          {score.toFixed(2)}
        </span>
      )}
    </div>
  );
}
