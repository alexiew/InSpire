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
      name TEXT NOT NULL UNIQUE
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
      subscribed_at TEXT NOT NULL,
      last_checked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS synthesis_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_slug TEXT NOT NULL REFERENCES topics(slug) ON DELETE CASCADE,
      synthesis TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // FTS5 virtual table — CREATE VIRTUAL TABLE doesn't support IF NOT EXISTS
  // so check if it already exists first
  const ftsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='content_fts'")
    .get();

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
