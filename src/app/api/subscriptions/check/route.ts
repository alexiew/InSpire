// ABOUTME: API route for manually triggering subscription checks.
// ABOUTME: Checks all subscriptions regardless of schedule and returns new items count.

import { NextResponse } from "next/server";
import { listSubscriptions, checkSubscription } from "@/lib/subscriptions";

export async function POST() {
  const subs = listSubscriptions();
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
