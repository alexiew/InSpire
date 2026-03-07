// ABOUTME: Form for submitting content via URL or pasted transcript.
// ABOUTME: Supports YouTube videos, blog articles, podcast episodes, and manual transcript import.

"use client";

import { useState } from "react";
import { Settings2, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface UrlFormProps {
  onSubmitted: () => void;
  initialTopics?: string[];
  apiEndpoint?: string;
}

export function UrlForm({ onSubmitted, initialTopics, apiEndpoint = "/api/content" }: UrlFormProps) {
  const [mode, setMode] = useState<"url" | "paste">("url");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [hints, setHints] = useState("");
  const [showHints, setShowHints] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = mode === "paste"
        ? {
            title,
            transcript,
            ...(initialTopics?.length ? { topics: initialTopics } : {}),
            ...(hints.trim() ? { extractionHints: hints.trim() } : {}),
          }
        : {
            url,
            ...(initialTopics?.length ? { topics: initialTopics } : {}),
            ...(hints.trim() ? { extractionHints: hints.trim() } : {}),
          };

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      setUrl("");
      setTitle("");
      setTranscript("");
      setHints("");
      setShowHints(false);
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = mode === "paste"
    ? title.trim() && transcript.trim()
    : url.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {mode === "url" ? (
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="Paste a URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMode("paste")}
            title="Paste transcript instead"
          >
            <ClipboardPaste className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={showHints ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowHints(!showHints)}
            title="Extraction hints"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button type="submit" disabled={submitting || !canSubmit}>
            {submitting ? "Processing..." : "Process"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setMode("url")}
            >
              URL mode
            </Button>
            <Button
              type="button"
              variant={showHints ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setShowHints(!showHints)}
              title="Extraction hints"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button type="submit" disabled={submitting || !canSubmit}>
              {submitting ? "Processing..." : "Process"}
            </Button>
          </div>
          <Textarea
            placeholder="Paste transcript or article text..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={6}
            className="text-sm"
          />
        </div>
      )}
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
