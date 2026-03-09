// ABOUTME: API route for identifying source content behind a selected passage.
// ABOUTME: Takes selected text and content IDs, asks Claude to attribute sources.

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";
import { loadSourceCandidates, buildSourcePrompt } from "@/lib/source";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json(
      { error: "text must be a non-empty string" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.contentIds) || body.contentIds.length === 0) {
    return NextResponse.json(
      { error: "contentIds must be a non-empty array" },
      { status: 400 }
    );
  }

  try {
    const candidates = loadSourceCandidates(body.contentIds, body.text);
    if (candidates.length === 0) {
      return NextResponse.json({ sources: [] });
    }

    const prompt = buildSourcePrompt(body.text, candidates);
    const raw = await callClaude(prompt);

    // Parse JSON from Claude's response (may be wrapped in markdown code fences)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const sources = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({ sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
