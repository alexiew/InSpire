// ABOUTME: Global application settings stored in SQLite.
// ABOUTME: Simple key-value store for configuration like subscription filters.

import { getDb } from "./db";

export function getSetting(key: string, defaultValue: string): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? defaultValue;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
