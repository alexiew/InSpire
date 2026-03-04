// ABOUTME: API route for listing and submitting content.
// ABOUTME: GET returns all content, POST submits a URL or pasted transcript for processing.

import { NextRequest, NextResponse } from "next/server";
import { listContent, createContent, updateContent, type SourceType } from "@/lib/content";
import { extractVideoId } from "@/lib/youtube";
import { processContent } from "@/lib/process-content";

export const dynamic = "force-dynamic";

export function GET() {
  const items = listContent();
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, title, transcript } = body;

  // Manual import: title + transcript, no URL needed
  if (typeof title === "string" && title.trim() && typeof transcript === "string" && transcript.trim()) {
    const sourceId = `manual-${Date.now()}`;
    const item = createContent(url || "", sourceId, "blog");
    const updates: Record<string, unknown> = {
      title: title.trim(),
      transcript: transcript.trim(),
    };
    if (Array.isArray(body.topics) && body.topics.length > 0) {
      updates.topics = body.topics;
    }
    if (typeof body.extractionHints === "string" && body.extractionHints.trim()) {
      updates.extractionHints = body.extractionHints.trim();
    }
    updateContent(item.id, updates);
    processContent(item.id).catch(() => {});
    return NextResponse.json(item, { status: 201 });
  }

  // URL-based import
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url or title+transcript is required" }, { status: 400 });
  }

  let sourceId: string;
  let sourceType: SourceType;

  const videoId = extractVideoId(url);
  if (videoId) {
    sourceId = videoId;
    sourceType = "youtube";
  } else {
    const audioExtensions = /\.(mp3|m4a|wav|ogg|aac|opus)(\?|$)/i;
    sourceType = audioExtensions.test(url) ? "podcast" : "blog";
    sourceId = url;
  }

  const item = createContent(url, sourceId, sourceType);

  const updates: Record<string, unknown> = {};
  if (Array.isArray(body.topics) && body.topics.length > 0) {
    updates.topics = body.topics;
  }
  if (typeof body.extractionHints === "string" && body.extractionHints.trim()) {
    updates.extractionHints = body.extractionHints.trim();
  }
  if (Object.keys(updates).length > 0) {
    updateContent(item.id, updates);
  }

  processContent(item.id).catch(() => {});

  return NextResponse.json(item, { status: 201 });
}
