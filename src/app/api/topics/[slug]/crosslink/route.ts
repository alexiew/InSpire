// ABOUTME: API route to find content related to a topic via AI analysis.
// ABOUTME: Scans existing summaries and returns candidates for cross-linking.

import { NextRequest, NextResponse } from "next/server";
import { findRelatedContent } from "@/lib/crosslink";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const candidates = await findRelatedContent(slug);
    return NextResponse.json(candidates);
  } catch {
    return NextResponse.json(
      { error: "Failed to find related content" },
      { status: 500 }
    );
  }
}
