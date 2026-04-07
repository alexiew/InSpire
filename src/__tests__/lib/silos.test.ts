// ABOUTME: Tests for silo CRUD and silo content isolation.
// ABOUTME: Verifies silos are independent research containers separate from the main KB.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { closeDb } from "@/lib/db";

vi.mock("@/lib/claude", () => ({
  callClaude: vi.fn(),
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "inspire-test-"));
  process.env.INSPIRE_DATA_DIR = tmpDir;
  vi.clearAllMocks();
});

afterEach(() => {
  closeDb();
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.INSPIRE_DATA_DIR;
  vi.restoreAllMocks();
});

async function loadModules() {
  const silos = await import("@/lib/silos");
  const content = await import("@/lib/content");
  return { silos, content };
}

describe("createSilo", () => {
  it("creates a silo with a name", async () => {
    const { silos } = await loadModules();
    const silo = silos.createSilo("AI Ethics Research");
    expect(silo.id).toBeTruthy();
    expect(silo.name).toBe("AI Ethics Research");
    expect(silo.createdAt).toBeTruthy();
    expect(silo.synthesis).toBeUndefined();
  });

  it("rejects duplicate names", async () => {
    const { silos } = await loadModules();
    silos.createSilo("AI Ethics Research");
    expect(() => silos.createSilo("AI Ethics Research")).toThrow();
  });
});

describe("listSilos", () => {
  it("returns empty array when no silos exist", async () => {
    const { silos } = await loadModules();
    expect(silos.listSilos()).toEqual([]);
  });

  it("returns silos with content counts", async () => {
    const { silos, content } = await loadModules();
    const silo = silos.createSilo("AI Ethics");

    content.createContent("https://youtube.com/watch?v=a", "a", "youtube", silo.id);
    content.createContent("https://youtube.com/watch?v=b", "b", "youtube", silo.id);

    const list = silos.listSilos();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("AI Ethics");
    expect(list[0].contentCount).toBe(2);
  });

  it("returns silos with pending counts", async () => {
    const { silos, content } = await loadModules();
    const silo = silos.createSilo("AI Ethics");

    // processing counts as pending
    content.createContent("https://youtube.com/watch?v=a", "a", "youtube", silo.id);

    // ready counts as pending
    const c2 = content.createContent("https://youtube.com/watch?v=b", "b", "youtube", silo.id);
    content.updateContent(c2.id, { title: "Ready", status: "ready" });

    // error counts as pending
    const c3 = content.createContent("https://youtube.com/watch?v=c", "c", "youtube", silo.id);
    content.updateContent(c3.id, { title: "Errored", status: "error" });

    // accepted does NOT count as pending
    const c4 = content.createContent("https://youtube.com/watch?v=d", "d", "youtube", silo.id);
    content.updateContent(c4.id, { title: "Accepted", status: "accepted" });

    // discarded does NOT count as pending
    const c5 = content.createContent("https://youtube.com/watch?v=e", "e", "youtube", silo.id);
    content.updateContent(c5.id, { title: "Discarded", status: "discarded" });

    const list = silos.listSilos();
    expect(list).toHaveLength(1);
    expect(list[0].contentCount).toBe(5);
    expect(list[0].pendingCount).toBe(3);
  });
});

describe("getSilo", () => {
  it("returns a silo by id with its content items", async () => {
    const { silos, content } = await loadModules();
    const silo = silos.createSilo("AI Ethics");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube", silo.id);
    content.updateContent(c.id, {
      title: "Ethics Video",
      summary: "About AI safety",
      topics: ["ai-safety"],
      status: "ready",
    });

    const fetched = silos.getSilo(silo.id);
    expect(fetched).toBeDefined();
    expect(fetched!.name).toBe("AI Ethics");
    expect(fetched!.items).toHaveLength(1);
    expect(fetched!.items[0].title).toBe("Ethics Video");
  });

  it("returns undefined for nonexistent id", async () => {
    const { silos } = await loadModules();
    expect(silos.getSilo(999)).toBeUndefined();
  });
});

describe("deleteSilo", () => {
  it("deletes a silo and its content", async () => {
    const { silos, content } = await loadModules();
    const silo = silos.createSilo("AI Ethics");
    content.createContent("https://youtube.com/watch?v=a", "a", "youtube", silo.id);

    expect(silos.deleteSilo(silo.id)).toBe(true);
    expect(silos.getSilo(silo.id)).toBeUndefined();
    // Content should be cascade-deleted
    expect(content.listContent()).toHaveLength(0);
  });

  it("returns false for nonexistent id", async () => {
    const { silos } = await loadModules();
    expect(silos.deleteSilo(999)).toBe(false);
  });
});

describe("silo content isolation", () => {
  it("silo content does not appear in main KB listings", async () => {
    const { silos, content } = await loadModules();
    const silo = silos.createSilo("AI Ethics");

    // Main KB content
    const main = content.createContent("https://youtube.com/watch?v=main", "main", "youtube");
    content.updateContent(main.id, { title: "Main Video", status: "ready" });

    // Silo content
    const siloContent = content.createContent("https://youtube.com/watch?v=silo", "silo", "youtube", silo.id);
    content.updateContent(siloContent.id, { title: "Silo Video", status: "ready" });

    // Main KB queries should not include silo content
    expect(content.listContent()).toHaveLength(1);
    expect(content.listContent()[0].title).toBe("Main Video");
    expect(content.listRecent()).toHaveLength(1);
    expect(content.listRecent()[0].title).toBe("Main Video");
  });

  it("silo content does not appear in library search", async () => {
    const { silos, content } = await loadModules();
    const silo = silos.createSilo("AI Ethics");

    const main = content.createContent("https://youtube.com/watch?v=main", "main", "youtube");
    content.updateContent(main.id, { title: "Main Accepted", status: "accepted" });

    const siloContent = content.createContent("https://youtube.com/watch?v=silo", "silo", "youtube", silo.id);
    content.updateContent(siloContent.id, { title: "Silo Accepted", status: "accepted" });

    expect(content.listLibrary()).toHaveLength(1);
    expect(content.listLibrary()[0].title).toBe("Main Accepted");
  });

  it("accepted silo content does not write to topic/people join tables", async () => {
    const { silos, content } = await loadModules();
    const topics = await import("@/lib/topics");
    const people = await import("@/lib/people");
    const silo = silos.createSilo("AI Ethics");

    const c = content.createContent("https://youtube.com/watch?v=a", "a", "youtube", silo.id);
    content.updateContent(c.id, {
      title: "Ethics Video",
      topics: ["ai-safety", "alignment"],
      people: ["Stuart Russell"],
      status: "accepted",
    });

    // Topics and people should NOT be in the main KB
    expect(topics.listTopics()).toHaveLength(0);
    expect(people.listPeople()).toHaveLength(0);

    // But should still be on the content item via pending columns
    const item = content.getContent(c.id);
    expect(item!.topics).toEqual(["ai-safety", "alignment"]);
    expect(item!.people).toEqual(["Stuart Russell"]);
  });
});

describe("silo synthesis", () => {
  it("generates a synthesis across accepted silo content", async () => {
    const { callClaude } = await import("@/lib/claude");
    const mockClaude = callClaude as ReturnType<typeof vi.fn>;
    mockClaude.mockResolvedValue("Cross-content synthesis result.");

    const { silos, content } = await loadModules();
    const silo = silos.createSilo("AI Ethics");

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube", silo.id);
    content.updateContent(c1.id, {
      title: "Video A", summary: "Summary A", status: "accepted",
    });

    const c2 = content.createContent("https://youtube.com/watch?v=b", "b", "youtube", silo.id);
    content.updateContent(c2.id, {
      title: "Video B", summary: "Summary B", status: "accepted",
    });

    const result = await silos.synthesizeSilo(silo.id);
    expect(result.synthesis).toBe("Cross-content synthesis result.");
    expect(mockClaude).toHaveBeenCalledOnce();

    // Synthesis should be persisted
    const fetched = silos.getSilo(silo.id);
    expect(fetched!.synthesis).toBe("Cross-content synthesis result.");
  });

  it("throws when silo has no accepted content", async () => {
    const { silos } = await loadModules();
    const silo = silos.createSilo("Empty Silo");

    await expect(silos.synthesizeSilo(silo.id)).rejects.toThrow("No accepted content");
  });

  it("throws for nonexistent silo", async () => {
    const { silos } = await loadModules();
    await expect(silos.synthesizeSilo(999)).rejects.toThrow("not found");
  });
});
