// ABOUTME: API route for listing all people with content counts.
// ABOUTME: Returns people sorted by number of associated content items.

import { NextResponse } from "next/server";
import { listPeople } from "@/lib/people";

export const dynamic = "force-dynamic";

export function GET() {
  const people = listPeople();
  return NextResponse.json(people);
}
