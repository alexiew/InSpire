// ABOUTME: Journal page showing personal text highlights from content.
// ABOUTME: Entries are grouped by date with links back to source content.

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJournal } from "@/hooks/use-journal";
import type { JournalEntry } from "@/lib/journal";

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

function NoteEditor({ entry, onSaved }: { entry: JournalEntry; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.note ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(draft.length, draft.length);
    }
  }, [editing]);

  async function save() {
    const trimmed = draft.trim();
    await fetch(`/api/journal/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: trimmed || null }),
    });
    setEditing(false);
    onSaved();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setDraft(entry.note ?? "");
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <textarea
          ref={textareaRef}
          className="w-full rounded border bg-background px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          placeholder="Write a note..."
        />
        <p className="text-xs text-muted-foreground">Esc to cancel</p>
      </div>
    );
  }

  if (entry.note) {
    return (
      <button
        className="text-sm text-left w-full whitespace-pre-wrap hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
        onClick={() => { setDraft(entry.note ?? ""); setEditing(true); }}
      >
        {entry.note}
      </button>
    );
  }

  return (
    <button
      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      onClick={() => { setDraft(""); setEditing(true); }}
    >
      <Pencil className="h-3 w-3" />
      Add note...
    </button>
  );
}

export default function JournalPage() {
  const { data: entries, mutate } = useJournal();

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
              <blockquote className="text-sm border-l-2 border-primary pl-3 italic whitespace-pre-wrap">
                {entry.text}
              </blockquote>
              <NoteEditor entry={entry} onSaved={() => mutate()} />
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
          ))}
        </div>
      ))}
    </div>
  );
}
