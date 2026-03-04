// ABOUTME: API route for the people co-occurrence graph.
// ABOUTME: Returns nodes (people) and edges (shared content) for visualization.

import { NextResponse } from "next/server";
import { getPeopleGraph } from "@/lib/people";

export function GET() {
  return NextResponse.json(getPeopleGraph());
}
