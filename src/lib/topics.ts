// ABOUTME: Manages topics derived from content items using SQLite.
// ABOUTME: Provides CRUD for topics; join table maintains the topic index at write time.

import { getDb } from "./db";
import { slugify } from "./utils";

export { slugify } from "./utils";

export interface Topic {
  slug: string;
  name: string;
  contentIds: string[];
  synthesis?: string;
  synthesizedAt?: string;
}

export function listTopics(): Topic[] {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT t.slug, t.name, t.synthesis, t.synthesized_at,
              COUNT(ct.content_id) as content_count
       FROM topics t
       LEFT JOIN content_topics ct ON ct.topic_slug = t.slug
       LEFT JOIN content c ON c.id = ct.content_id AND c.status = 'accepted'
       GROUP BY t.slug
       ORDER BY content_count DESC`
    )
    .all() as { slug: string; name: string; synthesis: string | null; synthesized_at: string | null; content_count: number }[];

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    contentIds: getContentIdsForTopic(row.slug),
    synthesis: row.synthesis ?? undefined,
    synthesizedAt: row.synthesized_at ?? undefined,
  }));
}

export function getTopic(slug: string): Topic | undefined {
  const db = getDb();

  const row = db
    .prepare("SELECT slug, name, synthesis, synthesized_at FROM topics WHERE slug = ?")
    .get(slug) as { slug: string; name: string; synthesis: string | null; synthesized_at: string | null } | undefined;

  if (!row) return undefined;

  return {
    slug: row.slug,
    name: row.name,
    contentIds: getContentIdsForTopic(row.slug),
    synthesis: row.synthesis ?? undefined,
    synthesizedAt: row.synthesized_at ?? undefined,
  };
}

export function createTopic(name: string): Topic {
  const db = getDb();
  const slug = slugify(name);

  db.prepare("INSERT OR IGNORE INTO topics (slug, name) VALUES (?, ?)").run(slug, name);

  return getTopic(slug)!;
}

export function updateTopicSynthesis(
  slug: string,
  synthesis: string
): Topic | undefined {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.prepare("SELECT slug FROM topics WHERE slug = ?").get(slug);
  if (!existing) return undefined;

  db.prepare("UPDATE topics SET synthesis = ?, synthesized_at = ? WHERE slug = ?").run(
    synthesis,
    now,
    slug
  );

  db.prepare("INSERT INTO synthesis_history (topic_slug, synthesis, created_at) VALUES (?, ?, ?)").run(
    slug,
    synthesis,
    now
  );

  return getTopic(slug)!;
}

export function rebuildTopicIndex(): void {
  // No-op: the content_topics join table maintains the index at write time.
  // Kept for backward compatibility with callers.
}

function getContentIdsForTopic(slug: string): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ct.content_id FROM content_topics ct
       JOIN content c ON c.id = ct.content_id
       WHERE ct.topic_slug = ? AND c.status = 'accepted'`
    )
    .all(slug) as { content_id: string }[];
  return rows.map((r) => r.content_id);
}
