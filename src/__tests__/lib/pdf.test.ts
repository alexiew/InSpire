// ABOUTME: Tests for PDF content formatting utilities.
// ABOUTME: Verifies markdown assembly from content items and filename generation.

import { describe, it, expect } from "vitest";
import { formatContentAsMarkdown, pdfFilename } from "@/lib/pdf";

describe("pdfFilename", () => {
  it("slugifies the title and appends the date", () => {
    expect(pdfFilename("My Great Topic", "2026-04-10T12:00:00Z")).toBe(
      "my-great-topic-2026-04-10.pdf"
    );
  });

  it("strips special characters", () => {
    expect(pdfFilename("Hello, World! (2026)", "2026-01-15T00:00:00Z")).toBe(
      "hello-world-2026-2026-01-15.pdf"
    );
  });

  it("accepts an optional label suffix", () => {
    expect(pdfFilename("Topic A", "2026-04-10T12:00:00Z", "synthesis")).toBe(
      "topic-a-synthesis-2026-04-10.pdf"
    );
  });
});

describe("formatContentAsMarkdown", () => {
  const baseItem = {
    title: "Test Title",
    author: "Jane Doe",
    url: "https://example.com/article",
    sourceType: "blog" as const,
    summary: "This is the summary text.",
    claims: ["Claim one", "Claim two"],
    topics: ["AI", "Robotics"],
    people: ["Alice", "Bob"],
  };

  it("includes the author", () => {
    const md = formatContentAsMarkdown(baseItem);
    expect(md).toContain("Jane Doe");
  });

  it("includes the source URL", () => {
    const md = formatContentAsMarkdown(baseItem);
    expect(md).toContain("https://example.com/article");
  });

  it("includes topics", () => {
    const md = formatContentAsMarkdown(baseItem);
    expect(md).toContain("AI");
    expect(md).toContain("Robotics");
  });

  it("includes claims as a list", () => {
    const md = formatContentAsMarkdown(baseItem);
    expect(md).toContain("Claim one");
    expect(md).toContain("Claim two");
  });

  it("includes the summary", () => {
    const md = formatContentAsMarkdown(baseItem);
    expect(md).toContain("This is the summary text.");
  });

  it("includes people", () => {
    const md = formatContentAsMarkdown(baseItem);
    expect(md).toContain("Alice");
    expect(md).toContain("Bob");
  });

  it("omits sections with empty data", () => {
    const md = formatContentAsMarkdown({
      ...baseItem,
      claims: [],
      people: [],
      author: "",
    });
    expect(md).not.toContain("Key Claims");
    expect(md).not.toContain("People");
    expect(md).not.toContain("Author");
  });
});
