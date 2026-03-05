// ABOUTME: Tests for content item CRUD operations.
// ABOUTME: Uses a temp directory for test isolation.

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

async function loadModule() {
  return await import("@/lib/content");
}

describe("listContent", () => {
  it("returns empty array when data file does not exist", async () => {
    const { listContent } = await loadModule();
    expect(listContent()).toEqual([]);
  });

  it("returns items sorted by createdAt descending", async () => {
    const { listContent, createContent } = await loadModule();
    const c1 = createContent("https://youtube.com/watch?v=aaa", "aaa", "youtube");
    await new Promise((r) => setTimeout(r, 10));
    const c2 = createContent("https://youtube.com/watch?v=bbb", "bbb", "youtube");
    const items = listContent();
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(c2.id);
    expect(items[1].id).toBe(c1.id);
  });
});

describe("createContent", () => {
  it("creates a content item with processing status and empty fields", async () => {
    const { createContent, getContent } = await loadModule();
    const c = createContent("https://youtube.com/watch?v=abc123", "abc123", "youtube");
    expect(c.url).toBe("https://youtube.com/watch?v=abc123");
    expect(c.sourceId).toBe("abc123");
    expect(c.sourceType).toBe("youtube");
    expect(c.status).toBe("processing");
    expect(c.title).toBe("");
    expect(c.author).toBe("");
    expect(c.thumbnailUrl).toBe("");
    expect(c.transcript).toBe("");
    expect(c.summary).toBe("");
    expect(c.topics).toEqual([]);
    expect(c.claims).toEqual([]);
    expect(c.people).toEqual([]);
    expect(c.id).toBeTruthy();
    expect(c.createdAt).toBeTruthy();

    const fetched = getContent(c.id);
    expect(fetched).toEqual(c);
  });
});

describe("getContent", () => {
  it("returns undefined for nonexistent id", async () => {
    const { getContent } = await loadModule();
    expect(getContent("nonexistent")).toBeUndefined();
  });
});

describe("updateContent", () => {
  it("updates fields and bumps updatedAt", async () => {
    const { createContent, updateContent } = await loadModule();
    const c = createContent("https://youtube.com/watch?v=abc", "abc", "youtube");
    const originalUpdatedAt = c.updatedAt;

    await new Promise((r) => setTimeout(r, 10));

    const updated = updateContent(c.id, {
      title: "My Video",
      author: "Author",
      topics: ["longevity", "vitamin D"],
      claims: ["Vitamin D helps with sleep"],
      people: ["Dr. Seheult"],
      status: "ready",
    });
    expect(updated?.title).toBe("My Video");
    expect(updated?.author).toBe("Author");
    expect(updated?.topics).toEqual(["longevity", "vitamin D"]);
    expect(updated?.claims).toEqual(["Vitamin D helps with sleep"]);
    expect(updated?.people).toEqual(["Dr. Seheult"]);
    expect(updated?.status).toBe("ready");
    expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("returns undefined for nonexistent id", async () => {
    const { updateContent } = await loadModule();
    expect(updateContent("nope", { title: "x" })).toBeUndefined();
  });
});

describe("orphan topic cleanup", () => {
  it("removes topics with no remaining content when topics are edited", async () => {
    const content = await loadModule();
    const topics = await import("@/lib/topics");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, {
      topics: ["longevity", "vitamin D", "sleep"],
      status: "accepted",
    });

    // All three topics should exist in knowledge base
    expect(topics.getTopic("longevity")).toBeDefined();
    expect(topics.getTopic("vitamin-d")).toBeDefined();
    expect(topics.getTopic("sleep")).toBeDefined();

    // Remove "vitamin D" and "sleep"
    content.updateContent(c.id, { topics: ["longevity"] });

    // Orphaned topics should be cleaned up
    expect(topics.getTopic("longevity")).toBeDefined();
    expect(topics.getTopic("vitamin-d")).toBeUndefined();
    expect(topics.getTopic("sleep")).toBeUndefined();
  });

  it("preserves standalone topics created without content", async () => {
    const content = await loadModule();
    const topics = await import("@/lib/topics");

    // Create a standalone topic
    topics.createTopic("my research area");

    // Process unrelated content
    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, { topics: ["longevity"], status: "ready" });
    content.updateContent(c.id, { topics: ["longevity"] });

    // Standalone topic should survive
    expect(topics.getTopic("my-research-area")).toBeDefined();
  });

  it("keeps topics that still have other content associated", async () => {
    const content = await loadModule();
    const topics = await import("@/lib/topics");

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, { topics: ["longevity", "sleep"], status: "accepted" });

    const c2 = content.createContent("https://youtube.com/watch?v=b", "b", "youtube");
    content.updateContent(c2.id, { topics: ["longevity", "vitamin D"], status: "accepted" });

    // Remove "longevity" from c2 — but c1 still has it
    content.updateContent(c2.id, { topics: ["vitamin D"] });

    expect(topics.getTopic("longevity")).toBeDefined();
    expect(topics.getTopic("vitamin-d")).toBeDefined();
  });
});

describe("topic/people sequencing", () => {
  it("does not write topics to knowledge base for non-accepted content", async () => {
    const content = await loadModule();
    const topics = await import("@/lib/topics");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, {
      topics: ["longevity", "sleep"],
      people: ["Dr. Smith"],
      status: "ready",
    });

    // Topics should be on the content item
    const item = content.getContent(c.id);
    expect(item!.topics).toEqual(["longevity", "sleep"]);
    expect(item!.people).toEqual(["Dr. Smith"]);

    // But NOT in the knowledge base
    expect(topics.getTopic("longevity")).toBeUndefined();
    expect(topics.getTopic("sleep")).toBeUndefined();
    expect(topics.listTopics()).toHaveLength(0);
  });

  it("promotes topics to knowledge base on acceptance", async () => {
    const content = await loadModule();
    const topics = await import("@/lib/topics");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, {
      topics: ["longevity", "sleep"],
      status: "ready",
    });

    // Not in knowledge base yet
    expect(topics.getTopic("longevity")).toBeUndefined();

    // Accept the content
    content.updateContent(c.id, { status: "accepted" });

    // Now topics should be in the knowledge base
    expect(topics.getTopic("longevity")).toBeDefined();
    expect(topics.getTopic("longevity")!.contentIds).toContain(c.id);
    expect(topics.getTopic("sleep")).toBeDefined();
  });

  it("does not promote topics on discard", async () => {
    const content = await loadModule();
    const topics = await import("@/lib/topics");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, {
      topics: ["longevity"],
      status: "ready",
    });

    content.updateContent(c.id, { status: "discarded" });

    expect(topics.getTopic("longevity")).toBeUndefined();
  });

  it("removes topics from knowledge base when accepted content is discarded", async () => {
    const content = await loadModule();
    const topics = await import("@/lib/topics");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, {
      topics: ["longevity"],
      status: "ready",
    });
    content.updateContent(c.id, { status: "accepted" });
    expect(topics.getTopic("longevity")).toBeDefined();

    // Discard it
    content.updateContent(c.id, { status: "discarded" });

    // Topics removed from knowledge base
    expect(topics.listTopics()).toHaveLength(0);

    // But still on the content item
    const item = content.getContent(c.id);
    expect(item!.topics).toEqual(["longevity"]);
  });

  it("restores topics to knowledge base when discarded content is re-accepted", async () => {
    const content = await loadModule();
    const topics = await import("@/lib/topics");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, {
      topics: ["longevity"],
      status: "ready",
    });
    content.updateContent(c.id, { status: "accepted" });
    content.updateContent(c.id, { status: "discarded" });

    expect(topics.getTopic("longevity")).toBeUndefined();

    // Re-accept
    content.updateContent(c.id, { status: "accepted" });
    expect(topics.getTopic("longevity")).toBeDefined();
    expect(topics.getTopic("longevity")!.contentIds).toContain(c.id);
  });

  it("topic editing during review stays in pending state", async () => {
    const content = await loadModule();
    const topics = await import("@/lib/topics");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, {
      topics: ["longevity", "sleep"],
      status: "ready",
    });

    // Edit topics during review
    content.updateContent(c.id, { topics: ["longevity", "metabolism"] });

    const item = content.getContent(c.id);
    expect(item!.topics).toEqual(["longevity", "metabolism"]);

    // Still not in knowledge base
    expect(topics.listTopics()).toHaveLength(0);

    // Accept — only the current topics get promoted
    content.updateContent(c.id, { status: "accepted" });
    expect(topics.getTopic("longevity")).toBeDefined();
    expect(topics.getTopic("metabolism")).toBeDefined();
    expect(topics.getTopic("sleep")).toBeUndefined();
  });
});

describe("people editing on accepted content", () => {
  it("removes a person from accepted content via updateContent", async () => {
    const content = await loadModule();
    const people = await import("@/lib/people");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, {
      people: ["Andrew Huberman", "Anna Lembke", "David Goggins"],
      status: "accepted",
    });

    // All three in knowledge base
    expect(people.getPerson("andrew-huberman")).toBeDefined();
    expect(people.getPerson("anna-lembke")).toBeDefined();
    expect(people.getPerson("david-goggins")).toBeDefined();

    // Remove Anna Lembke
    content.updateContent(c.id, { people: ["Andrew Huberman", "David Goggins"] });

    const item = content.getContent(c.id);
    expect(item!.people).toEqual(["Andrew Huberman", "David Goggins"]);
    expect(item!.people).not.toContain("Anna Lembke");
  });

  it("cleans up orphaned people when removed from all content", async () => {
    const content = await loadModule();
    const people = await import("@/lib/people");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c.id, {
      people: ["Andrew Huberman", "Anna Lembke"],
      status: "accepted",
    });

    // Remove Anna — she's only on this one item
    content.updateContent(c.id, { people: ["Andrew Huberman"] });

    expect(people.getPerson("andrew-huberman")).toBeDefined();
    expect(people.getPerson("anna-lembke")).toBeUndefined();
  });

  it("preserves people still referenced by other content", async () => {
    const content = await loadModule();
    const people = await import("@/lib/people");

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, {
      people: ["Andrew Huberman", "Anna Lembke"],
      status: "accepted",
    });

    const c2 = content.createContent("https://youtube.com/watch?v=b", "b", "youtube");
    content.updateContent(c2.id, {
      people: ["Andrew Huberman"],
      status: "accepted",
    });

    // Remove Huberman from c1 — but c2 still has him
    content.updateContent(c1.id, { people: ["Anna Lembke"] });

    expect(people.getPerson("andrew-huberman")).toBeDefined();
    expect(people.getPerson("anna-lembke")).toBeDefined();
  });
});

describe("deleteContent", () => {
  it("deletes an item and returns true", async () => {
    const { createContent, deleteContent, listContent } = await loadModule();
    const c = createContent("https://youtube.com/watch?v=del", "del", "youtube");
    expect(deleteContent(c.id)).toBe(true);
    expect(listContent()).toHaveLength(0);
  });

  it("returns false for nonexistent id", async () => {
    const { deleteContent } = await loadModule();
    expect(deleteContent("nope")).toBe(false);
  });
});

describe("listRecent", () => {
  it("returns items pending review, excluding accepted and discarded", async () => {
    const { createContent, updateContent, listRecent } = await loadModule();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    await new Promise((r) => setTimeout(r, 10));
    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    await new Promise((r) => setTimeout(r, 10));
    const c3 = createContent("https://youtube.com/watch?v=c", "c", "youtube");

    updateContent(c2.id, { status: "discarded" });
    updateContent(c1.id, { status: "accepted" });

    // Only c3 remains (still processing)
    const recent = listRecent();
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe(c3.id);
  });

  it("shows all pending items without a limit", async () => {
    const { createContent, listRecent } = await loadModule();

    for (let i = 0; i < 20; i++) {
      createContent(`https://youtube.com/watch?v=${i}`, `${i}`, "youtube");
    }

    expect(listRecent()).toHaveLength(20);
  });

  it("includes processing, ready, and error statuses", async () => {
    const { createContent, updateContent, listRecent } = await loadModule();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    // c1 stays as "processing"

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { status: "ready" });

    const c3 = createContent("https://youtube.com/watch?v=c", "c", "youtube");
    updateContent(c3.id, { status: "error", error: "failed" });

    expect(listRecent()).toHaveLength(3);
  });
});

describe("listLibrary", () => {
  it("returns only accepted items", async () => {
    const { createContent, updateContent, listLibrary } = await loadModule();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { status: "accepted", title: "Accepted Video" });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { status: "ready", title: "Ready Video" });

    const c3 = createContent("https://youtube.com/watch?v=c", "c", "youtube");
    updateContent(c3.id, { status: "discarded" });

    const library = listLibrary();
    expect(library).toHaveLength(1);
    expect(library[0].title).toBe("Accepted Video");
  });

  it("searches across title, summary, and transcript", async () => {
    const { createContent, updateContent, listLibrary } = await loadModule();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { status: "accepted", title: "Dopamine and Focus" });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { status: "accepted", title: "Sleep Optimization", summary: "How melatonin affects circadian rhythms" });

    const c3 = createContent("https://youtube.com/watch?v=c", "c", "youtube");
    updateContent(c3.id, { status: "accepted", title: "Exercise Science", transcript: "the neuroplasticity benefits of cardiovascular exercise" });

    // Match in title
    expect(listLibrary("dopamine")).toHaveLength(1);
    expect(listLibrary("dopamine")[0].title).toBe("Dopamine and Focus");

    // Match in summary
    expect(listLibrary("melatonin")).toHaveLength(1);
    expect(listLibrary("melatonin")[0].title).toBe("Sleep Optimization");

    // Match in transcript
    expect(listLibrary("neuroplasticity")).toHaveLength(1);
    expect(listLibrary("neuroplasticity")[0].title).toBe("Exercise Science");

    // No match
    expect(listLibrary("quantum")).toHaveLength(0);

    // No search returns all
    expect(listLibrary()).toHaveLength(3);
  });
});
