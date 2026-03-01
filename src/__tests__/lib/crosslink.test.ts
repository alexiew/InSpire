// ABOUTME: Tests for cross-link response parsing.
// ABOUTME: Verifies extraction of content IDs from Claude's JSON response.

import { describe, it, expect } from "vitest";
import { parseCrosslinkResponse } from "@/lib/crosslink";

describe("parseCrosslinkResponse", () => {
  it("extracts content IDs from a JSON response", () => {
    const raw = `Based on the summaries, these items relate to the topic:

\`\`\`json
["id-abc", "id-def"]
\`\`\``;

    const result = parseCrosslinkResponse(raw, ["id-abc", "id-def", "id-ghi"]);
    expect(result).toEqual(["id-abc", "id-def"]);
  });

  it("filters out IDs not in the candidate list", () => {
    const raw = '```json\n["id-abc", "id-fake"]\n```';
    const result = parseCrosslinkResponse(raw, ["id-abc", "id-def"]);
    expect(result).toEqual(["id-abc"]);
  });

  it("handles response with no JSON block", () => {
    const raw = "I don't think any of these relate to the topic.";
    const result = parseCrosslinkResponse(raw, ["id-abc"]);
    expect(result).toEqual([]);
  });

  it("handles empty JSON array", () => {
    const raw = "```json\n[]\n```";
    const result = parseCrosslinkResponse(raw, ["id-abc"]);
    expect(result).toEqual([]);
  });

  it("handles bare JSON array without fences", () => {
    const raw = '["id-abc", "id-def"]';
    const result = parseCrosslinkResponse(raw, ["id-abc", "id-def"]);
    expect(result).toEqual(["id-abc", "id-def"]);
  });
});
