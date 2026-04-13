// ABOUTME: Displays synthesis with generate/refresh button and version history.
// ABOUTME: Shared by topics and silos. Shows past syntheses as collapsible cards with PDF download.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectionJournal } from "@/components/content/selection-journal";
import { Sparkles, RefreshCw, ChevronDown, ChevronRight, Download } from "lucide-react";
import { downloadPdf } from "@/lib/pdf";
export interface SynthesisRecord {
  id: number;
  synthesis: string;
  contentIds: string[];
  createdAt: string;
}

interface SynthesisSectionProps {
  synthesizeUrl: string;
  name: string;
  sourceLabel: string;
  synthesis?: string;
  synthesizedAt?: string;
  synthesisHistory: SynthesisRecord[];
  itemCount: number;
  minItems?: number;
  onSynthesized: () => void;
  showSource?: boolean;
  onSource?: (text: string) => void;
}

function PastSynthesisCard({
  record,
  name,
  sourceLabel,
}: {
  record: SynthesisRecord;
  name: string;
  sourceLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(record.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="overflow-hidden">
      <button
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="text-sm font-medium">{dateStr}</span>
        <span className="text-xs text-muted-foreground">
          {record.contentIds.length} sources
        </span>
      </button>
      {expanded && (
        <div className="border-t px-6 py-4">
          <SelectionJournal source={sourceLabel}>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {record.synthesis}
            </div>
          </SelectionJournal>
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPdf(record.synthesis, name, record.createdAt, "synthesis")}
            >
              <Download className="mr-1 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function SynthesisSection({
  synthesizeUrl,
  name,
  sourceLabel,
  synthesis,
  synthesizedAt,
  synthesisHistory,
  itemCount,
  minItems = 2,
  onSynthesized,
  showSource,
  onSource,
}: SynthesisSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Past syntheses are all history records except the current one (most recent)
  const pastSyntheses = synthesisHistory.slice(1);

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    try {
      const res = await fetch(synthesizeUrl, {
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

  if (itemCount < minItems) {
    return (
      <p className="text-sm text-muted-foreground">
        Add at least {minItems} content {minItems === 1 ? "item" : "items"} to generate a synthesis.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Synthesis</h2>
        <div className="flex gap-2">
          {synthesis && synthesizedAt && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPdf(synthesis, name, synthesizedAt, "synthesis")}
            >
              <Download className="mr-1 h-4 w-4" />
              PDF
            </Button>
          )}
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
        <SelectionJournal source={sourceLabel} showSource={showSource} onSource={onSource}>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {synthesis}
          </div>
        </SelectionJournal>
      )}

      {synthesizedAt && !generating && (
        <p className="text-xs text-muted-foreground">
          Last generated: {new Date(synthesizedAt).toLocaleString()}
        </p>
      )}

      {pastSyntheses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Past Syntheses
          </h3>
          {pastSyntheses.map((record) => (
            <PastSynthesisCard
              key={record.id}
              record={record}
              name={name}
              sourceLabel={sourceLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
