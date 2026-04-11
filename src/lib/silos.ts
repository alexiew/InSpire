// ABOUTME: Manages research silos — isolated content containers for topic exploration.
// ABOUTME: Provides CRUD for silos and cross-content synthesis within a silo.

import { getDb } from "./db";
import { callClaude } from "./claude";
import { listSiloContent, type ContentItem } from "./content";

export interface Silo {
  id: number;
  name: string;
  synthesis?: string;
  synthesizedAt?: string;
  createdAt: string;
}

export interface SiloWithItems extends Silo {
  items: ContentItem[];
}

export interface SiloListItem extends Silo {
  contentCount: number;
  pendingCount: number;
}

interface SiloRow {
  id: number;
  name: string;
  synthesis: string | null;
  synthesized_at: string | null;
  created_at: string;
}

function rowToSilo(row: SiloRow): Silo {
  return {
    id: row.id,
    name: row.name,
    synthesis: row.synthesis ?? undefined,
    synthesizedAt: row.synthesized_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function createSilo(name: string): Silo {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare("INSERT INTO silos (name, created_at) VALUES (?, ?)")
    .run(name, now);

  const row = db
    .prepare("SELECT * FROM silos WHERE id = ?")
    .get(result.lastInsertRowid) as SiloRow;

  return rowToSilo(row);
}

export function listSilos(): SiloListItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.*,
              COUNT(c.id) as content_count,
              COUNT(CASE WHEN c.status NOT IN ('accepted', 'discarded') THEN 1 END) as pending_count
       FROM silos s
       LEFT JOIN content c ON c.silo_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    )
    .all() as (SiloRow & { content_count: number; pending_count: number })[];

  return rows.map((row) => ({
    ...rowToSilo(row),
    contentCount: row.content_count,
    pendingCount: row.pending_count,
  }));
}

export function getSilo(id: number): SiloWithItems | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM silos WHERE id = ?")
    .get(id) as SiloRow | undefined;

  if (!row) return undefined;

  const items = listSiloContent(id);

  return {
    ...rowToSilo(row),
    items,
  };
}

export interface SiloSynthesisRecord {
  id: number;
  synthesis: string;
  contentIds: string[];
  createdAt: string;
}

export function deleteSilo(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM silos WHERE id = ?").run(id);
  return result.changes > 0;
}

export function listSiloSynthesisHistory(siloId: number): SiloSynthesisRecord[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, synthesis, content_ids, created_at FROM silo_synthesis_history WHERE silo_id = ? ORDER BY id DESC")
    .all(siloId) as { id: number; synthesis: string; content_ids: string; created_at: string }[];
  return rows.map((row) => ({
    id: row.id,
    synthesis: row.synthesis,
    contentIds: JSON.parse(row.content_ids),
    createdAt: row.created_at,
  }));
}

function getLatestSiloSynthesisRecord(siloId: number): { synthesis: string; contentIds: string[] } | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT synthesis, content_ids FROM silo_synthesis_history WHERE silo_id = ? ORDER BY id DESC LIMIT 1")
    .get(siloId) as { synthesis: string; content_ids: string } | undefined;
  if (!row) return undefined;
  return { synthesis: row.synthesis, contentIds: JSON.parse(row.content_ids) };
}

function formatSiloItem(item: ContentItem): string {
  const parts = [`### ${item.title}${item.author ? ` (by ${item.author})` : ""}`];
  if (item.summary) parts.push(`**Summary:** ${item.summary}`);
  if (item.claims.length > 0) {
    parts.push("**Claims:**");
    parts.push(...item.claims.map((c) => `  - ${c}`));
  }
  if (item.topics.length > 0) {
    parts.push(`**Topics:** ${item.topics.join(", ")}`);
  }
  if (item.people.length > 0) {
    parts.push(`**People:** ${item.people.join(", ")}`);
  }
  return parts.join("\n");
}

function buildSiloSynthesisPrompt(siloName: string, items: ContentItem[]): string {
  return `You are analyzing ${items.length} pieces of content collected in a research silo called "${siloName}".

CONTENT:
${items.map(formatSiloItem).join("\n\n")}

Produce a comprehensive synthesis covering:
- Key themes and recurring ideas across these sources
- Points of agreement and contradiction between sources
- Notable people and their perspectives
- Gaps in coverage — what topics are missing or underexplored?
- Content angles and ideas that emerge from combining these perspectives

Be specific and cite sources by title. The synthesis should be actionable for someone creating content on this topic.`;
}

function buildIncrementalSiloPrompt(siloName: string, previousSynthesis: string, newItems: ContentItem[]): string {
  const plural = newItems.length === 1 ? "source" : "sources";

  return `You are updating a synthesis for a research silo called "${siloName}".

Here is the existing synthesis based on previously analyzed sources:

---
${previousSynthesis}
---

${newItems.length} new ${plural} to integrate:

${newItems.map(formatSiloItem).join("\n\n")}

Produce an updated synthesis that integrates the new material. Maintain the same structure:
- Key themes and recurring ideas across these sources
- Points of agreement and contradiction between sources
- Notable people and their perspectives
- Gaps in coverage — what topics are missing or underexplored?
- Content angles and ideas that emerge from combining these perspectives

Incorporate the new sources naturally. If they reinforce existing points, strengthen them with the new evidence. If they contradict existing points, note the disagreement. Add any new themes or insights they introduce. Be specific and cite sources by title.`;
}

export async function synthesizeSilo(id: number): Promise<Silo> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM silos WHERE id = ?")
    .get(id) as SiloRow | undefined;

  if (!row) {
    throw new Error(`Silo ${id} not found`);
  }

  const items = listSiloContent(id).filter((item) => item.status === "accepted");
  if (items.length === 0) {
    throw new Error("No accepted content in this silo");
  }

  const currentIds = items.map((item) => item.id);
  const lastRecord = getLatestSiloSynthesisRecord(id);

  let prompt: string;

  if (lastRecord) {
    const previousIds = new Set(lastRecord.contentIds);
    const newItems = items.filter((item) => !previousIds.has(item.id));

    if (newItems.length === 0) {
      throw new Error("Synthesis is up to date — no new content since last generation");
    }

    prompt = buildIncrementalSiloPrompt(row.name, lastRecord.synthesis, newItems);
  } else {
    prompt = buildSiloSynthesisPrompt(row.name, items);
  }

  const synthesis = await callClaude(prompt);
  const now = new Date().toISOString();

  db.prepare("UPDATE silos SET synthesis = ?, synthesized_at = ? WHERE id = ?")
    .run(synthesis, now, id);

  db.prepare("INSERT INTO silo_synthesis_history (silo_id, synthesis, content_ids, created_at) VALUES (?, ?, ?, ?)")
    .run(id, synthesis, JSON.stringify(currentIds), now);

  return rowToSilo(
    db.prepare("SELECT * FROM silos WHERE id = ?").get(id) as SiloRow
  );
}
