// ABOUTME: Dialog for confirming a topic merge operation.
// ABOUTME: Shows selected topics, accepts a target name, and calls the merge API.

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Topic } from "@/lib/topics";

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: Topic[];
  onMerged: () => void;
}

export function MergeDialog({ open, onOpenChange, topics, onMerged }: MergeDialogProps) {
  const largest = topics.reduce((a, b) =>
    b.contentIds.length > a.contentIds.length ? b : a
  , topics[0]);
  const [name, setName] = useState(largest?.name ?? "");
  const [merging, setMerging] = useState(false);

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || topics.length < 2) return;

    setMerging(true);
    const res = await fetch("/api/topics/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slugs: topics.map((t) => t.slug),
        name: name.trim(),
      }),
    });

    setMerging(false);
    if (res.ok) {
      onOpenChange(false);
      onMerged();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Topics</DialogTitle>
          <DialogDescription>
            Combine {topics.length} topics into one. All content associations will be transferred.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Topics to merge:</p>
            <div className="flex flex-wrap gap-1">
              {topics.map((t) => (
                <span
                  key={t.slug}
                  className="text-xs bg-muted px-2 py-1 rounded"
                >
                  {t.name} ({t.contentIds.length})
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleMerge} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="merge-name" className="text-sm font-medium">
                Merged topic name
              </label>
              <Input
                id="merge-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Topic name..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || merging}>
                {merging && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Merge
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
