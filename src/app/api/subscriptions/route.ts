// ABOUTME: API route for listing and creating subscriptions.
// ABOUTME: POST detects YouTube vs podcast vs blog URLs, subscribes, and ingests recent content.

import { NextRequest, NextResponse } from "next/server";
import { listSubscriptions, createSubscription, checkSubscription } from "@/lib/subscriptions";
import { isYouTubeUrl, resolveChannelId } from "@/lib/youtube";
import { parsePodcastFeed, detectFeedType } from "@/lib/podcast";
import { parseBlogFeed } from "@/lib/blog";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const siloId = request.nextUrl.searchParams.get("siloId");
  const subs = siloId !== null
    ? listSubscriptions(Number(siloId))
    : listSubscriptions();
  return NextResponse.json(subs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, extractionHints, maxItems, siloId } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const hints = typeof extractionHints === "string" ? extractionHints.trim() : undefined;

  try {
    const silo = typeof siloId === "number" ? siloId : undefined;
    let sub;
    if (isYouTubeUrl(url)) {
      const { channelId, name } = await resolveChannelId(url);
      sub = createSubscription("youtube", channelId, name, hints, undefined, silo);
    } else {
      // Fetch feed XML once, then detect type and parse accordingly
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch feed: ${res.status}`);
      const xml = await res.text();

      if (!/<rss|<feed/i.test(xml)) {
        throw new Error("URL does not appear to be an RSS or Atom feed");
      }

      const feedType = detectFeedType(xml);
      if (feedType === "podcast") {
        const feed = parsePodcastFeed(xml);
        sub = createSubscription("podcast", url, feed.title, hints, undefined, silo);
      } else {
        const feed = parseBlogFeed(xml);
        sub = createSubscription("blog", url, feed.title, hints, undefined, silo);
      }
    }

    // Ingest recent content in the background
    const limit = typeof maxItems === "number" && maxItems > 0 ? maxItems : undefined;
    checkSubscription(sub.id, limit).catch(() => {});

    return NextResponse.json(sub, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to subscribe";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
