"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface NlqBarProps {
  onSubmit: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

export function NlqBar({
  onSubmit,
  isLoading = false,
  placeholder = "Ask a question about your data...",
  suggestions,
  className = "",
}: NlqBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setQuery("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  return (
    <div
      className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border shadow-sm p-3 ${className}`}
    >
      <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
        <div className="flex-shrink-0 text-indigo-500">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="flex-shrink-0 p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 ml-7">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs bg-white border rounded-full px-2 py-0.5 text-gray-600 hover:bg-blue-50 hover:text-gray-800 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
