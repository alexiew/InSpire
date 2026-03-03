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
  synthesis: string,
  contentIds: string[]
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

  db.prepare("INSERT INTO synthesis_history (topic_slug, synthesis, content_ids, created_at) VALUES (?, ?, ?, ?)").run(
    slug,
    synthesis,
    JSON.stringify(contentIds),
    now
  );

  return getTopic(slug)!;
}

export function getLatestSynthesisRecord(slug: string): { synthesis: string; contentIds: string[] } | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT synthesis, content_ids FROM synthesis_history WHERE topic_slug = ? ORDER BY id DESC LIMIT 1")
    .get(slug) as { synthesis: string; content_ids: string } | undefined;
  if (!row) return undefined;
  return { synthesis: row.synthesis, contentIds: JSON.parse(row.content_ids) };
}

export function deleteTopic(slug: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM topics WHERE slug = ?").run(slug);
  return result.changes > 0;
}

export function mergeTopics(sourceSlugs: string[], targetName: string): Topic {
  if (sourceSlugs.length < 2) {
    throw new Error("At least 2 topics are required to merge");
  }

  const db = getDb();
  const targetSlug = slugify(targetName);

  const doMerge = db.transaction(() => {
    // Create the target topic if it doesn't already exist
    db.prepare("INSERT OR IGNORE INTO topics (slug, name) VALUES (?, ?)").run(targetSlug, targetName);

    for (const sourceSlug of sourceSlugs) {
      if (sourceSlug === targetSlug) continue;

      // Move content associations to the target (ignore duplicates)
      db.prepare(
        `INSERT OR IGNORE INTO content_topics (content_id, topic_slug)
         SELECT content_id, ? FROM content_topics WHERE topic_slug = ?`
      ).run(targetSlug, sourceSlug);

      // Delete the source topic (CASCADE removes its content_topics rows)
      db.prepare("DELETE FROM topics WHERE slug = ?").run(sourceSlug);
    }
  });

  doMerge();
  return getTopic(targetSlug)!;
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
