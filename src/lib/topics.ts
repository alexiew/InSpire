// ABOUTME: Manages the topic index derived from content items.
// ABOUTME: Rebuilds topics from content, provides CRUD for topic data.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { listContent } from "./content";

export interface Topic {
  slug: string;
  name: string;
  contentIds: string[];
  synthesis?: string;
  synthesizedAt?: string;
}

interface TopicsData {
  topics: Topic[];
}

function getDataPath(): string {
  const base = process.env.INSPIRE_DATA_DIR || process.cwd();
  return path.join(base, "data", "topics.json");
}

function readData(): TopicsData {
  const dataPath = getDataPath();
  if (!existsSync(dataPath)) {
    return { topics: [] };
  }
  const raw = readFileSync(dataPath, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: TopicsData): void {
  const dataPath = getDataPath();
  const dir = path.dirname(dataPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function rebuildTopicIndex(): void {
  const items = listContent();
  const oldData = readData();

  // Build a map of existing synthesis data keyed by slug
  const existingSynthesis = new Map<string, { synthesis?: string; synthesizedAt?: string }>();
  for (const topic of oldData.topics) {
    if (topic.synthesis) {
      existingSynthesis.set(topic.slug, {
        synthesis: topic.synthesis,
        synthesizedAt: topic.synthesizedAt,
      });
    }
  }

  // Build topic map from content items
  const topicMap = new Map<string, { name: string; contentIds: string[] }>();

  for (const item of items) {
    if (item.status !== "ready") continue;

    for (const topicName of item.topics) {
      const slug = slugify(topicName);
      if (!topicMap.has(slug)) {
        topicMap.set(slug, { name: topicName, contentIds: [] });
      }
      topicMap.get(slug)!.contentIds.push(item.id);
    }
  }

  // Build topic list, preserving existing synthesis
  const topics: Topic[] = [];
  for (const [slug, { name, contentIds }] of topicMap) {
    const existing = existingSynthesis.get(slug);
    topics.push({
      slug,
      name,
      contentIds,
      synthesis: existing?.synthesis,
      synthesizedAt: existing?.synthesizedAt,
    });
  }

  writeData({ topics });
}

export function listTopics(): Topic[] {
  const { topics } = readData();
  return topics.sort((a, b) => b.contentIds.length - a.contentIds.length);
}

export function getTopic(slug: string): Topic | undefined {
  const { topics } = readData();
  return topics.find((t) => t.slug === slug);
}

export function updateTopicSynthesis(
  slug: string,
  synthesis: string
): Topic | undefined {
  const data = readData();
  const index = data.topics.findIndex((t) => t.slug === slug);
  if (index === -1) return undefined;

  data.topics[index].synthesis = synthesis;
  data.topics[index].synthesizedAt = new Date().toISOString();
  writeData(data);
  return data.topics[index];
}
