// ABOUTME: Journal page showing personal text highlights from content.
// ABOUTME: Entries are grouped by date with links back to source content.

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJournal } from "@/hooks/use-journal";

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const toDateKey = (d: Date) => d.toISOString().split("T")[0];

  if (toDateKey(date) === toDateKey(today)) return "Today";
  if (toDateKey(date) === toDateKey(yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function JournalPage() {
  const { data: entries, mutate } = useJournal();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingId !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(draft.length, draft.length);
    }
  }, [editingId]);

  function startEditing(id: number, text: string) {
    setEditingId(id);
    setDraft(text);
  }

  async function saveEdit() {
    if (editingId === null || !draft.trim()) return;
    await fetch(`/api/journal/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft.trim() }),
    });
    setEditingId(null);
    mutate();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/journal/${id}`, { method: "DELETE" });
    mutate();
  }

  if (!entries) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Group entries by date
  const groups: { label: string; entries: typeof entries }[] = [];
  let currentLabel = "";

  for (const entry of entries) {
    const label = formatDateGroup(entry.createdAt);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, entries: [] });
    }
    groups[groups.length - 1].entries.push(entry);
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      <h1 className="text-2xl font-bold">Journal</h1>

      {entries.length === 0 && (
        <p className="text-muted-foreground">
          No entries yet. Select text on any content page to add highlights.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label} className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {group.label}
          </h2>
          {group.entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-md border p-4 space-y-2"
            >
              {editingId === entry.id ? (
                <div className="space-y-2">
                  <textarea
                    ref={textareaRef}
                    className="w-full rounded border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={4}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={saveEdit}>
                      <Check className="h-3 w-3" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <blockquote className="text-sm border-l-2 border-primary pl-3 italic whitespace-pre-wrap">
                  {entry.text}
                </blockquote>
              )}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {entry.contentId && entry.contentTitle ? (
                    <Link
                      href={`/content/${entry.contentId}`}
                      className="hover:underline text-primary"
                    >
                      {entry.contentTitle}
                    </Link>
                  ) : (
                    <span>
                      {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {editingId !== entry.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => startEditing(entry.id, entry.text)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
