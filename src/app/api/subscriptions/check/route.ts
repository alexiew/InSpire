// ABOUTME: API route for manually triggering subscription checks.
// ABOUTME: Checks all subscriptions and returns new items count. Accepts optional maxItems.

import { NextRequest, NextResponse } from "next/server";
import { listSubscriptions, checkSubscription } from "@/lib/subscriptions";

export async function POST(request: NextRequest) {
  let maxItems: number | undefined;
  try {
    const body = await request.json();
    if (typeof body.maxItems === "number" && body.maxItems > 0) {
      maxItems = body.maxItems;
    }
  } catch {
    // No body or invalid JSON — use defaults
  }

  const subs = listSubscriptions();
  const results = await Promise.allSettled(
    subs.map((sub) => checkSubscription(sub.id, maxItems))
  );

  const totalIngested = results.reduce((sum, r) => {
    if (r.status === "fulfilled") return sum + r.value;
    return sum;
  }, 0);

  return NextResponse.json({
    checked: subs.length,
    ingested: totalIngested,
  });
}
