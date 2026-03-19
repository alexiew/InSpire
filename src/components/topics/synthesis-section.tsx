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
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const footerY = pageHeight - 8;
  let y = margin;

  function addFooter() {
    const prevFontSize = doc.getFontSize();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160);
    doc.text("InSpire", margin, footerY);
    const pageNum = `${doc.getNumberOfPages()}`;
    doc.text(pageNum, pageWidth - margin, footerY, { align: "right" });
    doc.setTextColor(0);
    doc.setFontSize(prevFontSize);
    doc.setFont("helvetica", "normal");
  }

  function checkPageBreak(needed: number) {
    if (y + needed > footerY - 4) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  }

  // Header — branding
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80);
  doc.text("InSpire", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140);
  doc.text("Simple solutions to impossible problems", margin, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  doc.setTextColor(0);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(title, maxWidth);
  checkPageBreak(titleLines.length * 8);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8;

  // Date
  const dateStr = new Date(date).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(dateStr, margin, y);
  y += 8;
  doc.setTextColor(0);

  // Content — line by line with basic markdown support
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.startsWith("### ")) {
      y += 3;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      const wrapped = doc.splitTextToSize(line.slice(4), maxWidth);
      checkPageBreak(wrapped.length * 5.5);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5.5 + 1;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
    } else if (line.startsWith("## ")) {
      y += 5;
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      const wrapped = doc.splitTextToSize(line.slice(3), maxWidth);
      checkPageBreak(wrapped.length * 6.5);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 6.5 + 2;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
    } else if (line.startsWith("# ")) {
      y += 5;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const wrapped = doc.splitTextToSize(line.slice(2), maxWidth);
      checkPageBreak(wrapped.length * 7.5);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 7.5 + 2;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
    } else if (line.trim() === "") {
      y += 3;
    } else {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const text = line.replace(/\*\*(.*?)\*\*/g, "$1");
      const wrapped = doc.splitTextToSize(text, maxWidth);
      checkPageBreak(wrapped.length * 5);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5;
    }
  }

  // Footer on the last page
  addFooter();

  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-synthesis-${new Date(date).toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
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
