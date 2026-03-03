// ABOUTME: API route for intelligence briefings.
// ABOUTME: GET returns latest briefing + velocities, POST generates a new one.

import { NextResponse } from "next/server";
import {
  getLatestBriefing,
  getTopicVelocities,
  generateBriefing,
  listBriefings,
} from "@/lib/briefing";

export async function GET() {
  const briefings = listBriefings();
  const latest = briefings[0] ?? null;

  // Velocity relative to the most recent briefing.
  // Before any briefing exists, no baseline — show all topics with newCount = 0.
  let velocities = getTopicVelocities(latest?.contentIds ?? []);
  if (!latest) {
    velocities = velocities.map((v) => ({ ...v, newCount: 0 }));
  }

  // Compare against the previous briefing's snapshot to detect cooling topics
  const previousSnapshot = latest?.topicSnapshot ?? [];
  const snapshotMap = new Map(previousSnapshot.map((t) => [t.slug, t.newCount]));

  const withTrend = velocities.map((v) => ({
    ...v,
    previousNewCount: snapshotMap.get(v.slug) ?? 0,
  }));

  return NextResponse.json({ briefing: latest, velocities: withTrend, history: briefings });
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
