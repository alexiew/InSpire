// ABOUTME: API route for recent content items.
// ABOUTME: Returns newest non-discarded items for the Recent sidebar section.

import { NextResponse } from "next/server";
import { listRecent } from "@/lib/content";

export async function GET() {
  return NextResponse.json(listRecent());
}
