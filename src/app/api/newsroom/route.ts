// ABOUTME: API route for intelligence briefings.
// ABOUTME: GET returns latest briefing + velocities, POST generates a new one.

import { NextResponse } from "next/server";
import {
  computeTopicVelocity,
  generateBriefing,
  listBriefings,
} from "@/lib/briefing";

export async function GET() {
  const briefings = listBriefings();
  const latest = briefings[0] ?? null;
  const velocities = computeTopicVelocity();

  return NextResponse.json({ briefing: latest, velocities, history: briefings });
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
