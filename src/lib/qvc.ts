// ABOUTME: QVC item CRUD for product opportunity exploration.
// ABOUTME: Stores and manages items progressing through seed → research → angle → strategy → brief.

import { getDb } from "./db";

export type QvcStatus = "seed" | "researching" | "drafting" | "complete";

export interface QvcItem {
  id: number;
  title: string;
  seedText: string;
  sourceType: string;
  sourceId: string;
  research: string;
  angle: string;
  strategy: string;
  brief: string;
  status: QvcStatus;
  createdAt: string;
  updatedAt: string;
}

interface QvcRow {
  id: number;
  title: string;
  seed_text: string;
  source_type: string;
  source_id: string;
  research: string;
  angle: string;
  strategy: string;
  brief: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function rowToItem(row: QvcRow): QvcItem {
  return {
    id: row.id,
    title: row.title,
    seedText: row.seed_text,
    sourceType: row.source_type,
    sourceId: row.source_id,
    research: row.research,
    angle: row.angle,
    strategy: row.strategy,
    brief: row.brief,
    status: row.status as QvcStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface CreateInput {
  seedText: string;
  sourceType: string;
  sourceId: string;
  title?: string;
}

export function createQvcItem(input: CreateInput): QvcItem {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db.prepare(
    `INSERT INTO qvc_items (title, seed_text, source_type, source_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(input.title || "", input.seedText, input.sourceType, input.sourceId, now, now);

  return rowToItem(
    db.prepare("SELECT * FROM qvc_items WHERE id = ?").get(result.lastInsertRowid) as QvcRow
  );
}

export function getQvcItem(id: number): QvcItem | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM qvc_items WHERE id = ?").get(id) as QvcRow | undefined;
  return row ? rowToItem(row) : undefined;
}

export function listQvcItems(): QvcItem[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM qvc_items ORDER BY created_at DESC").all() as QvcRow[];
  return rows.map(rowToItem);
}

export function updateQvcItem(id: number, updates: Partial<Omit<QvcItem, "id" | "createdAt" | "updatedAt">>): QvcItem | undefined {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM qvc_items WHERE id = ?").get(id) as QvcRow | undefined;
  if (!existing) return undefined;

  const fieldMap: Record<string, string> = {
    title: "title",
    seedText: "seed_text",
    research: "research",
    angle: "angle",
    strategy: "strategy",
    brief: "brief",
    status: "status",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if ((updates as Record<string, unknown>)[key] !== undefined) {
      db.prepare(`UPDATE qvc_items SET ${column} = ? WHERE id = ?`).run(
        (updates as Record<string, unknown>)[key],
        id
      );
    }
  }

  db.prepare("UPDATE qvc_items SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);

  return rowToItem(
    db.prepare("SELECT * FROM qvc_items WHERE id = ?").get(id) as QvcRow
  );
}

export function deleteQvcItem(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM qvc_items WHERE id = ?").run(id);
  return result.changes > 0;
}
