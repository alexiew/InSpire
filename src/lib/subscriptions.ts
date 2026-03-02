// ABOUTME: Manages YouTube channel subscriptions and feed checking.
// ABOUTME: Provides CRUD for subscriptions and auto-ingestion of new videos.

import { getDb } from "./db";
import { createContent } from "./content";
import { fetchChannelVideos } from "./youtube";
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

export function createSubscription(channelId: string, name: string): Subscription {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO subscriptions (source_type, source_identifier, name, subscribed_at)
       VALUES ('youtube', ?, ?, ?)`
    )
    .run(channelId, name, now);

  return rowToSubscription(
    db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(result.lastInsertRowid) as SubscriptionRow
  );
}

export function deleteSubscription(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM subscriptions WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getDueSubscriptions(): Subscription[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE last_checked_at IS NULL
          OR last_checked_at < datetime('now', '-7 days')
       ORDER BY last_checked_at ASC`
    )
    .all() as SubscriptionRow[];
  return rows.map(rowToSubscription);
}

export function markChecked(id: number): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare("UPDATE subscriptions SET last_checked_at = ? WHERE id = ?").run(now, id);
}

export function contentExistsForVideo(videoId: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM content WHERE source_id = ?")
    .get(videoId);
  return !!row;
}

export async function checkSubscription(id: number): Promise<number> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM subscriptions WHERE id = ?")
    .get(id) as SubscriptionRow | undefined;

  if (!row) return 0;

  const videos = await fetchChannelVideos(row.source_identifier);
  let ingested = 0;

  for (const video of videos) {
    if (contentExistsForVideo(video.videoId)) continue;

    const url = `https://www.youtube.com/watch?v=${video.videoId}`;
    const item = createContent(url, video.videoId, "youtube");
    processContent(item.id).catch(() => {});
    ingested++;
  }

  markChecked(id);
  return ingested;
}

let lastAutoCheck = 0;
const AUTO_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

export function maybeCheckSubscriptions(): void {
  const now = Date.now();
  if (now - lastAutoCheck < AUTO_CHECK_INTERVAL) return;
  lastAutoCheck = now;

  const due = getDueSubscriptions();
  for (const sub of due) {
    checkSubscription(sub.id).catch(() => {});
  }
}
