// ABOUTME: Reads and writes content items using SQLite.
// ABOUTME: Provides CRUD operations for processed content (YouTube videos, podcasts, articles).

import { getDb } from "./db";
import { slugify } from "./utils";

export type ContentStatus = "processing" | "ready" | "error";
export type SourceType = "youtube";

export interface ContentItem {
  id: string;
  url: string;
  sourceId: string;
  sourceType: SourceType;
  title: string;
  author: string;
  thumbnailUrl: string;
  transcript: string;
  summary: string;
  topics: string[];
  claims: string[];
  people: string[];
  status: ContentStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContentRow {
  id: string;
  url: string;
  source_id: string;
  source_type: string;
  title: string;
  author: string;
  thumbnail_url: string;
  transcript: string;
  summary: string;
  claims: string;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function rowToContentItem(row: ContentRow): ContentItem {
  const db = getDb();

  const topicRows = db
    .prepare("SELECT topic_slug FROM content_topics WHERE content_id = ?")
    .all(row.id) as { topic_slug: string }[];

  const peopleRows = db
    .prepare(
      `SELECT p.name FROM content_people cp
       JOIN people p ON p.id = cp.person_id
       WHERE cp.content_id = ?`
    )
    .all(row.id) as { name: string }[];

  return {
    id: row.id,
    url: row.url,
    sourceId: row.source_id,
    sourceType: row.source_type as SourceType,
    title: row.title,
    author: row.author,
    thumbnailUrl: row.thumbnail_url,
    transcript: row.transcript,
    summary: row.summary,
    topics: topicRows.map((r) => r.topic_slug).map((slug) => {
      const topic = db.prepare("SELECT name FROM topics WHERE slug = ?").get(slug) as { name: string } | undefined;
      return topic ? topic.name : slug;
    }),
    claims: JSON.parse(row.claims),
    people: peopleRows.map((r) => r.name),
    status: row.status as ContentStatus,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function syncContentTopics(id: string, topics: string[]): void {
  const db = getDb();
  db.prepare("DELETE FROM content_topics WHERE content_id = ?").run(id);

  for (const topicName of topics) {
    const slug = slugify(topicName);
    db.prepare("INSERT OR IGNORE INTO topics (slug, name) VALUES (?, ?)").run(slug, topicName);
    db.prepare("INSERT OR IGNORE INTO content_topics (content_id, topic_slug) VALUES (?, ?)").run(id, slug);
  }
}

function syncContentPeople(id: string, people: string[]): void {
  const db = getDb();
  db.prepare("DELETE FROM content_people WHERE content_id = ?").run(id);

  for (const name of people) {
    const personSlug = slugify(name);
    db.prepare("INSERT OR IGNORE INTO people (name, slug) VALUES (?, ?)").run(name, personSlug);
    const person = db.prepare("SELECT id FROM people WHERE name = ?").get(name) as { id: number };
    db.prepare("INSERT OR IGNORE INTO content_people (content_id, person_id) VALUES (?, ?)").run(id, person.id);
  }
}

export function listContent(): ContentItem[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM content ORDER BY created_at DESC")
    .all() as ContentRow[];
  return rows.map(rowToContentItem);
}

export function getContent(id: string): ContentItem | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM content WHERE id = ?").get(id) as ContentRow | undefined;
  if (!row) return undefined;
  return rowToContentItem(row);
}

export function createContent(
  url: string,
  sourceId: string,
  sourceType: SourceType
): ContentItem {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO content (id, url, source_id, source_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, url, sourceId, sourceType, now, now);

  return getContent(id)!;
}

export function updateContent(
  id: string,
  updates: Partial<Omit<ContentItem, "id" | "createdAt">>
): ContentItem | undefined {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM content WHERE id = ?").get(id) as ContentRow | undefined;
  if (!existing) return undefined;

  const now = new Date().toISOString();

  const doUpdate = db.transaction(() => {
    // Build SET clause for scalar fields
    const setClauses: string[] = ["updated_at = ?"];
    const values: unknown[] = [now];

    if (updates.title !== undefined) { setClauses.push("title = ?"); values.push(updates.title); }
    if (updates.author !== undefined) { setClauses.push("author = ?"); values.push(updates.author); }
    if (updates.thumbnailUrl !== undefined) { setClauses.push("thumbnail_url = ?"); values.push(updates.thumbnailUrl); }
    if (updates.transcript !== undefined) { setClauses.push("transcript = ?"); values.push(updates.transcript); }
    if (updates.summary !== undefined) { setClauses.push("summary = ?"); values.push(updates.summary); }
    if (updates.claims !== undefined) { setClauses.push("claims = ?"); values.push(JSON.stringify(updates.claims)); }
    if (updates.status !== undefined) { setClauses.push("status = ?"); values.push(updates.status); }
    if (updates.error !== undefined) { setClauses.push("error = ?"); values.push(updates.error); }
    if (updates.url !== undefined) { setClauses.push("url = ?"); values.push(updates.url); }
    if (updates.sourceId !== undefined) { setClauses.push("source_id = ?"); values.push(updates.sourceId); }
    if (updates.sourceType !== undefined) { setClauses.push("source_type = ?"); values.push(updates.sourceType); }

    values.push(id);
    db.prepare(`UPDATE content SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);

    if (updates.topics !== undefined) {
      syncContentTopics(id, updates.topics);
    }
    if (updates.people !== undefined) {
      syncContentPeople(id, updates.people);
    }
  });

  doUpdate();
  return getContent(id)!;
}

export function deleteContent(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM content WHERE id = ?").run(id);
  return result.changes > 0;
}
