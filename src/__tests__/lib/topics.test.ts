// ABOUTME: Tests for topic index management.
// ABOUTME: Verifies topic building, listing, and retrieval from content items.

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
      status: "accepted",
    });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, {
      topics: ["vitamin D", "metabolism"],
      status: "accepted",
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
      status: "accepted",
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
    updateContent(c1.id, { topics: ["vitamin D"], status: "accepted" });

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
    updateContent(c1.id, { topics: ["longevity"], status: "accepted" });
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

describe("mergeTopics", () => {
  it("merges two topics and consolidates content associations", async () => {
    const { createContent, updateContent, mergeTopics, getTopic } =
      await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["agentic AI"], status: "accepted" });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { topics: ["AI coding"], status: "accepted" });

    const merged = mergeTopics(["agentic-ai", "ai-coding"], "AI Development");
    expect(merged.slug).toBe("ai-development");
    expect(merged.name).toBe("AI Development");
    expect(merged.contentIds).toHaveLength(2);
    expect(merged.contentIds).toContain(c1.id);
    expect(merged.contentIds).toContain(c2.id);

    // Source topics should be gone
    expect(getTopic("agentic-ai")).toBeUndefined();
    expect(getTopic("ai-coding")).toBeUndefined();
  });

  it("deduplicates content that appears in multiple source topics", async () => {
    const { createContent, updateContent, mergeTopics } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, {
      topics: ["topic-a", "topic-b"],
      status: "accepted",
    });

    const merged = mergeTopics(["topic-a", "topic-b"], "combined");
    expect(merged.contentIds).toHaveLength(1);
    expect(merged.contentIds).toContain(c1.id);
  });

  it("merges into an existing topic when target name matches a source", async () => {
    const { createContent, updateContent, mergeTopics, getTopic } =
      await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["AI"], status: "accepted" });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { topics: ["machine learning"], status: "accepted" });

    const merged = mergeTopics(["ai", "machine-learning"], "AI");
    expect(merged.slug).toBe("ai");
    expect(merged.contentIds).toHaveLength(2);
    expect(getTopic("machine-learning")).toBeUndefined();
  });

  it("throws when fewer than 2 slugs are provided", async () => {
    const { mergeTopics } = await loadModules();
    expect(() => mergeTopics(["only-one"], "target")).toThrow();
  });
});

describe("deleteTopic", () => {
  it("removes a topic and its content associations", async () => {
    const { createContent, updateContent, deleteTopic, getTopic } =
      await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["disposable"], status: "accepted" });

    expect(getTopic("disposable")).toBeDefined();
    const deleted = deleteTopic("disposable");
    expect(deleted).toBe(true);
    expect(getTopic("disposable")).toBeUndefined();
  });

  it("returns false for nonexistent slug", async () => {
    const { deleteTopic } = await loadModules();
    expect(deleteTopic("nonexistent")).toBe(false);
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
    updateContent(c1.id, { topics: ["longevity"], status: "accepted" });

    rebuildTopicIndex();
    updateTopicSynthesis("longevity", "These sources agree on X.", [c1.id]);

    const topic = getTopic("longevity");
    expect(topic!.synthesis).toBe("These sources agree on X.");
    expect(topic!.synthesizedAt).toBeTruthy();
  });

  it("stores content IDs in synthesis history", async () => {
    const {
      createContent,
      updateContent,
      rebuildTopicIndex,
      updateTopicSynthesis,
      getLatestSynthesisRecord,
    } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c1.id, { topics: ["sleep"], status: "accepted" });
    updateContent(c2.id, { topics: ["sleep"], status: "accepted" });

    rebuildTopicIndex();
    updateTopicSynthesis("sleep", "Synthesis text.", [c1.id, c2.id]);

    const record = getLatestSynthesisRecord("sleep");
    expect(record).toBeDefined();
    expect(record!.synthesis).toBe("Synthesis text.");
    expect(record!.contentIds).toEqual([c1.id, c2.id]);
  });
});

describe("getTopicGraph", () => {
  it("returns nodes for topics with content", async () => {
    const { createContent, updateContent, getTopicGraph } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["sleep", "longevity"], status: "accepted" });

    const graph = getTopicGraph();
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.map((n) => n.name).sort()).toEqual(["longevity", "sleep"]);
    expect(graph.nodes[0].contentCount).toBe(1);
  });

  it("returns edges for topics sharing content", async () => {
    const { createContent, updateContent, getTopicGraph } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["sleep", "longevity"], status: "accepted" });

    const graph = getTopicGraph();
    expect(graph.edges).toHaveLength(1);
    const edge = graph.edges[0];
    expect([edge.source, edge.target].sort()).toEqual(["longevity", "sleep"]);
    expect(edge.weight).toBe(1);
  });

  it("excludes topics with no content", async () => {
    const { createContent, updateContent, createTopic, getTopicGraph } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["sleep"], status: "accepted" });
    createTopic("orphan topic");

    const graph = getTopicGraph();
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].name).toBe("sleep");
  });

  it("edge weight reflects number of shared items", async () => {
    const { createContent, updateContent, getTopicGraph } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { topics: ["sleep", "longevity"], status: "accepted" });

    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { topics: ["sleep", "longevity"], status: "accepted" });

    const graph = getTopicGraph();
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].weight).toBe(2);
  });
});

describe("getLatestSynthesisRecord", () => {
  it("returns the most recent synthesis record", async () => {
    const {
      createContent,
      updateContent,
      rebuildTopicIndex,
      updateTopicSynthesis,
      getLatestSynthesisRecord,
    } = await loadModules();

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c1.id, { topics: ["sleep"], status: "accepted" });
    updateContent(c2.id, { topics: ["sleep"], status: "accepted" });

    rebuildTopicIndex();
    updateTopicSynthesis("sleep", "First synthesis.", [c1.id]);
    updateTopicSynthesis("sleep", "Second synthesis.", [c1.id, c2.id]);

    const record = getLatestSynthesisRecord("sleep");
    expect(record!.synthesis).toBe("Second synthesis.");
    expect(record!.contentIds).toEqual([c1.id, c2.id]);
  });

  it("returns undefined for topic with no synthesis history", async () => {
    const { createTopic, getLatestSynthesisRecord } = await loadModules();

    createTopic("empty-topic");
    expect(getLatestSynthesisRecord("empty-topic")).toBeUndefined();
  });
});
