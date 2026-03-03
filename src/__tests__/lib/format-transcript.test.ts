// ABOUTME: Tests for transcript formatting from raw caption lines to readable paragraphs.
// ABOUTME: Verifies joining short lines, preserving speaker labels, and stripping headers.

import { describe, it, expect } from "vitest";
import { formatTranscript, transcriptStats } from "@/lib/format-transcript";

describe("formatTranscript", () => {
  it("joins short caption lines into flowing text", () => {
    const raw = `to the Huberman Lab podcast
where we discuss science
and science-based tools
for everyday life.`;

    const result = formatTranscript(raw);
    expect(result).toBe(
      "to the Huberman Lab podcast where we discuss science and science-based tools for everyday life."
    );
  });

  it("starts a new paragraph at speaker labels", () => {
    const raw = `something interesting
about the brain.
DAVID GOGGINS: Yeah that's
exactly what I mean
when I talk about it.
ANDREW HUBERMAN: So you're
saying the key is effort.`;

    const result = formatTranscript(raw);
    expect(result).toContain("something interesting about the brain.");
    expect(result).toContain("\n\nDAVID GOGGINS: Yeah that's exactly what I mean when I talk about it.");
    expect(result).toContain("\n\nANDREW HUBERMAN: So you're saying the key is effort.");
  });

  it("strips the leading 'Transcript:' header", () => {
    const raw = `Transcript:
Welcome to the show.
Today we discuss sleep.`;

    const result = formatTranscript(raw);
    expect(result).not.toContain("Transcript:");
    expect(result).toBe("Welcome to the show. Today we discuss sleep.");
  });

  it("preserves sentence-ending punctuation without extra spaces", () => {
    const raw = `This is important.
And this follows.
What about this?
Yes, absolutely!`;

    const result = formatTranscript(raw);
    expect(result).toBe(
      "This is important. And this follows. What about this? Yes, absolutely!"
    );
  });

  it("handles stage directions in brackets", () => {
    const raw = `[MUSIC PLAYING]
Welcome to the show.
[LAUGHTER]
That was funny.`;

    const result = formatTranscript(raw);
    expect(result).toBe("Welcome to the show. That was funny.");
  });

  it("handles empty or whitespace-only input", () => {
    expect(formatTranscript("")).toBe("");
    expect(formatTranscript("   \n\n  ")).toBe("");
  });

  it("collapses multiple spaces", () => {
    const raw = `this  has   extra
spaces   in it`;

    const result = formatTranscript(raw);
    expect(result).toBe("this has extra spaces in it");
  });
});

describe("transcriptStats", () => {
  it("counts words and estimates duration", () => {
    const text = Array(2000).fill("word").join(" ");
    const stats = transcriptStats(text);
    expect(stats.wordCount).toBe(2000);
    expect(stats.duration).toBe("10 min");
  });

  it("formats duration in hours and minutes", () => {
    const text = Array(15000).fill("word").join(" ");
    const stats = transcriptStats(text);
    expect(stats.wordCount).toBe(15000);
    expect(stats.duration).toBe("1h 15min");
  });

  it("returns zero stats for empty text", () => {
    const stats = transcriptStats("");
    expect(stats.wordCount).toBe(0);
    expect(stats.duration).toBe("0 min");
  });

  it("handles short transcripts", () => {
    const stats = transcriptStats("hello world");
    expect(stats.wordCount).toBe(2);
    expect(stats.duration).toBe("0 min");
  });
});
