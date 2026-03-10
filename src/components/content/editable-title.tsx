// ABOUTME: Inline click-to-edit title for content items.
// ABOUTME: Saves via PATCH to the content API on Enter or blur, Escape cancels.

"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";

interface EditableTitleProps {
  contentId: string;
  title: string;
  fallback: string;
  onUpdated: () => void;
  apiEndpoint?: string;
  className?: string;
}

export function EditableTitle({
  contentId,
  title,
  fallback,
  onUpdated,
  apiEndpoint,
  className = "",
}: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setValue(title);
  }, [title]);

  async function save() {
    const trimmed = value.trim();
    setEditing(false);
    if (trimmed === title) return;
    await fetch(apiEndpoint || `/api/content/${contentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    onUpdated();
  }

  function cancel() {
    setValue(title);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      cancel();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={`bg-transparent border-b border-primary outline-none w-full ${className}`}
      />
    );
  }

  return (
    <span
      className={`group/title cursor-pointer inline-flex items-center gap-1 ${className}`}
      onClick={() => setEditing(true)}
    >
      {title || <span className="text-muted-foreground">{fallback}</span>}
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
    </span>
  );
}
