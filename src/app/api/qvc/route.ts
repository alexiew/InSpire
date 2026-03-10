// ABOUTME: API route for listing and creating QVC items.
// ABOUTME: GET returns all items, POST creates a new one from seed text.

import { NextRequest, NextResponse } from "next/server";
import { listQvcItems, createQvcItem } from "@/lib/qvc";

export async function GET() {
  return NextResponse.json(listQvcItems());
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.seedText || typeof body.seedText !== "string") {
    return NextResponse.json({ error: "seedText is required" }, { status: 400 });
  }
  if (!body.sourceType || typeof body.sourceType !== "string") {
    return NextResponse.json({ error: "sourceType is required" }, { status: 400 });
  }
  if (!body.sourceId && body.sourceId !== 0) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }

  const item = createQvcItem({
    seedText: body.seedText,
    sourceType: body.sourceType,
    sourceId: String(body.sourceId),
    title: body.title,
  });

  return NextResponse.json(item);
}
