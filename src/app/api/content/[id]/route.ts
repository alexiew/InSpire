// ABOUTME: API route for individual content operations.
// ABOUTME: GET retrieves, PATCH updates topics/people/status, DELETE removes content.

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

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  ready: ["accepted", "discarded"],
  accepted: ["discarded"],
  discarded: ["accepted"],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};

  if (body.topics !== undefined) {
    if (!Array.isArray(body.topics) || !body.topics.every((t: unknown) => typeof t === "string")) {
      return NextResponse.json({ error: "topics must be an array of strings" }, { status: 400 });
    }
    updates.topics = body.topics;
  }

  if (body.people !== undefined) {
    if (!Array.isArray(body.people) || !body.people.every((p: unknown) => typeof p === "string")) {
      return NextResponse.json({ error: "people must be an array of strings" }, { status: 400 });
    }
    updates.people = body.people;
  }

  if (body.status !== undefined) {
    const item = getContent(id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const allowed = ALLOWED_STATUS_TRANSITIONS[item.status];
    if (!allowed || !allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${item.status}' to '${body.status}'` },
        { status: 400 }
      );
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = updateContent(id, updates);
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
