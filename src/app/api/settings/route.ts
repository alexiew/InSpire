// ABOUTME: API route for global application settings.
// ABOUTME: GET retrieves a setting by key, PUT updates it.

import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/settings";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key parameter required" }, { status: 400 });
  }
  const value = getSetting(key, "");
  return NextResponse.json({ key, value });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!body.key || typeof body.key !== "string") {
    return NextResponse.json({ error: "key must be a string" }, { status: 400 });
  }
  if (body.value === undefined || typeof body.value !== "string") {
    return NextResponse.json({ error: "value must be a string" }, { status: 400 });
  }
  setSetting(body.key, body.value);
  return NextResponse.json({ key: body.key, value: body.value });
}
