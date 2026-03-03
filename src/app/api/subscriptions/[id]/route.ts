// ABOUTME: API route for updating and deleting a subscription.
// ABOUTME: Supports PATCH for editing extraction hints and DELETE for removal.

import { NextRequest, NextResponse } from "next/server";
import { deleteSubscription, updateSubscription } from "@/lib/subscriptions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updated = updateSubscription(Number(id), {
    extractionHints: body.extractionHints,
  });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

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
