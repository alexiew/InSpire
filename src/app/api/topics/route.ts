// ABOUTME: API route for listing and creating topics.
// ABOUTME: GET returns topics sorted by count, POST creates a standalone topic.

import { NextRequest, NextResponse } from "next/server";
import { listTopics, createTopic } from "@/lib/topics";

export const dynamic = "force-dynamic";

export function GET() {
  const topics = listTopics();
  return NextResponse.json(topics);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const topic = createTopic(name.trim());
  return NextResponse.json(topic, { status: 201 });
}
