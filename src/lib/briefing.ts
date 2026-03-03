// ABOUTME: Intelligence briefing generation for the Newsroom dashboard.
// ABOUTME: Computes topic and people velocity, builds prompts, and stores briefings in SQLite.

import { callClaude } from "./claude";
import { getDb } from "./db";
import { getContent, listLibrary } from "./content";
import { listPeople } from "./people";
import { listTopics } from "./topics";
import type { SynthesisInput } from "./synthesize";

export interface Velocity {
  slug: string;
  name: string;
  contentCount: number;
  baselineRatio: number;
  recentRatio: number;
  velocity: number;
}

export interface TopicVelocity extends Velocity {
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

const WINDOW_SIZE = 50;
const MIN_KB_SIZE = 30;
const MIN_ENTITY_SIZE = 3;

interface VelocityInput {
  slug: string;
  name: string;
  contentIds: string[];
}

function computeVelocity(
  entities: VelocityInput[],
  totalCount: number,
  recentIds: Set<string>,
  windowSize: number
): Velocity[] {
  return entities
    .filter((e) => e.contentIds.length >= MIN_ENTITY_SIZE)
    .map((entity) => {
      const baselineRatio = entity.contentIds.length / totalCount;
      const recentCount = entity.contentIds.filter((id) => recentIds.has(id)).length;
      const recentRatio = recentCount / windowSize;
      const velocity = baselineRatio > 0 ? recentRatio / baselineRatio : 0;

      return {
        slug: entity.slug,
        name: entity.name,
        contentCount: entity.contentIds.length,
        baselineRatio,
        recentRatio,
        velocity,
      };
    })
    .sort((a, b) => Math.abs(b.velocity - 1) - Math.abs(a.velocity - 1));
}

function getVelocityWindow(): { totalCount: number; recentIds: Set<string>; windowSize: number } | null {
  const allAccepted = listLibrary();
  if (allAccepted.length < MIN_KB_SIZE) return null;

  const windowSize = Math.min(WINDOW_SIZE, allAccepted.length);
  const recentIds = new Set(allAccepted.slice(0, windowSize).map((c) => c.id));
  return { totalCount: allAccepted.length, recentIds, windowSize };
}

export function computeTopicVelocity(): TopicVelocity[] {
  const window = getVelocityWindow();
  if (!window) return [];

  const topics = listTopics();
  const base = computeVelocity(topics, window.totalCount, window.recentIds, window.windowSize);

  return base.map((v) => {
    const topic = topics.find((t) => t.slug === v.slug)!;
    return { ...v, hasSynthesis: !!topic.synthesis };
  });
}

export function computePeopleVelocity(): Velocity[] {
  const window = getVelocityWindow();
  if (!window) return [];

  const people = listPeople();
  return computeVelocity(people, window.totalCount, window.recentIds, window.windowSize);
}

function formatVelocityLines(velocities: Velocity[]): string[] {
  return velocities.map((v) => {
    const arrow = v.velocity > 1.5 ? "▲" : v.velocity < 0.5 ? "▼" : "—";
    const baseline = `${Math.round(v.baselineRatio * 100)}%`;
    const recent = `${Math.round(v.recentRatio * 100)}%`;
    return `- ${v.name}: ${v.contentCount} items, baseline ${baseline}, recent ${recent} (${v.velocity.toFixed(1)}x ${arrow})`;
  });
}

export function buildBriefingPrompt(
  velocities: TopicVelocity[],
  recentItems: SynthesisInput[],
  topicSyntheses: { name: string; synthesis: string }[],
  previousBriefing?: string,
  peopleVelocities?: Velocity[]
): string {
  const sections: string[] = [];

  sections.push(
    `You are an intelligence analyst producing a bold, opinionated briefing about trends across a personal knowledge base. Be decisive, not neutral. Take positions.`
  );

  if (velocities.length > 0) {
    const lines = formatVelocityLines(velocities).map((line, i) =>
      velocities[i].hasSynthesis ? `${line} (synthesized)` : line
    );
    sections.push(`TOPIC VELOCITY:\n${lines.join("\n")}`);
  }

  if (peopleVelocities && peopleVelocities.length > 0) {
    const lines = formatVelocityLines(peopleVelocities);
    sections.push(`PEOPLE VELOCITY:\n${lines.join("\n")}`);
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

  const velocities = computeTopicVelocity();
  const peopleVelocities = computePeopleVelocity();

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
    previous?.content,
    peopleVelocities
  );

  const content = await callClaude(prompt);
  return saveBriefing(content, velocities, allContentIds);
}
