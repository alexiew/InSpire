// ABOUTME: API route for a single journal entry.
// ABOUTME: Supports updating notes and deleting entries by ID.

import { NextRequest, NextResponse } from "next/server";
import { deleteJournalEntry, updateJournalNote } from "@/lib/journal";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const note = typeof body.note === "string" ? body.note : null;
  const entry = updateJournalNote(Number(id), note);
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
