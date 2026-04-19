"use client";

import { useState } from "react";
import { FileSearch, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SentimentBadge } from "@/components/sentiment-badge";
import { ArticleDialog } from "@/components/article-dialog";
import type { ReviewedArticle } from "@/lib/types";

interface AnalyzedTableProps {
  articles: ReviewedArticle[];
  isLoading: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AnalyzedTable({
  articles,
  isLoading,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: AnalyzedTableProps) {
  const [selectedArticle, setSelectedArticle] = useState<ReviewedArticle | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[28%]">Title</TableHead>
              <TableHead className="hidden md:table-cell w-[12%]">Source</TableHead>
              <TableHead className="w-[14%] sm:w-[12%]">Sentiment</TableHead>
              <TableHead className="w-[34%] sm:w-[30%]">Summary</TableHead>
              <TableHead className="hidden lg:table-cell w-[10%]">Analyzed</TableHead>
              <TableHead className="w-[14%] sm:w-[8%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-14 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 flex flex-col items-center justify-center text-center">
        <FileSearch className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-foreground mb-1">No articles analyzed yet</h3>
        <p className="text-sm text-muted-foreground">
          Search above to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <div>
          <Table className="table-fixed w-full">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[28%]">Title</TableHead>
                <TableHead className="hidden md:table-cell w-[12%]">Source</TableHead>
                <TableHead className="w-[14%] sm:w-[12%]">Sentiment</TableHead>
                <TableHead className="w-[34%] sm:w-[30%]">Summary</TableHead>
                <TableHead className="hidden lg:table-cell w-[10%]">Analyzed</TableHead>
                <TableHead className="w-[14%] sm:w-[8%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article, index) => (
                <TableRow
                  key={article.id}
                  className={index % 2 === 1 ? "bg-muted/30" : ""}
                >
                  <TableCell className="align-top">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium line-clamp-2 cursor-help break-words">
                          {article.title}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-sm">
                        {article.title}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="hidden md:table-cell align-top">
                    <Badge variant="outline" className="text-xs max-w-full truncate inline-block">
                      {article.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <SentimentBadge
                      sentiment={article.analysis.sentiment}
                      score={article.analysis.sentimentScore}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm text-muted-foreground line-clamp-2 cursor-help break-words">
                          {article.analysis.summary}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-md">
                        {article.analysis.summary}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground whitespace-nowrap align-top">
                    {formatRelativeTime(article.analyzedAt)}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedArticle(article)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {hasMore && onLoadMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span className="ml-2">Loading...</span>
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}

      <ArticleDialog
        article={selectedArticle}
        open={selectedArticle !== null}
        onOpenChange={(open) => !open && setSelectedArticle(null)}
      />
    </>
  );
}
