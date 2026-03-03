// ABOUTME: Manages subscriptions to YouTube channels and podcast feeds.
// ABOUTME: Provides CRUD for subscriptions and auto-ingestion of new content.

import { getDb } from "./db";
import { createContent, updateContent } from "./content";
import { fetchChannelVideos } from "./youtube";
import { fetchPodcastFeed } from "./podcast";
import { processContent } from "./process-content";

export interface Subscription {
  id: number;
  sourceType: string;
  sourceIdentifier: string;
  name: string;
  subscribedAt: string;
  lastCheckedAt: string | null;
}

interface SubscriptionRow {
  id: number;
  source_type: string;
  source_identifier: string;
  name: string;
  subscribed_at: string;
  last_checked_at: string | null;
}

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceIdentifier: row.source_identifier,
    name: row.name,
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

export function createSubscription(sourceType: string, sourceIdentifier: string, name: string): Subscription {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO subscriptions (source_type, source_identifier, name, subscribed_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(sourceType, sourceIdentifier, name, now);

  return rowToSubscription(
    db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(result.lastInsertRowid) as SubscriptionRow
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

const MAX_EPISODES_PER_CHECK = 15;

export async function checkSubscription(id: number): Promise<number> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM subscriptions WHERE id = ?")
    .get(id) as SubscriptionRow | undefined;

  if (!row) return 0;

  const ingested = row.source_type === "podcast"
    ? await checkPodcastSubscription(row)
    : await checkYouTubeSubscription(row);

  markChecked(id);
  return ingested;
}

async function checkYouTubeSubscription(row: SubscriptionRow): Promise<number> {
  const videos = await fetchChannelVideos(row.source_identifier);
  let ingested = 0;

  for (const video of videos) {
    if (contentExists(video.videoId)) continue;

    const url = `https://www.youtube.com/watch?v=${video.videoId}`;
    const item = createContent(url, video.videoId, "youtube");
    processContent(item.id).catch(() => {});
    ingested++;
  }

  return ingested;
}

async function checkPodcastSubscription(row: SubscriptionRow): Promise<number> {
  const feed = await fetchPodcastFeed(row.source_identifier);
  let ingested = 0;

  for (const episode of feed.episodes.slice(0, MAX_EPISODES_PER_CHECK)) {
    if (contentExists(episode.guid)) continue;

    const item = createContent(episode.enclosureUrl, episode.guid, "podcast");
    updateContent(item.id, {
      title: episode.title,
      author: feed.title,
      thumbnailUrl: feed.imageUrl,
    });
    processContent(item.id).catch(() => {});
    ingested++;
  }

  return ingested;
}
