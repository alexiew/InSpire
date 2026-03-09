// ABOUTME: Floating toolbar that appears on text selection.
// ABOUTME: Offers Journal, Lookup, Explain, and Show Source actions for selected text.

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { BookmarkPlus, Check, Search, Sparkles, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectionJournalProps {
  contentId?: string | null;
  source?: string;
  showExplain?: boolean;
  onExplain?: (text: string) => void;
  showSource?: boolean;
  onSource?: (text: string) => void;
  children: React.ReactNode;
}

export function SelectionJournal({ contentId, source, showExplain, onExplain, showSource, onSource, children }: SelectionJournalProps) {
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
      body: JSON.stringify({ contentId: contentId ?? null, text: selectedText, source }),
    });

    setSaved(true);
    setTimeout(() => {
      setPosition(null);
      setSelectedText("");
      setSaved(false);
    }, 1000);
  }

  function handleExplain() {
    if (!selectedText || !onExplain) return;
    onExplain(selectedText);
    setPosition(null);
    setSelectedText("");
  }

  function handleSource() {
    if (!selectedText || !onSource) return;
    onSource(selectedText);
    setPosition(null);
    setSelectedText("");
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
          <div className="flex gap-1">
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
                  Journal
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="shadow-md text-xs h-7 gap-1"
              asChild
            >
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(selectedText)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Search className="h-3 w-3" />
                Lookup
              </a>
            </Button>
            {showExplain && onExplain && (
              <Button
                size="sm"
                variant="outline"
                className="shadow-md text-xs h-7 gap-1"
                onClick={handleExplain}
              >
                <Sparkles className="h-3 w-3" />
                Explain
              </Button>
            )}
            {showSource && onSource && (
              <Button
                size="sm"
                variant="outline"
                className="shadow-md text-xs h-7 gap-1"
                onClick={handleSource}
              >
                <FileSearch className="h-3 w-3" />
                Source
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
