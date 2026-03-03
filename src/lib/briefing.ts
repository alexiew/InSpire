// ABOUTME: Intelligence briefing generation for the Newsroom dashboard.
// ABOUTME: Computes topic velocity, builds prompts, and stores briefings in SQLite.

import { callClaude } from "./claude";
import { getDb } from "./db";
import { getContent, listLibrary } from "./content";
import { listTopics } from "./topics";
import type { SynthesisInput } from "./synthesize";

export interface TopicVelocity {
  slug: string;
  name: string;
  contentCount: number;
  newCount: number;
  hasSynthesis: boolean;
}

export interface Briefing {
  id: number;
  content: string;
  topicSnapshot: TopicVelocity[];
  contentIds: string[];
  createdAt: string;
}

interface BriefingRow {
  id: number;
  content: string;
  topic_snapshot: string;
  content_ids: string;
  created_at: string;
}

function rowToBriefing(row: BriefingRow): Briefing {
  return {
    id: row.id,
    content: row.content,
    topicSnapshot: JSON.parse(row.topic_snapshot),
    contentIds: JSON.parse(row.content_ids),
    createdAt: row.created_at,
  };
}

export function getTopicVelocities(previousContentIds: string[]): TopicVelocity[] {
  const previousSet = new Set(previousContentIds);
  const topics = listTopics();

  return topics
    .map((topic) => ({
      slug: topic.slug,
      name: topic.name,
      contentCount: topic.contentIds.length,
      newCount: topic.contentIds.filter((id) => !previousSet.has(id)).length,
      hasSynthesis: !!topic.synthesis,
    }))
    .sort((a, b) => b.newCount - a.newCount || b.contentCount - a.contentCount);
}

export function buildBriefingPrompt(
  velocities: TopicVelocity[],
  recentItems: SynthesisInput[],
  topicSyntheses: { name: string; synthesis: string }[],
  previousBriefing?: string
): string {
  const sections: string[] = [];

  sections.push(
    `You are an intelligence analyst producing a bold, opinionated briefing about trends across a personal knowledge base. Be decisive, not neutral. Take positions.`
  );

  if (velocities.length > 0) {
    const velocityLines = velocities.map((v) => {
      const arrow = v.newCount > 0 ? "▲" : "—";
      return `- ${v.name}: ${v.contentCount} items total, +${v.newCount} new ${arrow}${v.hasSynthesis ? " (synthesized)" : ""}`;
    });
    sections.push(`TOPIC VELOCITY:\n${velocityLines.join("\n")}`);
  }

  if (topicSyntheses.length > 0) {
    const synthLines = topicSyntheses.map(
      (ts) => `### ${ts.name}\n${ts.synthesis}`
    );
    sections.push(`TOPIC SYNTHESES (existing analytical understanding):\n${synthLines.join("\n\n")}`);
  }

  if (recentItems.length > 0) {
    const itemLines = recentItems.map((item) => {
      const parts = [`### ${item.title} (by ${item.author})`, `**Summary:** ${item.summary}`];
      if (item.claims.length > 0) {
        parts.push("**Claims:**");
        parts.push(...item.claims.map((c) => `  - ${c}`));
      }
      return parts.join("\n");
    });
    sections.push(`NEW CONTENT SINCE LAST BRIEFING:\n${itemLines.join("\n\n")}`);
  }

  if (previousBriefing) {
    sections.push(`PREVIOUS BRIEFING (for context on what was already covered):\n---\n${previousBriefing}\n---`);
  }

  sections.push(`Produce a briefing with exactly these sections:

## Headline
One bold sentence — the single most important insight right now.

## What's Heating Up
Which topics are gaining momentum and what the convergence means. (2-4 bullets)

## Conservative
Well-supported, safe conclusions from the data. (2-4 bullets)

## Bold
Strong analytical claims with extrapolation. Be opinionated. (2-4 bullets)

## Moonshot
Speculative, high-risk/high-reward predictions. Swing big. (1-3 bullets)

## Look Into This
Specific, actionable suggestions. "You should explore X because Y." (2-4 bullets)

Keep it concise and scannable. The entire briefing should fit on one screen.`);

  return sections.join("\n\n");
}

export function getLatestBriefing(): Briefing | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM briefings ORDER BY id DESC LIMIT 1")
    .get() as BriefingRow | undefined;
  if (!row) return undefined;
  return rowToBriefing(row);
}

export function listBriefings(): Briefing[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM briefings ORDER BY id DESC")
    .all() as BriefingRow[];
  return rows.map(rowToBriefing);
}

export function saveBriefing(
  content: string,
  topicSnapshot: TopicVelocity[],
  contentIds: string[]
): Briefing {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      "INSERT INTO briefings (content, topic_snapshot, content_ids, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(content, JSON.stringify(topicSnapshot), JSON.stringify(contentIds), now);

  const row = db
    .prepare("SELECT * FROM briefings WHERE id = ?")
    .get(result.lastInsertRowid) as BriefingRow;

  return rowToBriefing(row);
}

export async function generateBriefing(): Promise<Briefing> {
  const allAccepted = listLibrary();
  if (allAccepted.length === 0) {
    throw new Error("No accepted content in the knowledge base");
  }

  const allContentIds = allAccepted.map((c) => c.id);
  const previous = getLatestBriefing();
  const previousContentIds = previous?.contentIds ?? [];

  const previousSet = new Set(previousContentIds);
  const newContentIds = allContentIds.filter((id) => !previousSet.has(id));

  if (previous && newContentIds.length === 0) {
    throw new Error("No new content since last briefing");
  }

  const velocities = getTopicVelocities(previousContentIds);

  // Gather recent content summaries (new items only)
  const recentItems: SynthesisInput[] = newContentIds
    .map((id) => {
      const item = getContent(id);
      if (!item) return undefined;
      return { title: item.title, author: item.author, summary: item.summary, claims: item.claims };
    })
    .filter((x): x is SynthesisInput => !!x);

  // Gather topic syntheses for topics with new content
  const topics = listTopics();
  const topicSyntheses = topics
    .filter((t) => t.synthesis)
    .map((t) => ({ name: t.name, synthesis: t.synthesis! }));

  const prompt = buildBriefingPrompt(
    velocities,
    recentItems,
    topicSyntheses,
    previous?.content
  );

  const content = await callClaude(prompt);
  return saveBriefing(content, velocities, allContentIds);
}
