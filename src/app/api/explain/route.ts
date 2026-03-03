// ABOUTME: API route for elaborating on selected text from briefings.
// ABOUTME: Sends selected text to Claude for deeper explanation and context.

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json(
      { error: "text must be a non-empty string" },
      { status: 400 }
    );
  }

  const prompt = `The user selected the following text from an intelligence briefing and wants a deeper explanation:

"${body.text.trim()}"

Provide a concise but thorough explanation. Cover:
- What this means and why it matters
- Key context and background
- Practical implications or actionable takeaways

Be specific and substantive. Keep it focused — 2-4 short paragraphs max.`;

  try {
    const explanation = await callClaude(prompt);
    return NextResponse.json({ explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
