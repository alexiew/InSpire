// ABOUTME: Inline editor for adding and removing topics on a content item.
// ABOUTME: Autocompletes from existing topics, PATCHes the API on each change.

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Pencil, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopicBadge } from "./topic-badge";
import { useTopics } from "@/hooks/use-topics";

interface TopicEditorProps {
  contentId: string;
  topics: string[];
  onUpdated: () => void;
}

export function TopicEditor({ contentId, topics, onUpdated }: TopicEditorProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: allTopics } = useTopics();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!input.trim() || !allTopics) return [];
    const needle = input.toLowerCase().trim();
    return allTopics
      .map((t) => t.name)
      .filter(
        (name) =>
          name.toLowerCase().includes(needle) &&
          !topics.some((t) => t.toLowerCase() === name.toLowerCase())
      )
      .slice(0, 8);
  }, [input, allTopics, topics]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function patchTopics(newTopics: string[]) {
    await fetch(`/api/content/${contentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: newTopics }),
    });
    onUpdated();
  }

  function addTopic(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (topics.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    patchTopics([...topics, trimmed]);
    setInput("");
    setShowSuggestions(false);
  }

  function removeTopic(name: string) {
    patchTopics(topics.filter((t) => t !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTopic(suggestions[0]);
      } else {
        addTopic(input);
      }
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setInput("");
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {topics.map((t) => (
          <TopicBadge key={t} topic={t} />
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {topics.map((t) => (
          <Badge key={t} variant="outline" className="gap-1 pr-1">
            {t}
            <button
              onClick={() => removeTopic(t)}
              className="ml-0.5 rounded-full hover:bg-muted p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => {
            setEditing(false);
            setInput("");
          }}
        >
          <Check className="h-3 w-3 mr-1" />
          Done
        </Button>
      </div>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Add a topic..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
            {suggestions.map((name) => (
              <button
                key={name}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTopic(name);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
