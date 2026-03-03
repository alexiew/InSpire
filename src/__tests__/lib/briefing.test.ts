// ABOUTME: Tests for intelligence briefing data gathering and prompt construction.
// ABOUTME: Verifies topic velocity computation, prompt structure, and briefing storage.

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
  const content = await import("@/lib/content");
  const topics = await import("@/lib/topics");
  const briefing = await import("@/lib/briefing");
  return { content, topics, briefing };
}

describe("getTopicVelocities", () => {
  it("returns topics sorted by newCount descending", async () => {
    const { content, briefing } = await loadModules();

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, { topics: ["longevity", "sleep"], status: "accepted" });

    const c2 = content.createContent("https://youtube.com/watch?v=b", "b", "youtube");
    content.updateContent(c2.id, { topics: ["longevity"], status: "accepted" });

    // c1 is "old" (in previousContentIds), c2 is "new"
    const velocities = briefing.getTopicVelocities([c1.id]);

    expect(velocities[0].slug).toBe("longevity");
    expect(velocities[0].contentCount).toBe(2);
    expect(velocities[0].newCount).toBe(1); // c2 is new

    expect(velocities[1].slug).toBe("sleep");
    expect(velocities[1].contentCount).toBe(1);
    expect(velocities[1].newCount).toBe(0); // c1 already seen
  });

  it("returns all new when no previous content IDs", async () => {
    const { content, briefing } = await loadModules();

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, { topics: ["longevity"], status: "accepted" });

    const velocities = briefing.getTopicVelocities([]);
    expect(velocities[0].newCount).toBe(1);
  });

  it("includes hasSynthesis flag", async () => {
    const { content, topics, briefing } = await loadModules();

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, { topics: ["longevity"], status: "accepted" });

    const c2 = content.createContent("https://youtube.com/watch?v=b", "b", "youtube");
    content.updateContent(c2.id, { topics: ["longevity"], status: "accepted" });

    topics.updateTopicSynthesis("longevity", "Some synthesis", [c1.id, c2.id]);

    const velocities = briefing.getTopicVelocities([]);
    expect(velocities[0].hasSynthesis).toBe(true);
  });
});

describe("buildBriefingPrompt", () => {
  it("includes topic velocity data", async () => {
    const { briefing } = await loadModules();

    const prompt = briefing.buildBriefingPrompt(
      [{ slug: "longevity", name: "longevity", contentCount: 5, newCount: 2, hasSynthesis: true }],
      [],
      []
    );
    expect(prompt).toContain("longevity");
    expect(prompt).toContain("5");
    expect(prompt).toContain("+2 new");
  });

  it("includes topic syntheses", async () => {
    const { briefing } = await loadModules();

    const prompt = briefing.buildBriefingPrompt(
      [],
      [],
      [{ name: "longevity", synthesis: "Longevity research shows promise in caloric restriction." }]
    );
    expect(prompt).toContain("caloric restriction");
  });

  it("includes recent content summaries", async () => {
    const { briefing } = await loadModules();

    const prompt = briefing.buildBriefingPrompt(
      [],
      [{ title: "Great Video", author: "Dr. Smith", summary: "About NAD+ levels", claims: ["NAD+ declines with age"] }],
      []
    );
    expect(prompt).toContain("Great Video");
    expect(prompt).toContain("NAD+ declines with age");
  });

  it("includes previous briefing in incremental mode", async () => {
    const { briefing } = await loadModules();

    const prompt = briefing.buildBriefingPrompt([], [], [], "Previous analysis showed convergence on GLP-1.");
    expect(prompt).toContain("Previous analysis showed convergence on GLP-1.");
  });

  it("requests tiered analysis sections", async () => {
    const { briefing } = await loadModules();

    const prompt = briefing.buildBriefingPrompt([], [], []);
    expect(prompt).toContain("Conservative");
    expect(prompt).toContain("Bold");
    expect(prompt).toContain("Moonshot");
    expect(prompt).toContain("Look Into This");
    expect(prompt).toContain("Headline");
  });
});

describe("saveBriefing / getLatestBriefing", () => {
  it("round-trips a briefing through the database", async () => {
    const { briefing } = await loadModules();

    const saved = briefing.saveBriefing(
      "## Headline\nBig insight.",
      [{ slug: "longevity", name: "longevity", contentCount: 5, newCount: 2, hasSynthesis: true }],
      ["id1", "id2"]
    );

    expect(saved.id).toBeTruthy();
    expect(saved.content).toBe("## Headline\nBig insight.");
    expect(saved.topicSnapshot).toEqual([
      { slug: "longevity", name: "longevity", contentCount: 5, newCount: 2, hasSynthesis: true },
    ]);
    expect(saved.contentIds).toEqual(["id1", "id2"]);
    expect(saved.createdAt).toBeTruthy();

    const latest = briefing.getLatestBriefing();
    expect(latest).toEqual(saved);
  });

  it("returns undefined when no briefings exist", async () => {
    const { briefing } = await loadModules();
    expect(briefing.getLatestBriefing()).toBeUndefined();
  });

  it("returns the newest briefing when multiple exist", async () => {
    const { briefing } = await loadModules();

    briefing.saveBriefing("First briefing", [], ["id1"]);
    const second = briefing.saveBriefing("Second briefing", [], ["id1", "id2"]);

    const latest = briefing.getLatestBriefing();
    expect(latest!.content).toBe("Second briefing");
    expect(latest!.id).toBe(second.id);
  });
});

describe("generateBriefing", () => {
  async function setup() {
    const { callClaude } = await import("@/lib/claude");
    const content = await import("@/lib/content");
    const topics = await import("@/lib/topics");
    const briefing = await import("@/lib/briefing");
    return {
      callClaude: callClaude as ReturnType<typeof vi.fn>,
      content,
      topics,
      briefing,
    };
  }

  it("generates a first briefing from accepted content", async () => {
    const { callClaude, content, briefing } = await setup();
    callClaude.mockResolvedValue("## Headline\nBig insight.");

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, {
      title: "Video A", author: "Auth A", summary: "Summary A",
      topics: ["longevity"], status: "accepted",
    });

    const result = await briefing.generateBriefing();

    expect(callClaude).toHaveBeenCalledOnce();
    expect(result.content).toBe("## Headline\nBig insight.");
    expect(result.contentIds).toContain(c1.id);
    expect(result.topicSnapshot.length).toBeGreaterThan(0);
  });

  it("uses incremental mode when previous briefing exists", async () => {
    const { callClaude, content, briefing } = await setup();
    callClaude.mockResolvedValue("First briefing.");

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, {
      title: "Video A", author: "Auth A", summary: "Summary A",
      topics: ["longevity"], status: "accepted",
    });

    await briefing.generateBriefing();

    // Add new content
    callClaude.mockResolvedValue("Updated briefing.");
    const c2 = content.createContent("https://youtube.com/watch?v=b", "b", "youtube");
    content.updateContent(c2.id, {
      title: "Video B", author: "Auth B", summary: "Summary B",
      topics: ["longevity"], status: "accepted",
    });

    const result = await briefing.generateBriefing();

    expect(callClaude).toHaveBeenCalledTimes(2);
    const prompt = callClaude.mock.calls[1][0];
    expect(prompt).toContain("First briefing.");
    expect(result.content).toBe("Updated briefing.");
  });

  it("throws when no accepted content exists", async () => {
    const { briefing } = await setup();
    await expect(briefing.generateBriefing()).rejects.toThrow("No accepted content");
  });

  it("throws when no new content since last briefing", async () => {
    const { callClaude, content, briefing } = await setup();
    callClaude.mockResolvedValue("First briefing.");

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, {
      title: "Video A", author: "Auth A", summary: "Summary A",
      topics: ["longevity"], status: "accepted",
    });

    await briefing.generateBriefing();

    await expect(briefing.generateBriefing()).rejects.toThrow("No new content since last briefing");
  });

  it("stores content IDs for incremental detection", async () => {
    const { callClaude, content, briefing } = await setup();
    callClaude.mockResolvedValue("Briefing result.");

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, {
      title: "Video A", author: "Auth A", summary: "Summary A",
      topics: ["longevity"], status: "accepted",
    });

    await briefing.generateBriefing();

    const latest = briefing.getLatestBriefing();
    expect(latest!.contentIds).toContain(c1.id);
  });
});
