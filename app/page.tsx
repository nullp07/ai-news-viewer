"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, AlertCircle, X, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SearchBar } from "@/components/search-bar";
import { ArticleCard, ArticleCardSkeleton } from "@/components/article-card";
import { AnalyzedTable } from "@/components/analyzed-table";
import { ArticleTicker } from "@/components/article-ticker";
import { ThemesView } from "@/components/themes-view";
import { ArticleDialog } from "@/components/article-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  searchArticles,
  analyzeArticle,
  fetchAnalyzedArticles,
} from "@/lib/api-client";
import type { Article, ReviewedArticle } from "@/lib/types";

export default function SmartReviewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [analyzedArticles, setAnalyzedArticles] = useState<ReviewedArticle[]>([]);
  const [isLoadingAnalyzed, setIsLoadingAnalyzed] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [justAnalyzedIds, setJustAnalyzedIds] = useState<Set<string>>(new Set());

  const [error, setError] = useState<string | null>(null);

  const [previewArticle, setPreviewArticle] = useState<ReviewedArticle | null>(null);

  // Fetch first page of analyzed articles on mount.
  useEffect(() => {
    async function loadAnalyzed() {
      try {
        const page = await fetchAnalyzedArticles();
        setAnalyzedArticles(page.articles);
        setNextCursor(page.nextCursor);
      } catch {
        setError("Failed to load analyzed articles. Please refresh the page.");
      } finally {
        setIsLoadingAnalyzed(false);
      }
    }
    loadAnalyzed();
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await fetchAnalyzedArticles({ cursor: nextCursor });
      setAnalyzedArticles((prev) => {
        // De-dupe in case an analyze landed at the boundary mid-load.
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...page.articles.filter((a) => !seen.has(a.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load more articles.";
      toast.error(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const results = await searchArticles(searchQuery);
      // Filter out articles that have already been analyzed
      const analyzedIds = new Set(analyzedArticles.map((a) => a.id));
      const filteredResults = results.filter((r) => !analyzedIds.has(r.id));
      setSearchResults(filteredResults);
    } catch {
      setError("Failed to search articles. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, analyzedArticles]);

  const runAnalyze = useCallback(
    async (article: Article, opts?: { silent?: boolean }) => {
      setAnalyzingIds((prev) => new Set(prev).add(article.id));

      try {
        const reviewed = await analyzeArticle(article);

        setJustAnalyzedIds((prev) => new Set(prev).add(article.id));

        setTimeout(() => {
          setSearchResults((prev) => prev.filter((a) => a.id !== article.id));
          setAnalyzedArticles((prev) => [reviewed, ...prev]);
          setJustAnalyzedIds((prev) => {
            const next = new Set(prev);
            next.delete(article.id);
            return next;
          });
        }, 800);

        if (!opts?.silent) {
          toast.success("Analysis complete", {
            description: `"${article.title.slice(0, 50)}..." has been analyzed.`,
          });
        }
        return { ok: true as const, reviewed };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to analyze article.";
        return { ok: false as const, message };
      } finally {
        setAnalyzingIds((prev) => {
          const next = new Set(prev);
          next.delete(article.id);
          return next;
        });
      }
    },
    [],
  );

  const handleAnalyze = useCallback(
    async (article: Article) => {
      setError(null);
      const result = await runAnalyze(article);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Surface the freshly analyzed article immediately so the user doesn't
      // have to scroll to find it in the table below.
      setPreviewArticle(result.reviewed);
    },
    [runAnalyze],
  );

  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);

  const handleAnalyzeTop = useCallback(
    async (count = 3) => {
      const targets = searchResults.slice(0, count);
      if (targets.length === 0) return;

      setError(null);
      setIsBatchAnalyzing(true);
      try {
        const results = await Promise.all(
          targets.map((a) => runAnalyze(a, { silent: true })),
        );
        const failed = results.filter((r) => !r.ok).length;
        const ok = results.length - failed;

        if (ok > 0) {
          toast.success(`Analyzed ${ok} article${ok === 1 ? "" : "s"}`, {
            description:
              failed > 0
                ? `${failed} failed \u2014 see error message above.`
                : undefined,
          });
        }
        if (failed > 0 && ok === 0) {
          setError("Batch analyze failed. Please try again.");
        }
      } finally {
        setIsBatchAnalyzing(false);
      }
    },
    [searchResults, runAnalyze],
  );

  return (
    <main className="relative min-h-screen overflow-x-clip">
      {/* Animated gradient blobs behind the header. Pure CSS, no perf hit. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden">
        <div className="absolute -top-32 left-1/4 -translate-x-1/2 size-[420px] rounded-full bg-indigo-500/20 blur-3xl animate-blob" />
        <div
          className="absolute -top-20 right-1/4 translate-x-1/2 size-[360px] rounded-full bg-fuchsia-500/15 blur-3xl animate-blob"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="absolute top-32 left-1/2 -translate-x-1/2 size-[300px] rounded-full bg-emerald-400/10 blur-3xl animate-blob"
          style={{ animationDelay: "-12s" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="size-7 text-indigo-500 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Smart Reviewer
            </h1>
          </div>
          <p className="text-lg text-foreground/80 mb-1">
            AI-powered news analysis
          </p>
          <p className="text-sm text-muted-foreground">
            Search, summarize, and analyze sentiment of news articles in seconds
          </p>
        </header>

        {/* Live ticker of recently analyzed articles */}
        <ArticleTicker articles={analyzedArticles} isLoading={isLoadingAnalyzed} />

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setError(null)}
                className="shrink-0"
              >
                <X className="size-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search Section */}
        <section className="mb-10" aria-labelledby="search-heading">
          <h2 id="search-heading" className="sr-only">
            Search articles
          </h2>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            isLoading={isSearching}
          />

          {/* Search Results */}
          <div className="mt-6">
            {isSearching ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <ArticleCardSkeleton key={i} />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {searchResults.length} result
                    {searchResults.length === 1 ? "" : "s"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyzeTop(3)}
                    disabled={isBatchAnalyzing || searchResults.length === 0}
                  >
                    {isBatchAnalyzing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span className="ml-2">Analyzing top 3...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="size-4" />
                        <span className="ml-2">
                          Analyze top {Math.min(3, searchResults.length)}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onAnalyze={handleAnalyze}
                      isAnalyzing={analyzingIds.has(article.id)}
                      justAnalyzed={justAnalyzedIds.has(article.id)}
                    />
                  ))}
                </div>
              </>
            ) : hasSearched ? (
              <div className="text-center py-8 text-muted-foreground">
                No articles found for &quot;{searchQuery}&quot;. Try a different search term.
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Type a search query to find articles
              </div>
            )}
          </div>
        </section>

        {/* Analyzed Articles Section */}
        <section aria-labelledby="analyzed-heading">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2
              id="analyzed-heading"
              className="text-xl font-semibold text-foreground"
            >
              Analyzed Articles
            </h2>
          </div>

          <Tabs defaultValue="table" className="gap-4">
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="themes">Themes</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <AnalyzedTable
                articles={analyzedArticles}
                isLoading={isLoadingAnalyzed}
                hasMore={nextCursor !== null}
                isLoadingMore={isLoadingMore}
                onLoadMore={handleLoadMore}
              />
            </TabsContent>

            <TabsContent value="themes">
              <ThemesView
                articles={analyzedArticles}
                isLoading={isLoadingAnalyzed}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <ArticleDialog
        article={previewArticle}
        open={previewArticle !== null}
        onOpenChange={(open) => !open && setPreviewArticle(null)}
      />
    </main>
  );
}
