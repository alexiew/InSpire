// ABOUTME: Newsroom dashboard showing intelligence briefings with topic velocity.
// ABOUTME: Displays tiered analysis (Conservative/Bold/Moonshot) and topic direction indicators.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Zap, X, ChevronDown, ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectionJournal } from "@/components/content/selection-journal";
import { useNewsroom } from "@/hooks/use-newsroom";
import type { Briefing } from "@/lib/briefing";

interface DisplayVelocity {
  slug: string;
  name: string;
  contentCount: number;
  newCount: number;
  previousNewCount: number;
  hasSynthesis: boolean;
}

const MAX_VELOCITY_CARDS = 7;

function selectDisplayTopics(velocities: DisplayVelocity[]): DisplayVelocity[] {
  // Rising: has new content now
  const rising = velocities
    .filter((v) => v.newCount > 0)
    .sort((a, b) => b.newCount - a.newCount);

  // Cooling: had new content last briefing, but none now
  const cooling = velocities
    .filter((v) => v.newCount === 0 && v.previousNewCount > 0)
    .sort((a, b) => b.previousNewCount - a.previousNewCount);

  // Fill up to MAX: rising first, then cooling
  const result: DisplayVelocity[] = [];
  const risingSlots = Math.min(rising.length, Math.ceil(MAX_VELOCITY_CARDS / 2));
  const coolingSlots = Math.min(cooling.length, MAX_VELOCITY_CARDS - risingSlots);
  const extraRising = Math.min(rising.length - risingSlots, MAX_VELOCITY_CARDS - risingSlots - coolingSlots);

  result.push(...rising.slice(0, risingSlots + extraRising));
  result.push(...cooling.slice(0, coolingSlots));
  return result;
}

function VelocityCard({ topic }: { topic: DisplayVelocity }) {
  const isRising = topic.newCount > 0;
  const isCooling = topic.newCount === 0 && topic.previousNewCount > 0;

  let bgClass = "bg-muted/30";
  let textClass = "text-muted-foreground";
  let indicator = "— ";

  if (isRising) {
    bgClass = "bg-green-500/10 border-green-500/30";
    textClass = "text-green-600 dark:text-green-400";
    indicator = `+${topic.newCount} ▲`;
  } else if (isCooling) {
    bgClass = "bg-red-500/10 border-red-500/30";
    textClass = "text-red-600 dark:text-red-400";
    indicator = `▼ was +${topic.previousNewCount}`;
  }

  return (
    <Link href={`/topics/${topic.slug}`}>
      <Card
        className={`flex flex-col items-center justify-center p-3 min-w-[100px] text-center transition-colors hover:border-primary/50 ${bgClass}`}
      >
        <span className="text-xs font-medium truncate w-full">{topic.name}</span>
        <span className={`text-sm font-bold ${textClass}`}>
          {indicator}
        </span>
        <span className="text-xs text-muted-foreground">{topic.contentCount} total</span>
      </Card>
    </Link>
  );
}

function PastBriefingCard({ briefing, onExplain }: { briefing: Briefing; onExplain: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span className="text-sm font-medium">
          {new Date(briefing.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        </span>
        <span className="text-xs text-muted-foreground">
          {briefing.topicSnapshot.length} topics
        </span>
      </button>
      {expanded && (
        <div className="border-t px-6 py-4">
          <SelectionJournal showExplain onExplain={onExplain}>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {briefing.content}
            </div>
          </SelectionJournal>
        </div>
      )}
    </Card>
  );
}

export default function NewsroomPage() {
  const { data, mutate } = useNewsroom();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{ text: string; content: string } | null>(null);
  const [explaining, setExplaining] = useState(false);

  const briefing = data?.briefing ?? null;
  const velocities = (data?.velocities ?? []) as DisplayVelocity[];
  const history = data?.history ?? [];
  const pastBriefings = history.slice(1);
  const displayTopics = selectDisplayTopics(velocities);

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

  async function handleExplain(text: string) {
    setExplaining(true);
    setExplanation(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to explain");
        return;
      }

      setExplanation({ text, content: json.explanation });
    } catch {
      setError("Failed to explain selection");
    } finally {
      setExplaining(false);
    }
  }

  const totalNew = velocities.reduce((sum, v) => sum + v.newCount, 0);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">Newsroom</h1>
        <div className="flex gap-2">
          {briefing && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          )}
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
      </div>

      {displayTopics.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 print:hidden">
          {displayTopics.map((topic) => (
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
        <Card className="p-6 print:border-0 print:shadow-none print:p-0">
          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-bold">InSpire Briefing</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(briefing.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <SelectionJournal showExplain onExplain={handleExplain}>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {briefing.content}
            </div>
          </SelectionJournal>

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground border-t pt-3 print:hidden">
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

      {explaining && (
        <Card className="p-6 border-primary/30 bg-primary/5 print:hidden">
          <p className="text-sm text-muted-foreground animate-pulse">
            <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
            Explaining...
          </p>
        </Card>
      )}

      {explanation && (
        <Card className="p-6 border-primary/30 bg-primary/5 print:hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <p className="text-xs font-medium text-primary">
                Explaining: &ldquo;{explanation.text.slice(0, 100)}{explanation.text.length > 100 ? "..." : ""}&rdquo;
              </p>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {explanation.content}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => setExplanation(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {pastBriefings.length > 0 && (
        <div className="space-y-3 print:hidden">
          <h2 className="text-sm font-medium text-muted-foreground">Past Briefings</h2>
          {pastBriefings.map((past) => (
            <PastBriefingCard key={past.id} briefing={past} onExplain={handleExplain} />
          ))}
        </div>
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
