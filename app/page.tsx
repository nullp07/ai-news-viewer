"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { SearchBar } from "@/components/search-bar";
import { ArticleCard, ArticleCardSkeleton } from "@/components/article-card";
import { AnalyzedTable } from "@/components/analyzed-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  searchArticles,
  analyzeArticle,
  fetchAnalyzedArticles,
} from "@/lib/mock-data";
import type { Article, ReviewedArticle } from "@/lib/types";

export default function SmartReviewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [analyzedArticles, setAnalyzedArticles] = useState<ReviewedArticle[]>([]);
  const [isLoadingAnalyzed, setIsLoadingAnalyzed] = useState(true);

  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [justAnalyzedIds, setJustAnalyzedIds] = useState<Set<string>>(new Set());

  const [error, setError] = useState<string | null>(null);

  // Fetch analyzed articles on mount
  useEffect(() => {
    async function loadAnalyzed() {
      try {
        const articles = await fetchAnalyzedArticles();
        setAnalyzedArticles(articles);
      } catch {
        setError("Failed to load analyzed articles. Please refresh the page.");
      } finally {
        setIsLoadingAnalyzed(false);
      }
    }
    loadAnalyzed();
  }, []);

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

  const handleAnalyze = useCallback(async (article: Article) => {
    setAnalyzingIds((prev) => new Set(prev).add(article.id));
    setError(null);

    try {
      const reviewed = await analyzeArticle(article);

      // Mark as just analyzed (show checkmark)
      setJustAnalyzedIds((prev) => new Set(prev).add(article.id));

      // After a brief delay, remove from search results and add to table
      setTimeout(() => {
        setSearchResults((prev) => prev.filter((a) => a.id !== article.id));
        setAnalyzedArticles((prev) => [reviewed, ...prev]);
        setJustAnalyzedIds((prev) => {
          const next = new Set(prev);
          next.delete(article.id);
          return next;
        });
      }, 800);

      toast.success("Analysis complete", {
        description: `"${article.title.slice(0, 50)}..." has been analyzed.`,
      });
    } catch {
      setError("Failed to analyze article. Please try again.");
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(article.id);
        return next;
      });
    }
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="size-7 text-indigo-500" />
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
          <h2
            id="analyzed-heading"
            className="text-xl font-semibold text-foreground mb-4"
          >
            Analyzed Articles
          </h2>
          <AnalyzedTable
            articles={analyzedArticles}
            isLoading={isLoadingAnalyzed}
          />
        </section>
      </div>
    </main>
  );
}
