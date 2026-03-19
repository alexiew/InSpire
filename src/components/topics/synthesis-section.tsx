// ABOUTME: Displays topic synthesis with generate/refresh button and version history.
// ABOUTME: Shows past syntheses as collapsible cards with PDF download support.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectionJournal } from "@/components/content/selection-journal";
import { Sparkles, RefreshCw, ChevronDown, ChevronRight, Download } from "lucide-react";
import type { SynthesisRecord } from "@/lib/topics";

interface SynthesisSectionProps {
  slug: string;
  topicName: string;
  synthesis?: string;
  synthesizedAt?: string;
  synthesisHistory: SynthesisRecord[];
  itemCount: number;
  onSynthesized: () => void;
}

async function downloadPdf(content: string, title: string, date: string) {
  const html2pdf = (await import("html2pdf.js")).default;

  const container = document.createElement("div");
  container.style.padding = "40px";
  container.style.fontFamily = "system-ui, sans-serif";
  container.style.fontSize = "14px";
  container.style.lineHeight = "1.6";
  container.style.color = "#1a1a1a";
  container.innerHTML = `
    <h1 style="font-size: 22px; margin-bottom: 4px;">${title}</h1>
    <p style="color: #666; font-size: 12px; margin-bottom: 24px;">${date}</p>
    <div style="white-space: pre-wrap;">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  `;

  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-synthesis-${new Date(date).toISOString().slice(0, 10)}.pdf`;

  html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(container)
    .save();
}

function PastSynthesisCard({
  record,
  topicName,
  slug,
}: {
  record: SynthesisRecord;
  topicName: string;
  slug: string;
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
          <SelectionJournal source={`topic:${slug}`}>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {record.synthesis}
            </div>
          </SelectionJournal>
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPdf(record.synthesis, topicName, record.createdAt)}
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
  slug,
  topicName,
  synthesis,
  synthesizedAt,
  synthesisHistory,
  itemCount,
  onSynthesized,
}: SynthesisSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Past syntheses are all history records except the current one (most recent)
  const pastSyntheses = synthesisHistory.slice(1);

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
        <div className="flex gap-2">
          {synthesis && synthesizedAt && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPdf(synthesis, topicName, synthesizedAt)}
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
        <SelectionJournal source={`topic:${slug}`}>
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
              topicName={topicName}
              slug={slug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
