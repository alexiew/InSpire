// ABOUTME: Reads and writes content items from data/content.json.
// ABOUTME: Provides CRUD operations for processed content (YouTube videos, podcasts, articles).

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

function getDataPath(): string {
  const base = process.env.INSPIRE_DATA_DIR || process.cwd();
  return path.join(base, "data", "content.json");
}

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

interface ContentData {
  items: ContentItem[];
}

function readData(): ContentData {
  const dataPath = getDataPath();
  if (!existsSync(dataPath)) {
    return { items: [] };
  }
  const raw = readFileSync(dataPath, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: ContentData): void {
  const dataPath = getDataPath();
  const dir = path.dirname(dataPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function listContent(): ContentItem[] {
  const { items } = readData();
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getContent(id: string): ContentItem | undefined {
  const { items } = readData();
  return items.find((c) => c.id === id);
}

export function createContent(
  url: string,
  sourceId: string,
  sourceType: SourceType
): ContentItem {
  const data = readData();
  const now = new Date().toISOString();
  const item: ContentItem = {
    id: generateId(),
    url,
    sourceId,
    sourceType,
    title: "",
    author: "",
    thumbnailUrl: "",
    transcript: "",
    summary: "",
    topics: [],
    claims: [],
    people: [],
    status: "processing",
    createdAt: now,
    updatedAt: now,
  };
  data.items.push(item);
  writeData(data);
  return item;
}

export function updateContent(
  id: string,
  updates: Partial<Omit<ContentItem, "id" | "createdAt">>
): ContentItem | undefined {
  const data = readData();
  const index = data.items.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  data.items[index] = {
    ...data.items[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeData(data);
  return data.items[index];
}

export function deleteContent(id: string): boolean {
  const data = readData();
  const index = data.items.findIndex((c) => c.id === id);
  if (index === -1) return false;

  data.items.splice(index, 1);
  writeData(data);
  return true;
}
