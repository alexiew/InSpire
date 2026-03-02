// ABOUTME: API route for listing and creating subscriptions.
// ABOUTME: POST resolves a YouTube channel URL, subscribes, and ingests recent videos.

import { NextRequest, NextResponse } from "next/server";
import { listSubscriptions, createSubscription, checkSubscription } from "@/lib/subscriptions";
import { resolveChannelId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listSubscriptions());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const { channelId, name } = await resolveChannelId(url);
    const sub = createSubscription(channelId, name);

    // Ingest recent videos in the background
    checkSubscription(sub.id).catch(() => {});

    return NextResponse.json(sub, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resolve channel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
