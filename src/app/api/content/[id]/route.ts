// ABOUTME: API route for individual content operations.
// ABOUTME: GET retrieves, PATCH updates topics, DELETE removes and rebuilds topic index.

import { NextRequest, NextResponse } from "next/server";
import { getContent, updateContent, deleteContent } from "@/lib/content";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!Array.isArray(body.topics) || !body.topics.every((t: unknown) => typeof t === "string")) {
    return NextResponse.json({ error: "topics must be an array of strings" }, { status: 400 });
  }

  const updated = updateContent(id, { topics: body.topics });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  rebuildTopicIndex();
  return NextResponse.json(updated);
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
