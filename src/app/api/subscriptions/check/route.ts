// ABOUTME: API route for manually triggering subscription checks.
// ABOUTME: Checks all due subscriptions and returns the number of new items ingested.

import { NextResponse } from "next/server";
import { getDueSubscriptions, checkSubscription } from "@/lib/subscriptions";

export async function POST() {
  const due = getDueSubscriptions();
  const results = await Promise.allSettled(
    due.map((sub) => checkSubscription(sub.id))
  );

  const totalIngested = results.reduce((sum, r) => {
    if (r.status === "fulfilled") return sum + r.value;
    return sum;
  }, 0);

  return NextResponse.json({
    checked: due.length,
    ingested: totalIngested,
  });
}
