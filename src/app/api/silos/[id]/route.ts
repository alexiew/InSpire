// ABOUTME: API route for individual silo operations.
// ABOUTME: GET returns silo with content items, POST submits content, DELETE removes silo.

import { NextRequest, NextResponse } from "next/server";
import { getSilo, deleteSilo } from "@/lib/silos";
import { createContent, updateContent, type SourceType } from "@/lib/content";
import { extractVideoId } from "@/lib/youtube";
import { processContent } from "@/lib/process-content";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const silo = getSilo(Number(id));
  if (!silo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(silo);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const siloId = Number(id);
  const silo = getSilo(siloId);
  if (!silo) {
    return NextResponse.json({ error: "Silo not found" }, { status: 404 });
  }

  const body = await request.json();
  const { url, title, transcript } = body;

  // Manual import: title + transcript
  if (typeof title === "string" && title.trim() && typeof transcript === "string" && transcript.trim()) {
    const sourceId = `manual-${Date.now()}`;
    const item = createContent(url || "", sourceId, "blog", siloId);
    updateContent(item.id, {
      title: title.trim(),
      transcript: transcript.trim(),
    });
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

  const item = createContent(url, sourceId, sourceType, siloId);
  processContent(item.id).catch(() => {});

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteSilo(Number(id));
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
