// ABOUTME: API route for listing and submitting videos.
// ABOUTME: GET returns all videos, POST submits a YouTube URL for processing.

import { NextRequest, NextResponse } from "next/server";
import { listVideos, createVideo } from "@/lib/videos";
import { extractVideoId } from "@/lib/youtube";
import { processVideo } from "@/lib/process-video";

export const dynamic = "force-dynamic";

export function GET() {
  const videos = listVideos();
  return NextResponse.json(videos);
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

  const video = createVideo(url, videoId);

  // Fire-and-forget processing
  processVideo(video.id).catch(() => {});

  return NextResponse.json(video, { status: 201 });
}
