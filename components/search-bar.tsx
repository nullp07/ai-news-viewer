"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export function SearchBar({ value, onChange, onSearch, isLoading }: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search news articles... (e.g. 'AI regulation', 'Tesla earnings')"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 h-11"
          aria-label="Search news articles"
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
  );
}
