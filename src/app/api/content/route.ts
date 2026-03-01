// ABOUTME: API route for listing and submitting content.
// ABOUTME: GET returns all content, POST submits a YouTube URL for processing.

import { NextRequest, NextResponse } from "next/server";
import { listContent, createContent } from "@/lib/content";
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

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json(
      { error: "Invalid YouTube URL" },
      { status: 400 }
    );
  }

  const item = createContent(url, videoId, "youtube");

  // Fire-and-forget processing
  processContent(item.id).catch(() => {});

  return NextResponse.json(item, { status: 201 });
}
