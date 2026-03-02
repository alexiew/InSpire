// ABOUTME: API route for recent content items.
// ABOUTME: Returns newest non-discarded items and triggers subscription auto-checks.

import { NextResponse } from "next/server";
import { listRecent } from "@/lib/content";
import { maybeCheckSubscriptions } from "@/lib/subscriptions";

export async function GET() {
  maybeCheckSubscriptions();
  return NextResponse.json(listRecent());
}
