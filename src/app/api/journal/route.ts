// ABOUTME: API route for journal entries.
// ABOUTME: Lists all entries and creates new ones from text selections.

import { NextRequest, NextResponse } from "next/server";
import { listJournalEntries, createJournalEntry } from "@/lib/journal";

export function GET() {
  return NextResponse.json(listJournalEntries());
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json(
      { error: "text must be a non-empty string" },
      { status: 400 }
    );
  }

  const contentId = typeof body.contentId === "string" ? body.contentId : null;
  const entry = createJournalEntry(contentId, body.text.trim());
  return NextResponse.json(entry, { status: 201 });
}
