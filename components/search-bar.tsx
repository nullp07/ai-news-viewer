"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Clock, History, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchSuggestions } from "@/lib/api-client";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/lib/recent-searches";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

interface Suggestion {
  label: string;
  kind: "recent" | "history";
}

const DEBOUNCE_MS = 200;

export function SearchBar({ value, onChange, onSearch, isLoading }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [titleHits, setTitleHits] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setRecents(getRecentSearches());
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  // Debounced suggestions from Mongo (analyzed titles).
  useEffect(() => {
    abortRef.current?.abort();
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setTitleHits([]);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const handle = window.setTimeout(async () => {
      const hits = await fetchSuggestions(trimmed, ctrl.signal);
      setTitleHits(hits);
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(handle);
      ctrl.abort();
    };
  }, [value]);

  const suggestions: Suggestion[] = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    const seen = new Set<string>();
    const out: Suggestion[] = [];

    const filteredRecents = trimmed
      ? recents.filter((r) => r.toLowerCase().includes(trimmed))
      : recents;

    for (const r of filteredRecents.slice(0, 5)) {
      const key = r.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: r, kind: "recent" });
    }
    for (const t of titleHits) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: t, kind: "history" });
    }
    return out;
  }, [value, recents, titleHits]);

  const showDropdown = open && suggestions.length > 0;

  const commit = useCallback(
    (q: string) => {
      onChange(q);
      addRecentSearch(q);
      setRecents(getRecentSearches());
      setOpen(false);
      setHighlight(-1);
      // Defer so onChange has flushed before the parent reads the value.
      window.setTimeout(() => onSearch(), 0);
    },
    [onChange, onSearch],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    addRecentSearch(q);
    setRecents(getRecentSearches());
    setOpen(false);
    setHighlight(-1);
    onSearch();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      commit(suggestions[highlight].label);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search news articles... (e.g. 'AI regulation', 'Tesla earnings')"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
              setHighlight(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="pl-10 h-11"
            aria-label="Search news articles"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="search-suggestions"
            role="combobox"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="h-11 px-6 bg-indigo-500 hover:bg-indigo-600 text-white"
        >
          <Search className="size-4" />
          <span className="sr-only sm:not-sr-only sm:ml-2">Search</span>
        </Button>
      </form>

      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 mt-2 z-20 rounded-lg border bg-popover shadow-md overflow-hidden"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((s, i) => (
              <li key={`${s.kind}-${s.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep input focused
                    commit(s.label);
                  }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    i === highlight ? "bg-accent" : ""
                  }`}
                >
                  {s.kind === "recent" ? (
                    <Clock className="size-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <Sparkles className="size-3.5 text-indigo-500 shrink-0" />
                  )}
                  <span className="truncate">{s.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                    {s.kind === "recent" ? "Recent" : "Analyzed"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {recents.length > 0 && (
            <div className="border-t px-2 py-1.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <History className="size-3" />
                {recents.length} recent
              </span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  clearRecentSearches();
                  setRecents([]);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3" />
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
