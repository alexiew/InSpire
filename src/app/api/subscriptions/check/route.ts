// ABOUTME: API route for manually triggering subscription checks.
// ABOUTME: Checks all (or silo-scoped) subscriptions for new content and returns ingested count.

import { NextRequest, NextResponse } from "next/server";
import { listSubscriptions, checkSubscription } from "@/lib/subscriptions";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { siloId } = body as { siloId?: number };

  const subs = typeof siloId === "number"
    ? listSubscriptions(siloId)
    : listSubscriptions();

  const results = await Promise.allSettled(
    subs.map((sub) => checkSubscription(sub.id))
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
