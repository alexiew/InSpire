// ABOUTME: API route for deleting a subscription.
// ABOUTME: Removes the subscription but keeps any already-ingested content.

import { NextRequest, NextResponse } from "next/server";
import { deleteSubscription } from "@/lib/subscriptions";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteSubscription(Number(id));
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
