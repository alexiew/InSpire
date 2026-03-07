// ABOUTME: API route for generating silo synthesis.
// ABOUTME: POST triggers cross-content analysis across all accepted content in the silo.

import { NextRequest, NextResponse } from "next/server";
import { synthesizeSilo } from "@/lib/silos";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const silo = await synthesizeSilo(Number(id));
    return NextResponse.json(silo);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
