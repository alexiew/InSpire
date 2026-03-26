// ABOUTME: Tests for subscription CRUD operations.
// ABOUTME: Verifies listing, creation, deletion, and content deduplication.

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
  const silos = await import("@/lib/silos");
  return { ...subscriptions, ...content, ...silos };
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

describe("updateSubscription", () => {
  it("updates extraction hints", async () => {
    const { createSubscription, updateSubscription } = await loadModules();
    const sub = createSubscription("youtube", "UC1234567890abcdefghij", "Test");
    expect(sub.extractionHints).toBe("");

    const updated = updateSubscription(sub.id, { extractionHints: "Include step-by-step instructions" });
    expect(updated?.extractionHints).toBe("Include step-by-step instructions");
  });

  it("returns undefined for nonexistent id", async () => {
    const { updateSubscription } = await loadModules();
    expect(updateSubscription(999, { extractionHints: "test" })).toBeUndefined();
  });
});

describe("exclude terms", () => {
  it("stores exclude terms on creation", async () => {
    const { createSubscription } = await loadModules();
    const sub = createSubscription("youtube", "UC1234567890abcdefghij", "Test", "", "#Shorts, #Short");
    expect(sub.excludeTerms).toBe("#Shorts, #Short");
  });

  it("defaults to empty string", async () => {
    const { createSubscription } = await loadModules();
    const sub = createSubscription("youtube", "UC1234567890abcdefghij", "Test");
    expect(sub.excludeTerms).toBe("");
  });

  it("updates exclude terms", async () => {
    const { createSubscription, updateSubscription } = await loadModules();
    const sub = createSubscription("youtube", "UC1234567890abcdefghij", "Test");
    const updated = updateSubscription(sub.id, { excludeTerms: "#Shorts" });
    expect(updated?.excludeTerms).toBe("#Shorts");
  });
});

describe("titleMatchesExcludeTerms", () => {
  it("returns false when no exclude terms", async () => {
    const { titleMatchesExcludeTerms } = await loadModules();
    expect(titleMatchesExcludeTerms("Some Video #Shorts", "")).toBe(false);
  });

  it("matches a single term case-insensitively", async () => {
    const { titleMatchesExcludeTerms } = await loadModules();
    expect(titleMatchesExcludeTerms("My Video #Shorts", "#Shorts")).toBe(true);
    expect(titleMatchesExcludeTerms("My Video #shorts", "#Shorts")).toBe(true);
    expect(titleMatchesExcludeTerms("My Video #SHORTS", "#Shorts")).toBe(true);
  });

  it("matches any of multiple comma-separated terms", async () => {
    const { titleMatchesExcludeTerms } = await loadModules();
    expect(titleMatchesExcludeTerms("Quick Clip", "#Shorts, Clip")).toBe(true);
    expect(titleMatchesExcludeTerms("My Video #Shorts", "#Shorts, Clip")).toBe(true);
    expect(titleMatchesExcludeTerms("Full Episode", "#Shorts, Clip")).toBe(false);
  });

  it("ignores whitespace around terms", async () => {
    const { titleMatchesExcludeTerms } = await loadModules();
    expect(titleMatchesExcludeTerms("My Video #Shorts", "  #Shorts  ,  Clip  ")).toBe(true);
  });

  it("ignores empty terms from extra commas", async () => {
    const { titleMatchesExcludeTerms } = await loadModules();
    expect(titleMatchesExcludeTerms("Normal Video", ",,,")).toBe(false);
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

  it("scopes dedup to main KB when no siloId given", async () => {
    const { createContent, createSilo, contentExists } = await loadModules();
    const silo = createSilo("Research");
    createContent("https://youtube.com/watch?v=abc123", "abc123", "youtube", silo.id);
    // Content exists in silo but not in main KB
    expect(contentExists("abc123")).toBe(false);
  });

  it("scopes dedup to specific silo", async () => {
    const { createContent, createSilo, contentExists } = await loadModules();
    const silo = createSilo("Research");
    createContent("https://youtube.com/watch?v=abc123", "abc123", "youtube");
    // Content exists in main KB but not in silo
    expect(contentExists("abc123", silo.id)).toBe(false);
  });

  it("returns true when content exists in the same silo", async () => {
    const { createContent, createSilo, contentExists } = await loadModules();
    const silo = createSilo("Research");
    createContent("https://youtube.com/watch?v=abc123", "abc123", "youtube", silo.id);
    expect(contentExists("abc123", silo.id)).toBe(true);
  });
});

describe("silo-scoped subscriptions", () => {
  it("creates a subscription with siloId", async () => {
    const { createSubscription, createSilo } = await loadModules();
    const silo = createSilo("Research");
    const sub = createSubscription("youtube", "UC_test_channel", "Test Channel", "", "", silo.id);
    expect(sub.siloId).toBe(silo.id);
  });

  it("allows same source_identifier in different silos", async () => {
    const { createSubscription, createSilo } = await loadModules();
    const silo1 = createSilo("Silo A");
    const silo2 = createSilo("Silo B");
    const sub1 = createSubscription("youtube", "UC_shared", "Channel", "", "", silo1.id);
    const sub2 = createSubscription("youtube", "UC_shared", "Channel", "", "", silo2.id);
    expect(sub1.siloId).toBe(silo1.id);
    expect(sub2.siloId).toBe(silo2.id);
  });

  it("allows same source_identifier in main KB and a silo", async () => {
    const { createSubscription, createSilo } = await loadModules();
    const silo = createSilo("Research");
    const mainSub = createSubscription("youtube", "UC_shared", "Channel");
    const siloSub = createSubscription("youtube", "UC_shared", "Channel", "", "", silo.id);
    expect(mainSub.siloId).toBeUndefined();
    expect(siloSub.siloId).toBe(silo.id);
  });

  it("rejects duplicate source_identifier within the same silo", async () => {
    const { createSubscription, createSilo } = await loadModules();
    const silo = createSilo("Research");
    createSubscription("youtube", "UC_dup", "Channel", "", "", silo.id);
    expect(() => createSubscription("youtube", "UC_dup", "Channel 2", "", "", silo.id)).toThrow();
  });

  it("lists subscriptions filtered by siloId", async () => {
    const { createSubscription, listSubscriptions, createSilo } = await loadModules();
    const silo = createSilo("Research");
    createSubscription("youtube", "UC_main", "Main Channel");
    createSubscription("youtube", "UC_silo", "Silo Channel", "", "", silo.id);

    const all = listSubscriptions();
    expect(all).toHaveLength(2);

    const siloOnly = listSubscriptions(silo.id);
    expect(siloOnly).toHaveLength(1);
    expect(siloOnly[0].name).toBe("Silo Channel");
  });

  it("cascade-deletes subscriptions when silo is deleted", async () => {
    const { createSubscription, listSubscriptions, createSilo, deleteSilo } = await loadModules();
    const silo = createSilo("Temp");
    createSubscription("youtube", "UC_temp", "Temp Channel", "", "", silo.id);
    expect(listSubscriptions(silo.id)).toHaveLength(1);

    deleteSilo(silo.id);
    expect(listSubscriptions(silo.id)).toHaveLength(0);
  });
});
