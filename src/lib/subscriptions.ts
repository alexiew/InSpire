// ABOUTME: Manages subscriptions to YouTube channels, podcast feeds, and blog feeds.
// ABOUTME: Provides CRUD for subscriptions and auto-ingestion of new content.

import { getDb } from "./db";
import { createContent, updateContent } from "./content";
import { fetchChannelVideos } from "./youtube";
import { fetchPodcastFeed } from "./podcast";
import { fetchBlogFeed } from "./blog";
import { processContent } from "./process-content";

export interface Subscription {
  id: number;
  sourceType: string;
  sourceIdentifier: string;
  name: string;
  extractionHints: string;
  subscribedAt: string;
  lastCheckedAt: string | null;
}

interface SubscriptionRow {
  id: number;
  source_type: string;
  source_identifier: string;
  name: string;
  extraction_hints: string;
  subscribed_at: string;
  last_checked_at: string | null;
}

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceIdentifier: row.source_identifier,
    name: row.name,
    extractionHints: row.extraction_hints,
    subscribedAt: row.subscribed_at,
    lastCheckedAt: row.last_checked_at,
  };
}

export function listSubscriptions(): Subscription[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM subscriptions ORDER BY subscribed_at DESC")
    .all() as SubscriptionRow[];
  return rows.map(rowToSubscription);
}

export function createSubscription(sourceType: string, sourceIdentifier: string, name: string, extractionHints?: string): Subscription {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO subscriptions (source_type, source_identifier, name, extraction_hints, subscribed_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(sourceType, sourceIdentifier, name, extractionHints || "", now);

  return rowToSubscription(
    db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(result.lastInsertRowid) as SubscriptionRow
  );
}

export function updateSubscription(id: number, updates: { extractionHints?: string }): Subscription | undefined {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as SubscriptionRow | undefined;
  if (!existing) return undefined;

  if (updates.extractionHints !== undefined) {
    db.prepare("UPDATE subscriptions SET extraction_hints = ? WHERE id = ?").run(updates.extractionHints, id);
  }

  return rowToSubscription(
    db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as SubscriptionRow
  );
}

export function deleteSubscription(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM subscriptions WHERE id = ?").run(id);
  return result.changes > 0;
}

export function markChecked(id: number): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare("UPDATE subscriptions SET last_checked_at = ? WHERE id = ?").run(now, id);
}

export function contentExists(videoId: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM content WHERE source_id = ?")
    .get(videoId);
  return !!row;
}

const DEFAULT_MAX_ITEMS = 15;

export async function checkSubscription(id: number, maxItems?: number): Promise<number> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM subscriptions WHERE id = ?")
    .get(id) as SubscriptionRow | undefined;

  if (!row) return 0;

  const limit = maxItems ?? DEFAULT_MAX_ITEMS;
  let ingested: number;
  if (row.source_type === "podcast") {
    ingested = await checkPodcastSubscription(row, limit);
  } else if (row.source_type === "blog") {
    ingested = await checkBlogSubscription(row, limit);
  } else {
    ingested = await checkYouTubeSubscription(row, limit);
  }

  markChecked(id);
  return ingested;
}

async function checkYouTubeSubscription(row: SubscriptionRow, maxItems: number): Promise<number> {
  const videos = await fetchChannelVideos(row.source_identifier, maxItems);
  let ingested = 0;

  for (const video of videos) {
    if (contentExists(video.videoId)) continue;

    const url = `https://www.youtube.com/watch?v=${video.videoId}`;
    const item = createContent(url, video.videoId, "youtube");
    if (row.extraction_hints) {
      updateContent(item.id, { extractionHints: row.extraction_hints });
    }
    processContent(item.id).catch(() => {});
    ingested++;
  }

  return ingested;
}

async function checkPodcastSubscription(row: SubscriptionRow, maxItems: number): Promise<number> {
  const feed = await fetchPodcastFeed(row.source_identifier);
  let ingested = 0;

  for (const episode of feed.episodes.slice(0, maxItems)) {
    if (contentExists(episode.guid)) continue;

    const item = createContent(episode.enclosureUrl, episode.guid, "podcast");
    updateContent(item.id, {
      title: episode.title,
      author: feed.title,
      thumbnailUrl: feed.imageUrl,
      ...(row.extraction_hints ? { extractionHints: row.extraction_hints } : {}),
    });
    processContent(item.id).catch(() => {});
    ingested++;
  }

  return ingested;
}

async function checkBlogSubscription(row: SubscriptionRow, maxItems: number): Promise<number> {
  const feed = await fetchBlogFeed(row.source_identifier);
  let ingested = 0;

  for (const article of feed.articles.slice(0, maxItems)) {
    if (contentExists(article.guid)) continue;

    const item = createContent(article.url, article.guid, "blog");
    updateContent(item.id, {
      title: article.title,
      author: feed.title,
      ...(row.extraction_hints ? { extractionHints: row.extraction_hints } : {}),
    });
    processContent(item.id).catch(() => {});
    ingested++;
  }

  return ingested;
}
