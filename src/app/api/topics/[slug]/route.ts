// ABOUTME: API route for a single topic.
// ABOUTME: Returns topic details including content IDs and cached synthesis.

import { NextRequest, NextResponse } from "next/server";
import { getTopic, deleteTopic } from "@/lib/topics";
import { getContent } from "@/lib/content";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Include full content items for the topic
  const items = topic.contentIds
    .map((id) => getContent(id))
    .filter(Boolean);

  return NextResponse.json({ ...topic, items });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const deleted = deleteTopic(slug);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
