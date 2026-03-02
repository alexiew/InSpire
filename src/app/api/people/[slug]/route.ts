// ABOUTME: API route for a single person.
// ABOUTME: Returns person details including all content items mentioning them.

import { NextRequest, NextResponse } from "next/server";
import { getPerson } from "@/lib/people";
import { getContent } from "@/lib/content";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const person = getPerson(slug);
  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = person.contentIds
    .map((id) => getContent(id))
    .filter(Boolean);

  return NextResponse.json({ ...person, items });
}
