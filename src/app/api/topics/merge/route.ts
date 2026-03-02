// ABOUTME: API route for merging multiple topics into one.
// ABOUTME: Consolidates content associations and removes source topics.

import { NextRequest, NextResponse } from "next/server";
import { mergeTopics } from "@/lib/topics";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (
    !Array.isArray(body.slugs) ||
    body.slugs.length < 2 ||
    !body.slugs.every((s: unknown) => typeof s === "string")
  ) {
    return NextResponse.json(
      { error: "slugs must be an array of at least 2 strings" },
      { status: 400 }
    );
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "name must be a non-empty string" },
      { status: 400 }
    );
  }

  const merged = mergeTopics(body.slugs, body.name.trim());
  return NextResponse.json(merged);
}
