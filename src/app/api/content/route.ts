// ABOUTME: API route for listing and submitting content.
// ABOUTME: GET returns all content, POST submits a URL for processing.

import { NextRequest, NextResponse } from "next/server";
import { listContent, createContent, type SourceType } from "@/lib/content";
import { extractVideoId } from "@/lib/youtube";
import { processContent } from "@/lib/process-content";

export const dynamic = "force-dynamic";

export function GET() {
  const items = listContent();
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let sourceId: string;
  let sourceType: SourceType;

  const videoId = extractVideoId(url);
  if (videoId) {
    sourceId = videoId;
    sourceType = "youtube";
  } else {
    // Non-YouTube URL: detect podcast (audio file) vs blog article
    const audioExtensions = /\.(mp3|m4a|wav|ogg|aac|opus)(\?|$)/i;
    sourceType = audioExtensions.test(url) ? "podcast" : "blog";
    sourceId = url;
  }

  const item = createContent(url, sourceId, sourceType);

  // Pre-assign topics and/or extraction hints if provided
  const updates: Record<string, unknown> = {};
  if (Array.isArray(body.topics) && body.topics.length > 0) {
    updates.topics = body.topics;
  }
  if (typeof body.extractionHints === "string" && body.extractionHints.trim()) {
    updates.extractionHints = body.extractionHints.trim();
  }
  if (Object.keys(updates).length > 0) {
    const { updateContent } = await import("@/lib/content");
    updateContent(item.id, updates);
  }

  // Fire-and-forget processing
  processContent(item.id).catch(() => {});

  return NextResponse.json(item, { status: 201 });
}
