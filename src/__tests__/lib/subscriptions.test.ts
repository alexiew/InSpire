// ABOUTME: Tests for subscription CRUD operations.
// ABOUTME: Verifies listing, creation, deletion, and due-check logic.

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
  it("creates a subscription and retrieves it", async () => {
    const { createSubscription, listSubscriptions } = await loadModules();

    const sub = createSubscription("UC1234567890abcdefghij", "Huberman Lab");
    expect(sub.sourceIdentifier).toBe("UC1234567890abcdefghij");
    expect(sub.name).toBe("Huberman Lab");
    expect(sub.sourceType).toBe("youtube");
    expect(sub.subscribedAt).toBeTruthy();
    expect(sub.lastCheckedAt).toBeNull();

    const all = listSubscriptions();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Huberman Lab");
  });

  it("rejects duplicate channel IDs", async () => {
    const { createSubscription } = await loadModules();
    createSubscription("UC1234567890abcdefghij", "Channel A");
    expect(() => createSubscription("UC1234567890abcdefghij", "Channel B")).toThrow();
  });
});

describe("deleteSubscription", () => {
  it("deletes a subscription and returns true", async () => {
    const { createSubscription, deleteSubscription, listSubscriptions } =
      await loadModules();

    const sub = createSubscription("UC1234567890abcdefghij", "Test");
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
    createSubscription("UC1234567890abcdefghij", "Test");

    const due = getDueSubscriptions();
    expect(due).toHaveLength(1);
  });

  it("excludes recently checked subscriptions", async () => {
    const { createSubscription, markChecked, getDueSubscriptions } =
      await loadModules();

    const sub = createSubscription("UC1234567890abcdefghij", "Test");
    markChecked(sub.id);

    const due = getDueSubscriptions();
    expect(due).toHaveLength(0);
  });
});

describe("contentExistsForVideo", () => {
  it("returns false when video not in database", async () => {
    const { contentExistsForVideo } = await loadModules();
    expect(contentExistsForVideo("nonexistent_id")).toBe(false);
  });

  it("returns true when video already ingested", async () => {
    const { createContent, contentExistsForVideo } = await loadModules();
    createContent("https://youtube.com/watch?v=abc123def45", "abc123def45", "youtube");
    expect(contentExistsForVideo("abc123def45")).toBe(true);
  });
});
