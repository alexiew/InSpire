// ABOUTME: API route for listing and creating silos.
// ABOUTME: GET returns all silos with content counts, POST creates a new silo.

import { NextRequest, NextResponse } from "next/server";
import { listSilos, createSilo } from "@/lib/silos";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listSilos());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const silo = createSilo(name.trim());
    return NextResponse.json(silo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A silo with this name already exists" }, { status: 409 });
  }
}
