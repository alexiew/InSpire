// ABOUTME: Manages subscriptions to YouTube channels, podcast feeds, and blog feeds.
// ABOUTME: Provides CRUD for subscriptions and auto-ingestion of new content.

import { getDb } from "./db";
import { createContent, updateContent } from "./content";
import { fetchChannelVideos } from "./youtube";
import { fetchPodcastFeed } from "./podcast";
import { fetchBlogFeed } from "./blog";
import { processContent } from "./process-content";
import { getSetting } from "./settings";

export interface Subscription {
  id: number;
  sourceType: string;
  sourceIdentifier: string;
  name: string;
  extractionHints: string;
  excludeTerms: string;
  siloId?: number;
  subscribedAt: string;
  lastCheckedAt: string | null;
}

interface SubscriptionRow {
  id: number;
  source_type: string;
  source_identifier: string;
  name: string;
  extraction_hints: string;
  exclude_terms: string;
  silo_id: number | null;
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
    excludeTerms: row.exclude_terms,
    ...(row.silo_id != null ? { siloId: row.silo_id } : {}),
    subscribedAt: row.subscribed_at,
    lastCheckedAt: row.last_checked_at,
  };
}

export function listSubscriptions(siloId?: number): Subscription[] {
  const db = getDb();
  let rows: SubscriptionRow[];
  if (siloId !== undefined) {
    rows = db
      .prepare("SELECT * FROM subscriptions WHERE silo_id = ? ORDER BY subscribed_at DESC")
      .all(siloId) as SubscriptionRow[];
  } else {
    rows = db
      .prepare("SELECT * FROM subscriptions ORDER BY subscribed_at DESC")
      .all() as SubscriptionRow[];
  }
  return rows.map(rowToSubscription);
}

export function createSubscription(sourceType: string, sourceIdentifier: string, name: string, extractionHints?: string, excludeTerms?: string, siloId?: number): Subscription {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO subscriptions (source_type, source_identifier, name, extraction_hints, exclude_terms, subscribed_at, silo_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(sourceType, sourceIdentifier, name, extractionHints || "", excludeTerms || "", now, siloId ?? null);

  return rowToSubscription(
    db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(result.lastInsertRowid) as SubscriptionRow
  );
}

export function updateSubscription(id: number, updates: { extractionHints?: string; excludeTerms?: string }): Subscription | undefined {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as SubscriptionRow | undefined;
  if (!existing) return undefined;

  if (updates.extractionHints !== undefined) {
    db.prepare("UPDATE subscriptions SET extraction_hints = ? WHERE id = ?").run(updates.extractionHints, id);
  }
  if (updates.excludeTerms !== undefined) {
    db.prepare("UPDATE subscriptions SET exclude_terms = ? WHERE id = ?").run(updates.excludeTerms, id);
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

export function contentExists(sourceId: string, siloId?: number): boolean {
  const db = getDb();
  let row;
  if (siloId !== undefined) {
    row = db
      .prepare("SELECT id FROM content WHERE source_id = ? AND silo_id = ?")
      .get(sourceId, siloId);
  } else {
    row = db
      .prepare("SELECT id FROM content WHERE source_id = ? AND silo_id IS NULL")
      .get(sourceId);
  }
  return !!row;
}

export function titleMatchesExcludeTerms(title: string, excludeTerms: string): boolean {
  if (!excludeTerms) return false;
  const terms = excludeTerms.split(",").map((t) => t.trim()).filter(Boolean);
  if (terms.length === 0) return false;
  const titleLower = title.toLowerCase();
  return terms.some((term) => titleLower.includes(term.toLowerCase()));
}

const DEFAULT_MAX_ITEMS = 15;

export async function checkSubscription(id: number, maxItems?: number): Promise<number> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM subscriptions WHERE id = ?")
    .get(id) as SubscriptionRow | undefined;

  if (!row) return 0;

  const limit = maxItems ?? DEFAULT_MAX_ITEMS;
  const minWords = parseInt(getSetting("min_transcript_words", "0"), 10);
  let ingested: number;
  if (row.source_type === "podcast") {
    ingested = await checkPodcastSubscription(row, limit, minWords);
  } else if (row.source_type === "blog") {
    ingested = await checkBlogSubscription(row, limit, minWords);
  } else {
    ingested = await checkYouTubeSubscription(row, limit, minWords);
  }

  markChecked(id);
  return ingested;
}

async function checkYouTubeSubscription(row: SubscriptionRow, maxItems: number, minWords: number): Promise<number> {
  const videos = await fetchChannelVideos(row.source_identifier, maxItems);
  let ingested = 0;
  const siloId = row.silo_id ?? undefined;

  for (const video of videos) {
    if (contentExists(video.videoId, siloId)) continue;
    if (titleMatchesExcludeTerms(video.title, row.exclude_terms)) continue;

    const url = `https://www.youtube.com/watch?v=${video.videoId}`;
    const item = createContent(url, video.videoId, "youtube", siloId);
    if (row.extraction_hints) {
      updateContent(item.id, { extractionHints: row.extraction_hints });
    }
    processContent(item.id, minWords > 0 ? { minTranscriptWords: minWords } : undefined).catch(() => {});
    ingested++;
  }

  return ingested;
}

async function checkPodcastSubscription(row: SubscriptionRow, maxItems: number, minWords: number): Promise<number> {
  const feed = await fetchPodcastFeed(row.source_identifier);
  let ingested = 0;
  const siloId = row.silo_id ?? undefined;

  for (const episode of feed.episodes.slice(0, maxItems)) {
    if (contentExists(episode.guid, siloId)) continue;
    if (titleMatchesExcludeTerms(episode.title, row.exclude_terms)) continue;

    const item = createContent(episode.enclosureUrl, episode.guid, "podcast", siloId);
    updateContent(item.id, {
      title: episode.title,
      author: feed.title,
      thumbnailUrl: feed.imageUrl,
      ...(row.extraction_hints ? { extractionHints: row.extraction_hints } : {}),
    });
    processContent(item.id, minWords > 0 ? { minTranscriptWords: minWords } : undefined).catch(() => {});
    ingested++;
  }

  return ingested;
}

async function checkBlogSubscription(row: SubscriptionRow, maxItems: number, minWords: number): Promise<number> {
  const feed = await fetchBlogFeed(row.source_identifier);
  let ingested = 0;
  const siloId = row.silo_id ?? undefined;

  for (const article of feed.articles.slice(0, maxItems)) {
    if (contentExists(article.guid, siloId)) continue;
    if (titleMatchesExcludeTerms(article.title, row.exclude_terms)) continue;

    const item = createContent(article.url, article.guid, "blog", siloId);
    updateContent(item.id, {
      title: article.title,
      author: feed.title,
      ...(row.extraction_hints ? { extractionHints: row.extraction_hints } : {}),
    });
    processContent(item.id, minWords > 0 ? { minTranscriptWords: minWords } : undefined).catch(() => {});
    ingested++;
  }

  return ingested;
}
