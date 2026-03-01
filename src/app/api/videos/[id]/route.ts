// ABOUTME: API route for individual video operations.
// ABOUTME: GET retrieves a video, DELETE removes it.

import { NextRequest, NextResponse } from "next/server";
import { getVideo, deleteVideo } from "@/lib/videos";

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const video = getVideo(id);
    if (!video) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(video);
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteVideo(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
