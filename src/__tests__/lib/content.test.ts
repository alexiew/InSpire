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

  it("filters by search term in title", async () => {
    const { createContent, updateContent, listLibrary } = await loadModule();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { status: "accepted", title: "Dopamine and Focus" });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { status: "accepted", title: "Sleep Optimization" });

    expect(listLibrary("dopamine")).toHaveLength(1);
    expect(listLibrary("dopamine")[0].title).toBe("Dopamine and Focus");
    expect(listLibrary("OPTIMIZATION")).toHaveLength(1);
    expect(listLibrary()).toHaveLength(2);
  });
});
