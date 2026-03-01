// ABOUTME: Dialog for cross-linking existing content to a topic.
// ABOUTME: Scans the knowledge database via AI, shows results with add/add-all options.

"use client";

import { useState } from "react";
import { Link2, Plus, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Candidate {
  id: string;
  title: string;
  summary: string;
}

interface CrosslinkDialogProps {
  slug: string;
  topicName: string;
  onLinked: () => void;
}

export function CrosslinkDialog({ slug, topicName, onLinked }: CrosslinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  async function handleScan() {
    setScanning(true);
    setError("");
    setCandidates(null);
    setLinked(new Set());

    try {
      const res = await fetch(`/api/topics/${slug}/crosslink`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data: Candidate[] = await res.json();
      setCandidates(data);
    } catch {
      setError("Failed to scan content. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  async function linkItem(id: string) {
    const res = await fetch(`/api/content/${id}`);
    if (!res.ok) return;
    const item = await res.json();
    const newTopics = [...new Set([...item.topics, topicName])];

    await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: newTopics }),
    });

    setLinked((prev) => new Set(prev).add(id));
    onLinked();
  }

  async function linkAll() {
    if (!candidates) return;
    const unlinked = candidates.filter((c) => !linked.has(c.id));
    await Promise.all(unlinked.map((c) => linkItem(c.id)));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setCandidates(null); setLinked(new Set()); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="h-4 w-4 mr-1" />
          Cross Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Cross Link: {topicName}</DialogTitle>
          <DialogDescription>
            Scan your knowledge database for existing content related to this topic.
          </DialogDescription>
        </DialogHeader>

        {!candidates && !scanning && (
          <div className="flex justify-center py-8">
            <Button onClick={handleScan}>
              <Link2 className="h-4 w-4 mr-2" />
              Scan Database
            </Button>
          </div>
        )}

        {scanning && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Analyzing summaries for connections to &ldquo;{topicName}&rdquo;...
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center py-4">{error}</p>
        )}

        {candidates && candidates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No related content found in your existing database.
          </p>
        )}

        {candidates && candidates.length > 0 && (
          <>
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm text-muted-foreground">
                Found {candidates.length} related {candidates.length === 1 ? "item" : "items"}
              </p>
              {candidates.some((c) => !linked.has(c.id)) && (
                <Button size="sm" onClick={linkAll}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add All
                </Button>
              )}
            </div>
            <div className="space-y-3 overflow-y-auto flex-1">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {c.summary.slice(0, 200)}...
                    </p>
                  </div>
                  {linked.has(c.id) ? (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => linkItem(c.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
