// ABOUTME: SQLite database connection management and schema initialization.
// ABOUTME: Provides getDb() for cached access and closeDb() for test isolation.

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import path from "path";

let _db: Database.Database | null = null;

function getDbPath(): string {
  const base = process.env.INSPIRE_DATA_DIR || process.cwd();
  return path.join(base, "data", "inspire.db");
}

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function migrateNonAcceptedTopicsAndPeople(db: Database.Database): void {
  // Move join table data for non-accepted content into pending columns
  const nonAccepted = db.prepare(
    "SELECT id FROM content WHERE status != 'accepted'"
  ).all() as { id: string }[];

  for (const { id } of nonAccepted) {
    const topicNames = (db.prepare(
      `SELECT t.name FROM content_topics ct
       JOIN topics t ON t.slug = ct.topic_slug
       WHERE ct.content_id = ?`
    ).all(id) as { name: string }[]).map(r => r.name);

    const peopleNames = (db.prepare(
      `SELECT p.name FROM content_people cp
       JOIN people p ON p.id = cp.person_id
       WHERE cp.content_id = ?`
    ).all(id) as { name: string }[]).map(r => r.name);

    if (topicNames.length > 0) {
      db.prepare("UPDATE content SET pending_topics = ? WHERE id = ?").run(
        JSON.stringify(topicNames), id
      );
      db.prepare("DELETE FROM content_topics WHERE content_id = ?").run(id);
    }

    if (peopleNames.length > 0) {
      db.prepare("UPDATE content SET pending_people = ? WHERE id = ?").run(
        JSON.stringify(peopleNames), id
      );
      db.prepare("DELETE FROM content_people WHERE content_id = ?").run(id);
    }
  }

  // Clean up orphaned topics (no join table refs, no synthesis)
  db.prepare(
    `DELETE FROM topics WHERE slug NOT IN (SELECT topic_slug FROM content_topics)
     AND synthesis IS NULL`
  ).run();
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'youtube',
      title TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      transcript TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      claims TEXT NOT NULL DEFAULT '[]',
      extraction_hints TEXT NOT NULL DEFAULT '',
      pending_topics TEXT NOT NULL DEFAULT '[]',
      pending_people TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'processing',
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS topics (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      synthesis TEXT,
      synthesized_at TEXT,
      category_id INTEGER REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS content_topics (
      content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      topic_slug TEXT NOT NULL REFERENCES topics(slug) ON DELETE CASCADE,
      PRIMARY KEY (content_id, topic_slug)
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS content_people (
      content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      PRIMARY KEY (content_id, person_id)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      source_identifier TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      extraction_hints TEXT NOT NULL DEFAULT '',
      subscribed_at TEXT NOT NULL,
      last_checked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS synthesis_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_slug TEXT NOT NULL REFERENCES topics(slug) ON DELETE CASCADE,
      synthesis TEXT NOT NULL,
      content_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id TEXT REFERENCES content(id) ON DELETE SET NULL,
      source TEXT,
      text TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      topic_snapshot TEXT NOT NULL DEFAULT '[]',
      content_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
  `);

  // FTS5 virtual table — CREATE VIRTUAL TABLE doesn't support IF NOT EXISTS
  // so check if it already exists first
  const ftsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='content_fts'")
    .get();

  // Migrations for existing databases
  const peopleColumns = db.prepare("PRAGMA table_info(people)").all() as { name: string }[];
  if (!peopleColumns.some((c) => c.name === "slug")) {
    db.exec("ALTER TABLE people ADD COLUMN slug TEXT NOT NULL DEFAULT ''");
  }

  const contentColumns = db.prepare("PRAGMA table_info(content)").all() as { name: string }[];
  if (!contentColumns.some((c) => c.name === "extraction_hints")) {
    db.exec("ALTER TABLE content ADD COLUMN extraction_hints TEXT NOT NULL DEFAULT ''");
  }
  if (!contentColumns.some((c) => c.name === "pending_topics")) {
    db.exec("ALTER TABLE content ADD COLUMN pending_topics TEXT NOT NULL DEFAULT '[]'");
    db.exec("ALTER TABLE content ADD COLUMN pending_people TEXT NOT NULL DEFAULT '[]'");
    migrateNonAcceptedTopicsAndPeople(db);
  }

  const subColumns = db.prepare("PRAGMA table_info(subscriptions)").all() as { name: string }[];
  if (!subColumns.some((c) => c.name === "extraction_hints")) {
    db.exec("ALTER TABLE subscriptions ADD COLUMN extraction_hints TEXT NOT NULL DEFAULT ''");
  }

  const journalColumns = db.prepare("PRAGMA table_info(journal_entries)").all() as { name: string }[];
  if (!journalColumns.some((c) => c.name === "source")) {
    db.exec("ALTER TABLE journal_entries ADD COLUMN source TEXT");
  }

  const synthHistColumns = db.prepare("PRAGMA table_info(synthesis_history)").all() as { name: string }[];
  if (!synthHistColumns.some((c) => c.name === "content_ids")) {
    db.exec("ALTER TABLE synthesis_history ADD COLUMN content_ids TEXT NOT NULL DEFAULT '[]'");
  }

  // One-time migration: 'ready' → 'accepted' for pre-lifecycle content.
  // Only runs when no content has 'accepted' status yet (i.e., migration hasn't been applied).
  const hasAccepted = db.prepare("SELECT 1 FROM content WHERE status = 'accepted' LIMIT 1").get();
  if (!hasAccepted) {
    db.exec("UPDATE content SET status = 'accepted' WHERE status = 'ready'");
  }

  if (!ftsExists) {
    db.exec(`
      CREATE VIRTUAL TABLE content_fts USING fts5(
        title, summary, transcript, content='content', content_rowid='rowid'
      );

      CREATE TRIGGER content_ai AFTER INSERT ON content BEGIN
        INSERT INTO content_fts(rowid, title, summary, transcript)
        VALUES (NEW.rowid, NEW.title, NEW.summary, NEW.transcript);
      END;

      CREATE TRIGGER content_ad AFTER DELETE ON content BEGIN
        INSERT INTO content_fts(content_fts, rowid, title, summary, transcript)
        VALUES ('delete', OLD.rowid, OLD.title, OLD.summary, OLD.transcript);
      END;

      CREATE TRIGGER content_au AFTER UPDATE ON content BEGIN
        INSERT INTO content_fts(content_fts, rowid, title, summary, transcript)
        VALUES ('delete', OLD.rowid, OLD.title, OLD.summary, OLD.transcript);
        INSERT INTO content_fts(rowid, title, summary, transcript)
        VALUES (NEW.rowid, NEW.title, NEW.summary, NEW.transcript);
      END;
    `);
  }
}
