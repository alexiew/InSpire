// ABOUTME: Reads people from the SQLite database with content associations.
// ABOUTME: Provides list and detail queries for the people browsing UI.

import { getDb } from "./db";
import type { GraphNode, GraphEdge, TopicGraph } from "./topics";

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

export function getPeopleGraph(): TopicGraph {
  const db = getDb();

  const nodeRows = db
    .prepare(
      `SELECT p.slug, p.name, COUNT(c.id) as content_count
       FROM people p
       JOIN content_people cp ON cp.person_id = p.id
       JOIN content c ON c.id = cp.content_id AND c.status = 'accepted'
       GROUP BY p.id
       HAVING content_count > 0`
    )
    .all() as { slug: string; name: string; content_count: number }[];

  const nodes: GraphNode[] = nodeRows.map((r) => ({
    slug: r.slug,
    name: r.name,
    contentCount: r.content_count,
  }));

  const nodeSet = new Set(nodes.map((n) => n.slug));

  const allEdges = db
    .prepare(
      `SELECT p1.slug as source, p2.slug as target, COUNT(*) as weight
       FROM content_people cp1
       JOIN content_people cp2 ON cp1.content_id = cp2.content_id
       JOIN content c ON c.id = cp1.content_id AND c.status = 'accepted'
       JOIN people p1 ON p1.id = cp1.person_id
       JOIN people p2 ON p2.id = cp2.person_id
       WHERE p1.slug < p2.slug
       GROUP BY p1.slug, p2.slug`
    )
    .all() as GraphEdge[];

  const edges = allEdges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target));

  return { nodes, edges };
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
