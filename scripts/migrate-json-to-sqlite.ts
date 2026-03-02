// ABOUTME: One-time migration from JSON files to SQLite database.
// ABOUTME: Run with: npx tsx scripts/migrate-json-to-sqlite.ts

import { existsSync, readFileSync } from "fs";
import path from "path";
import { getDb, closeDb } from "../src/lib/db";
import { slugify } from "../src/lib/utils";

const dataDir = path.join(process.cwd(), "data");
const contentPath = path.join(dataDir, "content.json");
const topicsPath = path.join(dataDir, "topics.json");

interface JsonContentItem {
  id: string;
  url: string;
  sourceId: string;
  sourceType: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  transcript: string;
  summary: string;
  topics: string[];
  claims: string[];
  people: string[];
  status: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface JsonTopic {
  slug: string;
  name: string;
  contentIds: string[];
  synthesis?: string;
  synthesizedAt?: string;
}

function loadJson<T>(filePath: string, key: string): T[] {
  if (!existsSync(filePath)) {
    console.log(`  ${filePath} not found, skipping`);
    return [];
  }
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  return data[key] || [];
}

function migrate() {
  console.log("Starting JSON → SQLite migration...\n");

  const db = getDb();
  const items = loadJson<JsonContentItem>(contentPath, "items");
  const topics = loadJson<JsonTopic>(topicsPath, "topics");

  console.log(`Found ${items.length} content items and ${topics.length} topics\n`);

  const doMigrate = db.transaction(() => {
    // Insert content items
    const insertContent = db.prepare(
      `INSERT OR IGNORE INTO content
       (id, url, source_id, source_type, title, author, thumbnail_url,
        transcript, summary, claims, status, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of items) {
      insertContent.run(
        item.id, item.url, item.sourceId, item.sourceType,
        item.title, item.author, item.thumbnailUrl,
        item.transcript, item.summary, JSON.stringify(item.claims),
        item.status, item.error ?? null, item.createdAt, item.updatedAt
      );
      console.log(`  Content: ${item.title || item.id}`);
    }

    // Insert topics (from topics.json for synthesis data)
    const insertTopic = db.prepare(
      "INSERT OR IGNORE INTO topics (slug, name, synthesis, synthesized_at) VALUES (?, ?, ?, ?)"
    );

    for (const topic of topics) {
      insertTopic.run(topic.slug, topic.name, topic.synthesis ?? null, topic.synthesizedAt ?? null);
      console.log(`  Topic: ${topic.name}${topic.synthesis ? " (with synthesis)" : ""}`);
    }

    // Build content_topics from content items' topics arrays
    const insertContentTopic = db.prepare(
      "INSERT OR IGNORE INTO content_topics (content_id, topic_slug) VALUES (?, ?)"
    );
    const ensureTopic = db.prepare(
      "INSERT OR IGNORE INTO topics (slug, name) VALUES (?, ?)"
    );

    for (const item of items) {
      for (const topicName of item.topics) {
        const slug = slugify(topicName);
        ensureTopic.run(slug, topicName);
        insertContentTopic.run(item.id, slug);
      }
    }

    // Build people + content_people from content items' people arrays
    const insertPerson = db.prepare("INSERT OR IGNORE INTO people (name) VALUES (?)");
    const getPerson = db.prepare("SELECT id FROM people WHERE name = ?");
    const insertContentPerson = db.prepare(
      "INSERT OR IGNORE INTO content_people (content_id, person_id) VALUES (?, ?)"
    );

    for (const item of items) {
      for (const name of item.people) {
        insertPerson.run(name);
        const person = getPerson.get(name) as { id: number };
        insertContentPerson.run(item.id, person.id);
      }
    }

    // Insert synthesis history for topics that have synthesis
    const insertHistory = db.prepare(
      "INSERT INTO synthesis_history (topic_slug, synthesis, created_at) VALUES (?, ?, ?)"
    );
    for (const topic of topics) {
      if (topic.synthesis && topic.synthesizedAt) {
        insertHistory.run(topic.slug, topic.synthesis, topic.synthesizedAt);
      }
    }
  });

  doMigrate();

  const contentCount = (db.prepare("SELECT COUNT(*) as c FROM content").get() as { c: number }).c;
  const topicCount = (db.prepare("SELECT COUNT(*) as c FROM topics").get() as { c: number }).c;
  const peopleCount = (db.prepare("SELECT COUNT(*) as c FROM people").get() as { c: number }).c;

  console.log(`\nMigration complete:`);
  console.log(`  ${contentCount} content items`);
  console.log(`  ${topicCount} topics`);
  console.log(`  ${peopleCount} people`);
  console.log(`\nDatabase: ${path.join(dataDir, "inspire.db")}`);

  closeDb();
}

migrate();
