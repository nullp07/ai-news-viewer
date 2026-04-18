"use client";

import { useState } from "react";
import { FileSearch } from "lucide-react";
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

export function AnalyzedTable({ articles, isLoading }: AnalyzedTableProps) {
  const [selectedArticle, setSelectedArticle] = useState<ReviewedArticle | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[30%]">Title</TableHead>
              <TableHead className="w-[10%]">Source</TableHead>
              <TableHead className="w-[12%]">Sentiment</TableHead>
              <TableHead className="w-[30%]">Summary</TableHead>
              <TableHead className="w-[10%]">Analyzed</TableHead>
              <TableHead className="w-[8%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[30%]">Title</TableHead>
                <TableHead className="w-[10%]">Source</TableHead>
                <TableHead className="w-[12%]">Sentiment</TableHead>
                <TableHead className="w-[30%]">Summary</TableHead>
                <TableHead className="w-[10%]">Analyzed</TableHead>
                <TableHead className="w-[8%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article, index) => (
                <TableRow
                  key={article.id}
                  className={index % 2 === 1 ? "bg-muted/30" : ""}
                >
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium line-clamp-1 cursor-help">
                          {article.title}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-sm">
                        {article.title}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {article.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SentimentBadge
                      sentiment={article.analysis.sentiment}
                      score={article.analysis.sentimentScore}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                          {article.analysis.summary}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-md">
                        {article.analysis.summary}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(article.analyzedAt)}
                  </TableCell>
                  <TableCell className="text-right">
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

      <ArticleDialog
        article={selectedArticle}
        open={selectedArticle !== null}
        onOpenChange={(open) => !open && setSelectedArticle(null)}
      />
    </>
  );
}
