// ABOUTME: Form for submitting a YouTube URL for processing.
// ABOUTME: Validates input and posts to the content API with optional extraction hints.

"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface UrlFormProps {
  onSubmitted: () => void;
  initialTopics?: string[];
}

export function UrlForm({ onSubmitted, initialTopics }: UrlFormProps) {
  const [url, setUrl] = useState("");
  const [hints, setHints] = useState("");
  const [showHints, setShowHints] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          ...(initialTopics?.length ? { topics: initialTopics } : {}),
          ...(hints.trim() ? { extractionHints: hints.trim() } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      setUrl("");
      setHints("");
      setShowHints(false);
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="Paste a YouTube URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="flex-1"
        />
        <Button
          type="button"
          variant={showHints ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setShowHints(!showHints)}
          title="Extraction hints"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Processing..." : "Process"}
        </Button>
      </div>
      {showHints && (
        <Textarea
          placeholder="Extraction hints (e.g., 'Include step-by-step instructions and tool configurations')"
          value={hints}
          onChange={(e) => setHints(e.target.value)}
          rows={2}
          className="text-sm"
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
