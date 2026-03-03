// ABOUTME: API route for a single journal entry.
// ABOUTME: Supports updating text and deleting entries by ID.

import { NextRequest, NextResponse } from "next/server";
import { deleteJournalEntry, updateJournalText } from "@/lib/journal";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "text must be a non-empty string" }, { status: 400 });
  }

  const entry = updateJournalText(Number(id), body.text.trim());
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}

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
