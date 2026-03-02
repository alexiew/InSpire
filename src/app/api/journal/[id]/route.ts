// ABOUTME: API route for a single journal entry.
// ABOUTME: Supports deletion of journal entries by ID.

import { NextRequest, NextResponse } from "next/server";
import { deleteJournalEntry } from "@/lib/journal";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteJournalEntry(Number(id));
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
