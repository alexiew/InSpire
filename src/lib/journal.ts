// ABOUTME: Manages journal entries for capturing text highlights from content.
// ABOUTME: Provides CRUD operations for personal notes linked to source content.

import { getDb } from "./db";

export interface JournalEntry {
  id: number;
  contentId: string | null;
  contentTitle: string | null;
  text: string;
  note: string | null;
  createdAt: string;
}

interface JournalRow {
  id: number;
  content_id: string | null;
  content_title: string | null;
  text: string;
  note: string | null;
  created_at: string;
}

function rowToEntry(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    contentId: row.content_id,
    contentTitle: row.content_title,
    text: row.text,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function listJournalEntries(): JournalEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT j.id, j.content_id, c.title as content_title, j.text, j.note, j.created_at
       FROM journal_entries j
       LEFT JOIN content c ON c.id = j.content_id
       ORDER BY j.created_at DESC, j.id DESC`
    )
    .all() as JournalRow[];
  return rows.map(rowToEntry);
}

export function createJournalEntry(
  contentId: string | null,
  text: string
): JournalEntry {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare("INSERT INTO journal_entries (content_id, text, created_at) VALUES (?, ?, ?)")
    .run(contentId, text, now);

  const row = db
    .prepare(
      `SELECT j.id, j.content_id, c.title as content_title, j.text, j.note, j.created_at
       FROM journal_entries j
       LEFT JOIN content c ON c.id = j.content_id
       WHERE j.id = ?`
    )
    .get(result.lastInsertRowid) as JournalRow;

  return rowToEntry(row);
}

export function deleteJournalEntry(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
  return result.changes > 0;
}
