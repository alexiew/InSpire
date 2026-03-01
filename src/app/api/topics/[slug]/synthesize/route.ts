// ABOUTME: API route to trigger topic synthesis generation.
// ABOUTME: POST generates a cross-content synthesis for the given topic.

import { NextRequest, NextResponse } from "next/server";
import { synthesizeTopic } from "@/lib/synthesize";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const synthesis = await synthesizeTopic(slug);
    return NextResponse.json({ synthesis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
