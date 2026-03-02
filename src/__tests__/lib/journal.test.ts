// ABOUTME: Tests for journal entry CRUD operations.
// ABOUTME: Verifies creating, listing, and deleting journal entries.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { closeDb } from "@/lib/db";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "inspire-test-"));
  process.env.INSPIRE_DATA_DIR = tmpDir;
});

afterEach(() => {
  closeDb();
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.INSPIRE_DATA_DIR;
});

async function loadModules() {
  const journal = await import("@/lib/journal");
  const content = await import("@/lib/content");
  return { ...journal, ...content };
}

describe("createJournalEntry", () => {
  it("creates an entry linked to content", async () => {
    const { createJournalEntry, createContent } = await loadModules();

    const c = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    const entry = createJournalEntry(c.id, "Vitamin D is essential for immune function");

    expect(entry.id).toBeTruthy();
    expect(entry.contentId).toBe(c.id);
    expect(entry.text).toBe("Vitamin D is essential for immune function");
    expect(entry.createdAt).toBeTruthy();
  });

  it("creates an entry without content link", async () => {
    const { createJournalEntry } = await loadModules();

    const entry = createJournalEntry(null, "A freeform thought");
    expect(entry.contentId).toBeNull();
    expect(entry.text).toBe("A freeform thought");
  });
});

describe("listJournalEntries", () => {
  it("returns entries in reverse chronological order", async () => {
    const { createJournalEntry, listJournalEntries } = await loadModules();

    createJournalEntry(null, "First");
    createJournalEntry(null, "Second");

    const entries = listJournalEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].text).toBe("Second");
    expect(entries[1].text).toBe("First");
  });

  it("includes content title when linked", async () => {
    const { createJournalEntry, listJournalEntries, createContent, updateContent } =
      await loadModules();

    const c = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c.id, { title: "Sleep Optimization" });
    createJournalEntry(c.id, "Melatonin peaks at 2am");

    const entries = listJournalEntries();
    expect(entries[0].contentTitle).toBe("Sleep Optimization");
  });

  it("returns empty array when no entries exist", async () => {
    const { listJournalEntries } = await loadModules();
    expect(listJournalEntries()).toEqual([]);
  });
});

describe("deleteJournalEntry", () => {
  it("deletes an entry and returns true", async () => {
    const { createJournalEntry, deleteJournalEntry, listJournalEntries } =
      await loadModules();

    const entry = createJournalEntry(null, "To be deleted");
    expect(deleteJournalEntry(entry.id)).toBe(true);
    expect(listJournalEntries()).toHaveLength(0);
  });

  it("returns false for nonexistent id", async () => {
    const { deleteJournalEntry } = await loadModules();
    expect(deleteJournalEntry(999)).toBe(false);
  });
});
