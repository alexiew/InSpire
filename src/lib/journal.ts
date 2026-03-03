// ABOUTME: Manages journal entries for capturing text highlights from content.
// ABOUTME: Provides CRUD operations for personal notes linked to source content.

import { getDb } from "./db";

export interface JournalEntry {
  id: number;
  contentId: string | null;
  contentTitle: string | null;
  source: string | null;
  text: string;
  note: string | null;
  createdAt: string;
}

interface JournalRow {
  id: number;
  content_id: string | null;
  content_title: string | null;
  source: string | null;
  text: string;
  note: string | null;
  created_at: string;
}

function rowToEntry(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    contentId: row.content_id,
    contentTitle: row.content_title,
    source: row.source,
    text: row.text,
    note: row.note,
    createdAt: row.created_at,
  };
}

const ENTRY_QUERY = `SELECT j.id, j.content_id, j.source, c.title as content_title, j.text, j.note, j.created_at
       FROM journal_entries j
       LEFT JOIN content c ON c.id = j.content_id`;

export function listJournalEntries(): JournalEntry[] {
  const db = getDb();
  const rows = db
    .prepare(`${ENTRY_QUERY} ORDER BY j.created_at DESC, j.id DESC`)
    .all() as JournalRow[];
  return rows.map(rowToEntry);
}

export function createJournalEntry(
  contentId: string | null,
  text: string,
  source?: string
): JournalEntry {
  const db = getDb();
  const now = new Date().toISOString();
  const effectiveSource = source ?? contentId;
  const today = now.slice(0, 10); // YYYY-MM-DD

  // Append to existing entry with same source today
  if (effectiveSource) {
    const existing = db
      .prepare(
        `SELECT id, text FROM journal_entries
         WHERE source = ? AND created_at LIKE ? || '%'
         ORDER BY id DESC LIMIT 1`
      )
      .get(effectiveSource, today) as { id: number; text: string } | undefined;

    if (existing) {
      db.prepare("UPDATE journal_entries SET text = ? WHERE id = ?")
        .run(existing.text + "\n\n" + text, existing.id);

      const row = db
        .prepare(`${ENTRY_QUERY} WHERE j.id = ?`)
        .get(existing.id) as JournalRow;
      return rowToEntry(row);
    }
  }

  const result = db
    .prepare("INSERT INTO journal_entries (content_id, source, text, created_at) VALUES (?, ?, ?, ?)")
    .run(contentId, effectiveSource, text, now);

  const row = db
    .prepare(`${ENTRY_QUERY} WHERE j.id = ?`)
    .get(result.lastInsertRowid) as JournalRow;

  return rowToEntry(row);
}

export function updateJournalNote(id: number, note: string | null): JournalEntry | null {
  const db = getDb();
  const result = db.prepare("UPDATE journal_entries SET note = ? WHERE id = ?").run(note, id);
  if (result.changes === 0) return null;
  const row = db.prepare(`${ENTRY_QUERY} WHERE j.id = ?`).get(id) as JournalRow | undefined;
  return row ? rowToEntry(row) : null;
}

export function deleteJournalEntry(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
  return result.changes > 0;
}
