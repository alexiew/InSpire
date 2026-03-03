// ABOUTME: Displays topic synthesis with generate/refresh button.
// ABOUTME: Handles synthesis generation state and caching.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";

interface SynthesisSectionProps {
  slug: string;
  synthesis?: string;
  synthesizedAt?: string;
  itemCount: number;
  onSynthesized: () => void;
}

export function SynthesisSection({
  slug,
  synthesis,
  synthesizedAt,
  itemCount,
  onSynthesized,
}: SynthesisSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    try {
      const res = await fetch(`/api/topics/${slug}/synthesize`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate synthesis");
        return;
      }

      onSynthesized();
    } catch {
      setError("Failed to generate synthesis");
    } finally {
      setGenerating(false);
    }
  }

  if (itemCount < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Add at least 2 content items to this topic to generate a synthesis.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Synthesis</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : synthesis ? (
            <>
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </>
          ) : (
            <>
              <Sparkles className="mr-1 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className={`text-sm ${error.includes("up to date") ? "text-muted-foreground" : "text-destructive"}`}>
          {error}
        </p>
      )}

      {generating && !synthesis && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Analyzing claims across sources... This may take a minute.
        </p>
      )}

      {synthesis && (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
          {synthesis}
        </div>
      )}

      {synthesizedAt && !generating && (
        <p className="text-xs text-muted-foreground">
          Last generated: {new Date(synthesizedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
