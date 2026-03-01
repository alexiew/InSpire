// ABOUTME: API route for individual content operations.
// ABOUTME: GET retrieves a content item, DELETE removes it and rebuilds topic index.

import { NextRequest, NextResponse } from "next/server";
import { getContent, deleteContent } from "@/lib/content";
import { rebuildTopicIndex } from "@/lib/topics";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getContent(id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteContent(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  rebuildTopicIndex();
  return NextResponse.json({ ok: true });
}
