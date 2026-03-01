// ABOUTME: Form for submitting a YouTube URL for processing.
// ABOUTME: Validates input and posts to the content API.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UrlFormProps {
  onSubmitted: () => void;
  initialTopics?: string[];
}

export function UrlForm({ onSubmitted, initialTopics }: UrlFormProps) {
  const [url, setUrl] = useState("");
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
        body: JSON.stringify({ url, ...(initialTopics?.length ? { topics: initialTopics } : {}) }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      setUrl("");
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="url"
        placeholder="Paste a YouTube URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        className="flex-1"
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? "Processing..." : "Process"}
      </Button>
      {error && <p className="text-sm text-destructive self-center">{error}</p>}
    </form>
  );
}
