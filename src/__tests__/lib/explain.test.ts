// ABOUTME: Tests for knowledge-base-grounded explain functionality.
// ABOUTME: Verifies FTS search, topic matching, and prompt construction.

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
  const explain = await import("@/lib/explain");
  return { content, topics, explain };
}

describe("searchKnowledgeBase", () => {
  it("finds content matching the selected text via FTS", async () => {
    const { content, explain } = await loadModules();

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, {
      title: "DHA and Brain Health",
      summary: "DHA omega-3 fatty acids improve cognitive function and brain health.",
      claims: ["DHA improves memory", "B-vitamins enhance DHA absorption"],
      topics: ["nutrition"],
      status: "accepted",
    });

    const c2 = content.createContent("https://youtube.com/watch?v=b", "b", "youtube");
    content.updateContent(c2.id, {
      title: "Sleep and Recovery",
      summary: "Sleep is essential for physical recovery.",
      topics: ["sleep"],
      status: "accepted",
    });

    const result = explain.searchKnowledgeBase("DHA and B-vitamin interaction");

    expect(result.matchingContent.length).toBeGreaterThanOrEqual(1);
    expect(result.matchingContent[0].title).toBe("DHA and Brain Health");
  });

  it("finds topic syntheses when topic names appear in the text", async () => {
    const { content, topics, explain } = await loadModules();

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, { topics: ["nutrition"], status: "accepted" });

    topics.updateTopicSynthesis("nutrition", "Nutrition research shows convergence on whole foods.", [c1.id]);

    const result = explain.searchKnowledgeBase("the nutrition data suggests a trend");

    expect(result.relevantSyntheses).toHaveLength(1);
    expect(result.relevantSyntheses[0].name).toBe("nutrition");
    expect(result.relevantSyntheses[0].synthesis).toContain("whole foods");
  });

  it("returns empty results for text with no matches", async () => {
    const { explain } = await loadModules();

    const result = explain.searchKnowledgeBase("completely unrelated gibberish xyzzy");

    expect(result.matchingContent).toHaveLength(0);
    expect(result.relevantSyntheses).toHaveLength(0);
  });

  it("limits content results to avoid excessive context", async () => {
    const { content, explain } = await loadModules();

    for (let i = 0; i < 10; i++) {
      const c = content.createContent(`https://youtube.com/watch?v=${i}`, `${i}`, "youtube");
      content.updateContent(c.id, {
        title: `Longevity Research Part ${i}`,
        summary: `Longevity study ${i} on aging and health.`,
        topics: ["longevity"],
        status: "accepted",
      });
    }

    const result = explain.searchKnowledgeBase("longevity aging health");

    expect(result.matchingContent.length).toBeLessThanOrEqual(5);
  });
});

describe("buildExplainPrompt", () => {
  it("includes matching content in the prompt", async () => {
    const { buildExplainPrompt } = await import("@/lib/explain");

    const prompt = buildExplainPrompt("DHA and B-vitamin interaction", {
      matchingContent: [
        {
          title: "DHA and Brain Health",
          author: "Dr. Huberman",
          summary: "DHA improves cognitive function.",
          claims: ["DHA improves memory"],
        },
      ],
      relevantSyntheses: [],
    });

    expect(prompt).toContain("DHA and B-vitamin interaction");
    expect(prompt).toContain("DHA and Brain Health");
    expect(prompt).toContain("Dr. Huberman");
    expect(prompt).toContain("DHA improves memory");
  });

  it("includes topic syntheses in the prompt", async () => {
    const { buildExplainPrompt } = await import("@/lib/explain");

    const prompt = buildExplainPrompt("nutrition trends", {
      matchingContent: [],
      relevantSyntheses: [
        { name: "nutrition", synthesis: "Research converges on whole foods." },
      ],
    });

    expect(prompt).toContain("nutrition");
    expect(prompt).toContain("Research converges on whole foods.");
  });

  it("notes when no matching content is found", async () => {
    const { buildExplainPrompt } = await import("@/lib/explain");

    const prompt = buildExplainPrompt("unknown topic", {
      matchingContent: [],
      relevantSyntheses: [],
    });

    expect(prompt).toContain("No directly matching content");
  });

  it("instructs Claude to ground explanation in knowledge base sources", async () => {
    const { buildExplainPrompt } = await import("@/lib/explain");

    const prompt = buildExplainPrompt("anything", {
      matchingContent: [],
      relevantSyntheses: [],
    });

    expect(prompt).toContain("knowledge base");
    expect(prompt).toContain("Cite content by title");
  });
});
