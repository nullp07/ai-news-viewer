"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  Layers,
  TrendingDown,
  TrendingUp,
  Minus,
  ArrowUpRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SentimentBadge } from "@/components/sentiment-badge";
import { ArticleDialog } from "@/components/article-dialog";
import { groupByTheme, UNTAGGED_KEY, type ThemeGroup } from "@/lib/grouping";
import type { ReviewedArticle, Sentiment } from "@/lib/types";

interface ThemesViewProps {
  articles: ReviewedArticle[];
  isLoading: boolean;
}

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  positive: "#10b981", // emerald-500
  neutral: "#71717a", // zinc-500
  negative: "#f43f5e", // rose-500
};

const SENTIMENT_DOT: Record<Sentiment, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-zinc-400",
  negative: "bg-rose-500",
};

// ---------- mini visualizations ----------

/**
 * SVG donut chart of sentiment counts. The total count is rendered in the
 * center. Single-segment groups get a solid ring; empty groups render a faint
 * placeholder so the layout doesn't shift.
 */
function SentimentDonut({
  counts,
  size = 84,
  strokeWidth = 10,
}: {
  counts: ThemeGroup["counts"];
  size?: number;
  strokeWidth?: number;
}) {
  const total = counts.positive + counts.neutral + counts.negative;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const allSegments: Array<{ key: Sentiment; count: number; color: string }> = [
    { key: "positive", count: counts.positive, color: SENTIMENT_COLOR.positive },
    { key: "neutral", count: counts.neutral, color: SENTIMENT_COLOR.neutral },
    { key: "negative", count: counts.negative, color: SENTIMENT_COLOR.negative },
  ];
  const segments = allSegments.filter((s) => s.count > 0);

  let offset = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label={`${total} articles: ${counts.positive} positive, ${counts.neutral} neutral, ${counts.negative} negative`}
    >
      {/* track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        className="stroke-muted/40"
        strokeWidth={strokeWidth}
      />

      {segments.map((s) => {
        const len = (s.count / total) * c;
        const dasharray = `${len} ${c - len}`;
        const dashoffset = -offset;
        offset += len;
        return (
          <circle
            key={s.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            strokeLinecap={segments.length > 1 ? "butt" : "round"}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              transition: "stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease",
            }}
          />
        );
      })}

      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-semibold tabular-nums"
        style={{ fontSize: size * 0.32 }}
      >
        {total}
      </text>
    </svg>
  );
}

/**
 * Tiny sparkline of signed sentiment scores in chronological (oldest → newest)
 * order. Renders nothing when there's only one article.
 */
function ScoreSparkline({ articles }: { articles: ReviewedArticle[] }) {
  const points = useMemo(() => {
    const sorted = [...articles].sort((a, b) =>
      a.analyzedAt.localeCompare(b.analyzedAt),
    );
    return sorted.map((a) => {
      const s = a.analysis.sentiment;
      const score = a.analysis.sentimentScore;
      if (s === "positive") return score;
      if (s === "negative") return -score;
      return 0;
    });
  }, [articles]);

  if (points.length < 2) return null;

  const w = 80;
  const h = 24;
  const pad = 2;
  const minY = -1;
  const maxY = 1;
  const stepX = (w - pad * 2) / (points.length - 1);

  const xy = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + ((maxY - p) / (maxY - minY)) * (h - pad * 2);
    return [x, y] as const;
  });

  const path = xy
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];
  const lastColor =
    last > 0.05
      ? SENTIMENT_COLOR.positive
      : last < -0.05
      ? SENTIMENT_COLOR.negative
      : SENTIMENT_COLOR.neutral;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 opacity-80"
      aria-hidden
    >
      {/* zero line */}
      <line
        x1={pad}
        y1={h / 2}
        x2={w - pad}
        y2={h / 2}
        className="stroke-muted/60"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground/70"
      />
      <circle
        cx={xy[xy.length - 1][0]}
        cy={xy[xy.length - 1][1]}
        r={2.2}
        fill={lastColor}
      />
    </svg>
  );
}

function MeanScorePill({ value }: { value: number }) {
  const Icon = value > 0.05 ? TrendingUp : value < -0.05 ? TrendingDown : Minus;
  const tone =
    value > 0.05
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      : value < -0.05
      ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
      : "text-muted-foreground bg-muted/40 border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tabular-nums font-medium ${tone}`}
    >
      <Icon className="size-3" />
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}
    </span>
  );
}

function CountChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden />
      <span className="tabular-nums font-medium text-foreground">{count}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// ---------- card ----------

function ThemeCard({
  group,
  onOpen,
}: {
  group: ThemeGroup;
  onOpen: (g: ThemeGroup) => void;
}) {
  const isUntagged = group.key === UNTAGGED_KEY;

  return (
    <button
      type="button"
      onClick={() => onOpen(group)}
      className={`group relative text-left rounded-xl border bg-card/40 backdrop-blur-sm p-4 sm:p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-indigo-500/50 hover:bg-card/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
        isUntagged ? "opacity-80" : ""
      }`}
    >
      {/* gradient halo on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, rgba(99,102,241,0.18), transparent 70%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`size-2 rounded-full ${SENTIMENT_DOT[group.dominant]} shadow-[0_0_8px_currentColor]`}
              aria-hidden
            />
            <h3 className="font-semibold text-base truncate">{group.label}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {group.articles.length}{" "}
            {group.articles.length === 1 ? "article" : "articles"}
          </p>
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground/60 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
      </div>

      <div className="relative flex items-center gap-4">
        <SentimentDonut counts={group.counts} />

        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          {group.counts.positive > 0 && (
            <CountChip
              label="positive"
              count={group.counts.positive}
              color={SENTIMENT_COLOR.positive}
            />
          )}
          {group.counts.neutral > 0 && (
            <CountChip
              label="neutral"
              count={group.counts.neutral}
              color={SENTIMENT_COLOR.neutral}
            />
          )}
          {group.counts.negative > 0 && (
            <CountChip
              label="negative"
              count={group.counts.negative}
              color={SENTIMENT_COLOR.negative}
            />
          )}
        </div>
      </div>

      <div className="relative mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <MeanScorePill value={group.meanScore} />
        <ScoreSparkline articles={group.articles} />
      </div>
    </button>
  );
}

// ---------- top-level view ----------

export function ThemesView({ articles, isLoading }: ThemesViewProps) {
  const groups = useMemo(() => groupByTheme(articles), [articles]);
  const [openGroup, setOpenGroup] = useState<ThemeGroup | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ReviewedArticle | null>(null);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 flex flex-col items-center justify-center text-center">
        <Layers className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-foreground mb-1">No themes yet</h3>
        <p className="text-sm text-muted-foreground">
          Analyze a few articles to see them clustered by topic.
        </p>
      </div>
    );
  }

  // Header stats
  const totalArticles = groups.reduce((sum, g) => sum + g.articles.length, 0);
  const distinctThemes = groups.filter((g) => g.key !== UNTAGGED_KEY).length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground tabular-nums">
            {distinctThemes}
          </span>{" "}
          {distinctThemes === 1 ? "theme" : "themes"} across{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {totalArticles}
          </span>{" "}
          tagged article{totalArticles === 1 ? "" : "s"}
        </span>
        <span className="hidden sm:inline">Tap a card to see its articles</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <ThemeCard key={g.key} group={g} onOpen={setOpenGroup} />
        ))}
      </div>

      {/* Theme dialog: lists articles in the selected theme */}
      <Dialog
        open={openGroup !== null}
        onOpenChange={(open) => !open && setOpenGroup(null)}
      >
        <DialogContent className="max-w-2xl">
          {openGroup && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className={`size-2.5 rounded-full ${SENTIMENT_DOT[openGroup.dominant]} shadow-[0_0_8px_currentColor]`}
                    aria-hidden
                  />
                  {openGroup.label}
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    {openGroup.articles.length}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-3 pt-1">
                  <MeanScorePill value={openGroup.meanScore} />
                  <span className="text-xs">
                    {openGroup.counts.positive} positive ·{" "}
                    {openGroup.counts.neutral} neutral ·{" "}
                    {openGroup.counts.negative} negative
                  </span>
                </DialogDescription>
              </DialogHeader>

              {openGroup.key === UNTAGGED_KEY && (
                <p className="text-xs text-muted-foreground">
                  These articles were analyzed before topic tagging was added.
                  Re-analyze them to surface their themes.
                </p>
              )}

              <ul className="divide-y divide-border/60 max-h-[60vh] overflow-y-auto -mx-2 px-2">
                {openGroup.articles.map((a) => (
                  <li key={a.id} className="py-3 flex items-start gap-3">
                    <SentimentBadge sentiment={a.analysis.sentiment} size="sm" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedArticle(a);
                        setOpenGroup(null);
                      }}
                      className="flex-1 min-w-0 text-left group"
                    >
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-indigo-400 transition-colors">
                        {a.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {a.source}
                      </p>
                    </button>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-muted-foreground hover:text-indigo-400 transition-colors p-1"
                      aria-label={`Open ${a.title} in a new tab`}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ArticleDialog
        article={selectedArticle}
        open={selectedArticle !== null}
        onOpenChange={(open) => !open && setSelectedArticle(null)}
      />
    </>
  );
}
