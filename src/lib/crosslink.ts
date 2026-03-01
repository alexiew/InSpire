// ABOUTME: Finds existing content items related to a topic using AI analysis.
// ABOUTME: Sends summaries to Claude, returns IDs of relevant items.

import { listContent } from "./content";
import { getTopic } from "./topics";
import { callClaude } from "./claude";

export function parseCrosslinkResponse(raw: string, candidateIds: string[]): string[] {
  // Try to extract JSON array from fenced block or bare JSON
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const jsonStr = fenced ? fenced[1].trim() : raw.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    const candidateSet = new Set(candidateIds);
    return parsed.filter((id): id is string => typeof id === "string" && candidateSet.has(id));
  } catch {
    return [];
  }
}

export interface CrosslinkCandidate {
  id: string;
  title: string;
  summary: string;
}

export async function findRelatedContent(topicSlug: string): Promise<CrosslinkCandidate[]> {
  const topic = getTopic(topicSlug);
  if (!topic) return [];

  const allContent = listContent();
  const existingIds = new Set(topic.contentIds);

  // Candidates: ready items not already in this topic, with summaries
  const candidates = allContent.filter(
    (item) => item.status === "ready" && !existingIds.has(item.id) && item.summary
  );

  if (candidates.length === 0) return [];

  const itemList = candidates
    .map((item) => `ID: ${item.id}\nTitle: ${item.title}\nSummary: ${item.summary}\n`)
    .join("\n---\n");

  const prompt = `You are analyzing a personal knowledge database. The user has a topic called "${topic.name}".

Below are summaries of content items NOT yet tagged with this topic. Identify which items contain information relevant to "${topic.name}" — even if the connection is indirect or the topic is only partially covered.

Return ONLY a JSON array of the relevant item IDs. If none are relevant, return an empty array [].

Content items:

${itemList}`;

  const raw = await callClaude(prompt);
  const relevantIds = parseCrosslinkResponse(raw, candidates.map((c) => c.id));

  return candidates
    .filter((c) => relevantIds.includes(c.id))
    .map((c) => ({ id: c.id, title: c.title, summary: c.summary }));
}
