// ABOUTME: Tests for QVC item CRUD operations.
// ABOUTME: Verifies creation, retrieval, updates, listing, and deletion.

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
  return await import("@/lib/qvc");
}

describe("createQvcItem", () => {
  it("creates an item with seed text and source", async () => {
    const { createQvcItem, getQvcItem } = await loadModule();
    const item = createQvcItem({
      seedText: "Omega-3 combined with B vitamins shows synergistic effects",
      sourceType: "briefing",
      sourceId: "1",
    });

    expect(item.seedText).toBe("Omega-3 combined with B vitamins shows synergistic effects");
    expect(item.sourceType).toBe("briefing");
    expect(item.sourceId).toBe("1");
    expect(item.status).toBe("seed");
    expect(item.title).toBe("");
    expect(item.research).toBe("");
    expect(item.angle).toBe("");
    expect(item.strategy).toBe("");
    expect(item.brief).toBe("");

    const fetched = getQvcItem(item.id);
    expect(fetched).toEqual(item);
  });
});

describe("getQvcItem", () => {
  it("returns undefined for nonexistent id", async () => {
    const { getQvcItem } = await loadModule();
    expect(getQvcItem(999)).toBeUndefined();
  });
});

describe("listQvcItems", () => {
  it("returns empty array when none exist", async () => {
    const { listQvcItems } = await loadModule();
    expect(listQvcItems()).toEqual([]);
  });

  it("returns items sorted by creation date descending", async () => {
    const { createQvcItem, listQvcItems } = await loadModule();
    const a = createQvcItem({ seedText: "First", sourceType: "briefing", sourceId: "1" });
    await new Promise((r) => setTimeout(r, 10));
    const b = createQvcItem({ seedText: "Second", sourceType: "topic", sourceId: "longevity" });

    const items = listQvcItems();
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(b.id);
    expect(items[1].id).toBe(a.id);
  });
});

describe("updateQvcItem", () => {
  it("updates fields and bumps updatedAt", async () => {
    const { createQvcItem, updateQvcItem } = await loadModule();
    const item = createQvcItem({ seedText: "Test", sourceType: "briefing", sourceId: "1" });

    await new Promise((r) => setTimeout(r, 10));

    const updated = updateQvcItem(item.id, {
      title: "Omega-3 + B Vitamins Synergy",
      research: "Evidence from multiple studies...",
      status: "researching",
    });

    expect(updated?.title).toBe("Omega-3 + B Vitamins Synergy");
    expect(updated?.research).toBe("Evidence from multiple studies...");
    expect(updated?.status).toBe("researching");
    expect(updated?.updatedAt).not.toBe(item.updatedAt);
  });

  it("returns undefined for nonexistent id", async () => {
    const { updateQvcItem } = await loadModule();
    expect(updateQvcItem(999, { title: "x" })).toBeUndefined();
  });
});

describe("deleteQvcItem", () => {
  it("deletes an item and returns true", async () => {
    const { createQvcItem, deleteQvcItem, listQvcItems } = await loadModule();
    const item = createQvcItem({ seedText: "Test", sourceType: "briefing", sourceId: "1" });
    expect(deleteQvcItem(item.id)).toBe(true);
    expect(listQvcItems()).toHaveLength(0);
  });

  it("returns false for nonexistent id", async () => {
    const { deleteQvcItem } = await loadModule();
    expect(deleteQvcItem(999)).toBe(false);
  });
});
