// ABOUTME: API route for explaining selected briefing text using the knowledge base.
// ABOUTME: Searches for related content and syntheses, then asks Claude to explain grounded in sources.

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";
import { searchKnowledgeBase, buildExplainPrompt } from "@/lib/explain";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json(
      { error: "text must be a non-empty string" },
      { status: 400 }
    );
  }

  try {
    const context = searchKnowledgeBase(body.text);
    const prompt = buildExplainPrompt(body.text, context);
    const explanation = await callClaude(prompt);
    return NextResponse.json({ explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
