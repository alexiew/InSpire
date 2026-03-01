// ABOUTME: Reads and writes video metadata from data/videos.json.
// ABOUTME: Provides CRUD operations for processed YouTube videos.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

function getDataPath(): string {
  const base = process.env.INSPIRE_DATA_DIR || process.cwd();
  return path.join(base, "data", "videos.json");
}

export type VideoStatus = "processing" | "ready" | "error";

export interface Video {
  id: string;
  url: string;
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  transcript: string;
  summary: string;
  status: VideoStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface VideosData {
  videos: Video[];
}

function readData(): VideosData {
  const dataPath = getDataPath();
  if (!existsSync(dataPath)) {
    return { videos: [] };
  }
  const raw = readFileSync(dataPath, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: VideosData): void {
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

export function listVideos(): Video[] {
  const { videos } = readData();
  return videos.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getVideo(id: string): Video | undefined {
  const { videos } = readData();
  return videos.find((v) => v.id === id);
}

export function createVideo(url: string, videoId: string): Video {
  const data = readData();
  const now = new Date().toISOString();
  const video: Video = {
    id: generateId(),
    url,
    videoId,
    title: "",
    author: "",
    thumbnailUrl: "",
    transcript: "",
    summary: "",
    status: "processing",
    createdAt: now,
    updatedAt: now,
  };
  data.videos.push(video);
  writeData(data);
  return video;
}

export function updateVideo(
  id: string,
  updates: Partial<Omit<Video, "id" | "createdAt">>
): Video | undefined {
  const data = readData();
  const index = data.videos.findIndex((v) => v.id === id);
  if (index === -1) return undefined;

  data.videos[index] = {
    ...data.videos[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeData(data);
  return data.videos[index];
}

export function deleteVideo(id: string): boolean {
  const data = readData();
  const index = data.videos.findIndex((v) => v.id === id);
  if (index === -1) return false;

  data.videos.splice(index, 1);
  writeData(data);
  return true;
}
