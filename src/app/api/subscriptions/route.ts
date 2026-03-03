// ABOUTME: API route for listing and creating subscriptions.
// ABOUTME: POST detects YouTube vs podcast URLs, subscribes, and ingests recent content.

import { NextRequest, NextResponse } from "next/server";
import { listSubscriptions, createSubscription, checkSubscription } from "@/lib/subscriptions";
import { isYouTubeUrl, resolveChannelId } from "@/lib/youtube";
import { fetchPodcastFeed } from "@/lib/podcast";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listSubscriptions());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, extractionHints } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const hints = typeof extractionHints === "string" ? extractionHints.trim() : undefined;

  try {
    let sub;
    if (isYouTubeUrl(url)) {
      const { channelId, name } = await resolveChannelId(url);
      sub = createSubscription("youtube", channelId, name, hints);
    } else {
      const feed = await fetchPodcastFeed(url);
      sub = createSubscription("podcast", url, feed.title, hints);
    }

    // Ingest recent content in the background
    checkSubscription(sub.id).catch(() => {});

    return NextResponse.json(sub, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to subscribe";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
