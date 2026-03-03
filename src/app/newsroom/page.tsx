// ABOUTME: Newsroom dashboard showing intelligence briefings with topic velocity.
// ABOUTME: Displays tiered analysis (Conservative/Bold/Moonshot) and topic direction indicators.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNewsroom } from "@/hooks/use-newsroom";
import type { TopicVelocity } from "@/lib/briefing";

function VelocityCard({ topic }: { topic: TopicVelocity }) {
  const isHot = topic.newCount > 0;

  return (
    <Link href={`/topics/${topic.slug}`}>
      <Card
        className={`flex flex-col items-center justify-center p-3 min-w-[100px] text-center transition-colors hover:border-primary/50 ${
          isHot ? "bg-green-500/10 border-green-500/30" : "bg-muted/30"
        }`}
      >
        <span className="text-xs font-medium truncate w-full">{topic.name}</span>
        <span className={`text-sm font-bold ${isHot ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
          {isHot ? `+${topic.newCount} ▲` : "— "}
        </span>
        <span className="text-xs text-muted-foreground">{topic.contentCount} total</span>
      </Card>
    </Link>
  );
}

export default function NewsroomPage() {
  const { data, mutate } = useNewsroom();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const briefing = data?.briefing ?? null;
  const velocities = data?.velocities ?? [];

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/newsroom", { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to generate briefing");
        return;
      }

      mutate();
    } catch {
      setError("Failed to generate briefing");
    } finally {
      setGenerating(false);
    }
  }

  const totalNew = velocities.reduce((sum, v) => sum + v.newCount, 0);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Newsroom</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Generate Briefing
            </>
          )}
        </Button>
      </div>

      {velocities.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {velocities.map((topic) => (
            <VelocityCard key={topic.slug} topic={topic} />
          ))}
        </div>
      )}

      {error && (
        <p className={`text-sm ${error.includes("No new content") ? "text-muted-foreground" : "text-destructive"}`}>
          {error}
        </p>
      )}

      {generating && !briefing && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Analyzing your knowledge base... This may take a minute.
        </p>
      )}

      {briefing && (
        <Card className="p-6">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {briefing.content}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
            <span>
              Generated {new Date(briefing.createdAt).toLocaleString()}
            </span>
            <span>
              {briefing.topicSnapshot.length} topics
            </span>
            {totalNew > 0 && (
              <span>{totalNew} new items since last briefing</span>
            )}
          </div>
        </Card>
      )}

      {!briefing && !generating && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No briefings yet. Generate your first intelligence briefing to see trend analysis across your knowledge base.
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            <Zap className="mr-2 h-4 w-4" />
            Generate First Briefing
          </Button>
        </Card>
      )}
    </div>
  );
}
