// ABOUTME: Reads people from the SQLite database with content associations.
// ABOUTME: Provides list and detail queries for the people browsing UI.

import { getDb } from "./db";

export interface Person {
  id: number;
  name: string;
  slug: string;
  contentIds: string[];
}

export function listPeople(): Person[] {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.slug, COUNT(c.id) as content_count
       FROM people p
       LEFT JOIN content_people cp ON cp.person_id = p.id
       LEFT JOIN content c ON c.id = cp.content_id AND c.status = 'accepted'
       GROUP BY p.id
       HAVING content_count > 0
       ORDER BY content_count DESC`
    )
    .all() as { id: number; name: string; slug: string; content_count: number }[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    contentIds: getContentIdsForPerson(row.id),
  }));
}

export function getPerson(slug: string): Person | undefined {
  const db = getDb();

  const row = db
    .prepare("SELECT id, name, slug FROM people WHERE slug = ?")
    .get(slug) as { id: number; name: string; slug: string } | undefined;

  if (!row) return undefined;

  const contentIds = getContentIdsForPerson(row.id);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    contentIds,
  };
}

function getContentIdsForPerson(personId: number): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT cp.content_id FROM content_people cp
       JOIN content c ON c.id = cp.content_id
       WHERE cp.person_id = ? AND c.status = 'accepted'`
    )
    .all(personId) as { content_id: string }[];
  return rows.map((r) => r.content_id);
}
