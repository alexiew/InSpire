// ABOUTME: Floating "Add to Journal" button that appears on text selection.
// ABOUTME: Captures selected text and saves it as a journal entry linked to the source content.

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectionJournalProps {
  contentId: string;
  children: React.ReactNode;
}

export function SelectionJournal({ contentId, children }: SelectionJournalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [saved, setSaved] = useState(false);

  const handleMouseUp = useCallback(() => {
    // Small delay to let the browser finalize the selection
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (!text || !containerRef.current) {
        return;
      }

      // Verify selection is within our container
      const range = selection!.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        return;
      }

      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setPosition({
        top: rect.bottom - containerRect.top + 4,
        left: rect.left - containerRect.left + rect.width / 2,
      });
      setSelectedText(text);
      setSaved(false);
    }, 10);
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Hide button when clicking outside of it
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setPosition(null);
        setSelectedText("");
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [handleMouseDown]);

  async function handleSave() {
    if (!selectedText) return;

    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, text: selectedText }),
    });

    setSaved(true);
    setTimeout(() => {
      setPosition(null);
      setSelectedText("");
      setSaved(false);
    }, 1000);
  }

  return (
    <div ref={containerRef} className="relative" onMouseUp={handleMouseUp}>
      {children}
      {position && (
        <div
          ref={buttonRef}
          className="absolute z-50"
          style={{
            top: position.top,
            left: position.left,
            transform: "translateX(-50%)",
          }}
        >
          <Button
            size="sm"
            variant={saved ? "outline" : "default"}
            className="shadow-md text-xs h-7 gap-1"
            onClick={handleSave}
            disabled={saved}
          >
            {saved ? (
              <>
                <Check className="h-3 w-3" />
                Saved
              </>
            ) : (
              <>
                <BookmarkPlus className="h-3 w-3" />
                Add to Journal
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
