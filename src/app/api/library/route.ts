// ABOUTME: API route for the library of accepted content.
// ABOUTME: Returns accepted items, optionally filtered by title search.

import { NextRequest, NextResponse } from "next/server";
import { listLibrary } from "@/lib/content";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("q") || undefined;
  return NextResponse.json(listLibrary(search));
}
