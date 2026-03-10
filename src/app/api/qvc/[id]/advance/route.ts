// ABOUTME: API route to advance a QVC item to its next pipeline stage.
// ABOUTME: Triggers AI processing for the next stage (research, angle, strategy, brief).

import { NextRequest, NextResponse } from "next/server";
import { advanceQvcItem } from "@/lib/qvc-pipeline";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await advanceQvcItem(Number(id));
    return NextResponse.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
