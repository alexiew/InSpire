// ABOUTME: Tests for topic index management.
// ABOUTME: Verifies topic building, listing, and retrieval from content items.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "inspire-test-"));
  mkdirSync(path.join(tmpDir, "data"), { recursive: true });
  process.env.INSPIRE_DATA_DIR = tmpDir;
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.INSPIRE_DATA_DIR;
});

async function loadModules() {
  const content = await import("@/lib/content");
  const topics = await import("@/lib/topics");
  return { ...content, ...topics };
}

describe("slugify", () => {
  it("converts topic names to URL-safe slugs", async () => {
    const { slugify } = await loadModules();
    expect(slugify("Vitamin D")).toBe("vitamin-d");
    expect(slugify("Intermittent Fasting")).toBe("intermittent-fasting");
    expect(slugify("AI & Machine Learning")).toBe("ai-machine-learning");
    expect(slugify("  extra  spaces  ")).toBe("extra-spaces");
  });
});

describe("rebuildTopicIndex", () => {
  it("builds topics from content items", async () => {
    const { createContent, updateContent, rebuildTopicIndex, listTopics } =
      await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, {
      topics: ["longevity", "vitamin D"],
      status: "ready",
    });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, {
      topics: ["vitamin D", "metabolism"],
      status: "ready",
    });

    rebuildTopicIndex();
    const topics = listTopics();

    expect(topics).toHaveLength(3);
    // Sorted by count desc — vitamin D has 2 items
    expect(topics[0].name).toBe("vitamin D");
    expect(topics[0].contentIds).toHaveLength(2);
    expect(topics[0].slug).toBe("vitamin-d");
  });

  it("excludes content items that are still processing", async () => {
    const { createContent, updateContent, rebuildTopicIndex, listTopics } =
      await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, {
      topics: ["longevity"],
      status: "ready",
    });

    // This one is still processing — no topics yet
    createContent("https://youtube.com/watch?v=b", "b", "youtube");

    rebuildTopicIndex();
    const topics = listTopics();
    expect(topics).toHaveLength(1);
    expect(topics[0].name).toBe("longevity");
    expect(topics[0].contentIds).toHaveLength(1);
  });

  it("returns empty list when no content exists", async () => {
    const { rebuildTopicIndex, listTopics } = await loadModules();
    rebuildTopicIndex();
    expect(listTopics()).toEqual([]);
  });
});

describe("getTopic", () => {
  it("returns a topic by slug", async () => {
    const { createContent, updateContent, rebuildTopicIndex, getTopic } =
      await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["vitamin D"], status: "ready" });

    rebuildTopicIndex();
    const topic = getTopic("vitamin-d");
    expect(topic).toBeDefined();
    expect(topic!.name).toBe("vitamin D");
    expect(topic!.contentIds).toContain(c1.id);
  });

  it("returns undefined for nonexistent slug", async () => {
    const { rebuildTopicIndex, getTopic } = await loadModules();
    rebuildTopicIndex();
    expect(getTopic("nonexistent")).toBeUndefined();
  });
});

describe("createTopic", () => {
  it("creates a standalone topic with no content", async () => {
    const { createTopic, getTopic } = await loadModules();

    const topic = createTopic("open claude");
    expect(topic.slug).toBe("open-claude");
    expect(topic.name).toBe("open claude");
    expect(topic.contentIds).toEqual([]);

    const retrieved = getTopic("open-claude");
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe("open claude");
  });

  it("returns existing topic if slug already exists", async () => {
    const { createContent, updateContent, rebuildTopicIndex, createTopic } =
      await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["longevity"], status: "ready" });
    rebuildTopicIndex();

    const topic = createTopic("longevity");
    expect(topic.contentIds).toHaveLength(1);
  });

  it("survives a topic index rebuild with no content", async () => {
    const { createTopic, rebuildTopicIndex, getTopic } = await loadModules();

    createTopic("open claude");
    rebuildTopicIndex();

    const topic = getTopic("open-claude");
    expect(topic).toBeDefined();
    expect(topic!.name).toBe("open claude");
    expect(topic!.contentIds).toEqual([]);
  });
});

describe("updateTopicSynthesis", () => {
  it("stores synthesis on a topic", async () => {
    const {
      createContent,
      updateContent,
      rebuildTopicIndex,
      getTopic,
      updateTopicSynthesis,
    } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["longevity"], status: "ready" });

    rebuildTopicIndex();
    updateTopicSynthesis("longevity", "These sources agree on X.");

    const topic = getTopic("longevity");
    expect(topic!.synthesis).toBe("These sources agree on X.");
    expect(topic!.synthesizedAt).toBeTruthy();
  });
});
