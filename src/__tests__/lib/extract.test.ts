// ABOUTME: Tests for structured extraction output parsing and prompt construction.
// ABOUTME: Verifies that markdown + JSON output is correctly split and parsed.

import { describe, it, expect } from "vitest";
import { parseExtraction, buildExtractionPrompt } from "@/lib/extract";

describe("parseExtraction", () => {
  it("parses markdown summary with trailing JSON block", () => {
    const raw = `## Summary

This video covers longevity research and vitamin D.

### Key Points
- Vitamin D is essential for immune function
- Most people are deficient

\`\`\`json
{
  "topics": ["longevity", "vitamin D"],
  "claims": ["Vitamin D is essential for immune function", "Most people are deficient in vitamin D"],
  "people": ["Dr. Seheult"]
}
\`\`\``;

    const result = parseExtraction(raw);
    expect(result.summary).toContain("This video covers longevity research");
    expect(result.summary).toContain("Most people are deficient");
    expect(result.summary).not.toContain('"topics"');
    expect(result.topics).toEqual(["longevity", "vitamin D"]);
    expect(result.claims).toEqual([
      "Vitamin D is essential for immune function",
      "Most people are deficient in vitamin D",
    ]);
    expect(result.people).toEqual(["Dr. Seheult"]);
  });

  it("handles JSON block without json language tag", () => {
    const raw = `Summary text here.

\`\`\`
{"topics": ["AI"], "claims": ["LLMs can reason"], "people": ["Ilya Sutskever"]}
\`\`\``;

    const result = parseExtraction(raw);
    expect(result.summary).toBe("Summary text here.");
    expect(result.topics).toEqual(["AI"]);
  });

  it("returns empty arrays when no JSON block found", () => {
    const raw = "Just a plain summary with no metadata block.";
    const result = parseExtraction(raw);
    expect(result.summary).toBe("Just a plain summary with no metadata block.");
    expect(result.topics).toEqual([]);
    expect(result.claims).toEqual([]);
    expect(result.people).toEqual([]);
  });

  it("handles malformed JSON gracefully", () => {
    const raw = `Summary text.

\`\`\`json
{not valid json}
\`\`\``;

    const result = parseExtraction(raw);
    expect(result.summary).toBe("Summary text.");
    expect(result.topics).toEqual([]);
    expect(result.claims).toEqual([]);
    expect(result.people).toEqual([]);
  });

  it("uses the last JSON block if multiple exist", () => {
    const raw = `Summary with a code example:

\`\`\`json
{"example": "this is not metadata"}
\`\`\`

More summary text.

\`\`\`json
{"topics": ["metabolism"], "claims": ["Fasting boosts autophagy"], "people": []}
\`\`\``;

    const result = parseExtraction(raw);
    expect(result.summary).toContain("More summary text.");
    expect(result.topics).toEqual(["metabolism"]);
    expect(result.claims).toEqual(["Fasting boosts autophagy"]);
  });

  it("trims whitespace from summary", () => {
    const raw = `
  Summary with extra whitespace.

\`\`\`json
{"topics": ["test"], "claims": [], "people": []}
\`\`\`  `;

    const result = parseExtraction(raw);
    expect(result.summary).toBe("Summary with extra whitespace.");
  });
});

describe("buildExtractionPrompt", () => {
  it("builds a prompt without existing topics section when none provided", () => {
    const prompt = buildExtractionPrompt("Test Title", "Some transcript text");
    expect(prompt).toContain("Test Title");
    expect(prompt).toContain("Some transcript text");
    expect(prompt).not.toContain("knowledge base already contains");
  });

  it("builds a prompt without existing topics section when empty array provided", () => {
    const prompt = buildExtractionPrompt("Test Title", "Some transcript text", []);
    expect(prompt).not.toContain("knowledge base already contains");
  });

  it("includes existing topics in the prompt when provided", () => {
    const topics = ["longevity", "neuroplasticity", "intermittent fasting"];
    const prompt = buildExtractionPrompt("Test Title", "Some transcript text", topics);
    expect(prompt).toContain("knowledge base already contains these topics");
    expect(prompt).toContain("longevity, neuroplasticity, intermittent fasting");
    expect(prompt).toContain("REUSE existing topics");
  });
});
