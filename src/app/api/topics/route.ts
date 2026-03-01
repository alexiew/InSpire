// ABOUTME: API route for listing all topics.
// ABOUTME: Returns topics sorted by content count descending.

import { NextResponse } from "next/server";
import { listTopics } from "@/lib/topics";

export const dynamic = "force-dynamic";

export function GET() {
  const topics = listTopics();
  return NextResponse.json(topics);
}
