// ABOUTME: API route for the topic co-occurrence graph.
// ABOUTME: Returns nodes (topics) and edges (shared content) for visualization.

import { NextResponse } from "next/server";
import { getTopicGraph } from "@/lib/topics";

export function GET() {
  return NextResponse.json(getTopicGraph());
}
