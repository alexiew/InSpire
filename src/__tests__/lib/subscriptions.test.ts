// ABOUTME: Tests for subscription CRUD operations.
// ABOUTME: Verifies listing, creation, deletion, due-check logic, and podcast support.

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
  const subscriptions = await import("@/lib/subscriptions");
  const content = await import("@/lib/content");
  return { ...subscriptions, ...content };
}

describe("listSubscriptions", () => {
  it("returns empty array when no subscriptions exist", async () => {
    const { listSubscriptions } = await loadModules();
    expect(listSubscriptions()).toEqual([]);
  });
});

describe("createSubscription", () => {
  it("creates a youtube subscription and retrieves it", async () => {
    const { createSubscription, listSubscriptions } = await loadModules();

    const sub = createSubscription("youtube", "UC1234567890abcdefghij", "Huberman Lab");
    expect(sub.sourceIdentifier).toBe("UC1234567890abcdefghij");
    expect(sub.name).toBe("Huberman Lab");
    expect(sub.sourceType).toBe("youtube");
    expect(sub.subscribedAt).toBeTruthy();
    expect(sub.lastCheckedAt).toBeNull();

    const all = listSubscriptions();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Huberman Lab");
  });

  it("creates a podcast subscription", async () => {
    const { createSubscription } = await loadModules();

    const sub = createSubscription("podcast", "https://feeds.example.com/mypod", "My Podcast");
    expect(sub.sourceType).toBe("podcast");
    expect(sub.sourceIdentifier).toBe("https://feeds.example.com/mypod");
    expect(sub.name).toBe("My Podcast");
  });

  it("rejects duplicate source identifiers", async () => {
    const { createSubscription } = await loadModules();
    createSubscription("youtube", "UC1234567890abcdefghij", "Channel A");
    expect(() => createSubscription("youtube", "UC1234567890abcdefghij", "Channel B")).toThrow();
  });
});

describe("deleteSubscription", () => {
  it("deletes a subscription and returns true", async () => {
    const { createSubscription, deleteSubscription, listSubscriptions } =
      await loadModules();

    const sub = createSubscription("youtube", "UC1234567890abcdefghij", "Test");
    expect(deleteSubscription(sub.id)).toBe(true);
    expect(listSubscriptions()).toHaveLength(0);
  });

  it("returns false for nonexistent id", async () => {
    const { deleteSubscription } = await loadModules();
    expect(deleteSubscription(999)).toBe(false);
  });
});

describe("getDueSubscriptions", () => {
  it("returns subscriptions never checked", async () => {
    const { createSubscription, getDueSubscriptions } = await loadModules();
    createSubscription("youtube", "UC1234567890abcdefghij", "Test");

    const due = getDueSubscriptions();
    expect(due).toHaveLength(1);
  });

  it("excludes recently checked subscriptions", async () => {
    const { createSubscription, markChecked, getDueSubscriptions } =
      await loadModules();

    const sub = createSubscription("youtube", "UC1234567890abcdefghij", "Test");
    markChecked(sub.id);

    const due = getDueSubscriptions();
    expect(due).toHaveLength(0);
  });
});

describe("contentExists", () => {
  it("returns false when source_id not in database", async () => {
    const { contentExists } = await loadModules();
    expect(contentExists("nonexistent_id")).toBe(false);
  });

  it("returns true when youtube video already ingested", async () => {
    const { createContent, contentExists } = await loadModules();
    createContent("https://youtube.com/watch?v=abc123def45", "abc123def45", "youtube");
    expect(contentExists("abc123def45")).toBe(true);
  });

  it("returns true when podcast episode already ingested", async () => {
    const { createContent, contentExists } = await loadModules();
    createContent("https://example.com/ep1.mp3", "ep-001-guid", "podcast");
    expect(contentExists("ep-001-guid")).toBe(true);
  });
});
