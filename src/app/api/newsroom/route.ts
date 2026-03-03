// ABOUTME: API route for intelligence briefings.
// ABOUTME: GET returns latest briefing + velocities, POST generates a new one.

import { NextResponse } from "next/server";
import {
  getLatestBriefing,
  getTopicVelocities,
  generateBriefing,
} from "@/lib/briefing";

export async function GET() {
  const briefing = getLatestBriefing() ?? null;
  const previousContentIds = briefing?.contentIds ?? [];
  const velocities = getTopicVelocities(previousContentIds);
  return NextResponse.json({ briefing, velocities });
}

export async function POST() {
  try {
    const briefing = await generateBriefing();
    return NextResponse.json({ briefing });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
