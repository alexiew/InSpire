// ABOUTME: Collapsible transcript viewer with search highlighting.
// ABOUTME: Formats raw caption text into readable paragraphs.

"use client";

import { useState, useMemo } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatTranscript, transcriptStats } from "@/lib/format-transcript";

interface TranscriptSectionProps {
  transcript: string;
}

export function TranscriptSection({ transcript }: TranscriptSectionProps) {
  const [search, setSearch] = useState("");
  const formatted = useMemo(() => formatTranscript(transcript), [transcript]);
  const stats = useMemo(() => transcriptStats(formatted), [formatted]);

  const matchCount = useMemo(() => {
    if (!search.trim()) return 0;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    return (formatted.match(regex) || []).length;
  }, [formatted, search]);

  function highlightText(text: string) {
    if (!search.trim()) return text;

    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>
            Full Transcript
            <span className="ml-2 text-muted-foreground font-normal">
              {stats.wordCount.toLocaleString()} words · ~{stats.duration}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcript..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search.trim() && (
              <span className="absolute right-2.5 top-2.5 text-xs text-muted-foreground">
                {matchCount} {matchCount === 1 ? "match" : "matches"}
              </span>
            )}
          </div>
          <div className="rounded-md border p-4 text-sm text-muted-foreground max-h-96 overflow-y-auto">
            {formatted.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-3 last:mb-0">
                {highlightText(paragraph)}
              </p>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
