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

// Helper: create N accepted content items with given topics and/or people
function createItems(
  contentModule: Awaited<ReturnType<typeof loadModules>>["content"],
  count: number,
  topics: string[],
  people: string[] = []
) {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const c = contentModule.createContent(`https://youtube.com/watch?v=gen-${Date.now()}-${i}`, `gen-${Date.now()}-${i}`, "youtube");
    contentModule.updateContent(c.id, { topics, people, status: "accepted" });
    ids.push(c.id);
  }
  return ids;
}

describe("computeTopicVelocity", () => {
  it("returns empty when knowledge base has fewer than 30 items", async () => {
    const { content, briefing } = await loadModules();

    createItems(content, 10, ["longevity"]);

    const velocities = briefing.computeTopicVelocity();
    expect(velocities).toEqual([]);
  });

  it("excludes topics with fewer than 3 content items", async () => {
    const { content, briefing } = await loadModules();

    // 28 items for "longevity" + 2 items for "rare-topic" = 30 total
    createItems(content, 28, ["longevity"]);
    createItems(content, 2, ["rare-topic"]);

    const velocities = briefing.computeTopicVelocity();
    const slugs = velocities.map((v) => v.slug);
    expect(slugs).toContain("longevity");
    expect(slugs).not.toContain("rare-topic");
  });

  it("computes baseline and recent ratios correctly", async () => {
    const { content, briefing } = await loadModules();

    // Create 20 older items tagged "background" (not in recent window of 50, but will be in KB)
    // Then 30 recent items: 20 "longevity" + 10 "sleep"
    // Total: 50 items
    // But we need all 50 to be in the window since window=50 and total=50
    // So baseline = recent for this case. Let's make it bigger.

    // 60 items total: first 30 are "background", then 15 "longevity" + 15 "sleep"
    // Window = last 50 items
    // Background: 30 total, ~20 in window (the last 20 of the 30)
    // Actually, order matters — created_at DESC means newest first
    // Items created first are oldest, last are newest

    // Create in order: 30 background, 15 longevity, 15 sleep
    // Newest 50 = 10 background + 15 longevity + 15 sleep (wait, that's only 40)
    // Let me simplify: 40 background items, then 20 longevity items = 60 total
    // baseline for longevity: 20/60 = 33%
    // recent window (last 50): 20 longevity + 30 background → longevity recent = 20/50 = 40%
    // velocity = 40% / 33% = 1.2x
    // That's not very dramatic. Let me make it clearer.

    // 50 background, then 10 longevity = 60 total
    // baseline for longevity: 10/60 = 16.7%
    // window (last 50): 10 longevity + 40 background → longevity recent = 10/50 = 20%
    // velocity = 20% / 16.7% = 1.2x — still mild

    // Need more contrast: 80 background, then 20 longevity = 100 total
    // baseline: 20/100 = 20%
    // window (last 50): 20 longevity + 30 background → longevity recent = 20/50 = 40%
    // velocity = 40%/20% = 2.0x — rising!

    createItems(content, 80, ["background"]);
    createItems(content, 20, ["longevity"]);

    const velocities = briefing.computeTopicVelocity();
    const longevity = velocities.find((v) => v.slug === "longevity")!;

    expect(longevity).toBeDefined();
    expect(longevity.contentCount).toBe(20);
    expect(longevity.baselineRatio).toBeCloseTo(0.2, 2);    // 20/100
    expect(longevity.recentRatio).toBeCloseTo(0.4, 2);      // 20/50
    expect(longevity.velocity).toBeCloseTo(2.0, 1);          // 0.4/0.2
  });

  it("detects over-represented topics as rising", async () => {
    const { content, briefing } = await loadModules();

    // 70 background, then 30 "hot-topic" = 100 total
    // baseline: 30/100 = 30%, recent: 30/50 = 60%, velocity = 2.0x
    createItems(content, 70, ["background"]);
    createItems(content, 30, ["hot-topic"]);

    const velocities = briefing.computeTopicVelocity();
    const hot = velocities.find((v) => v.slug === "hot-topic")!;

    expect(hot.velocity).toBeGreaterThan(1.5);
  });

  it("detects under-represented topics as cooling", async () => {
    const { content, briefing } = await loadModules();

    // 30 "fading-topic" first (old), then 70 "other" (recent) = 100 total
    // baseline for fading: 30/100 = 30%
    // window (last 50): all 50 are "other" → fading recent = 0/50 = 0%
    // velocity = 0/0.3 = 0
    createItems(content, 30, ["fading-topic"]);
    createItems(content, 70, ["other"]);

    const velocities = briefing.computeTopicVelocity();
    const fading = velocities.find((v) => v.slug === "fading-topic")!;

    expect(fading.velocity).toBeLessThan(0.5);
  });

  it("sorts by deviation from baseline (most deviated first)", async () => {
    const { content, briefing } = await loadModules();

    // 50 background (old), then 25 "trending" + 25 "also-trending" = 100 total
    // Both trending topics have same velocity — but let's make them different
    // 60 background, then 30 "hot" + 10 "warm" = 100
    // hot: baseline 30/100=30%, recent 30/50=60%, velocity=2.0x, |v-1|=1.0
    // warm: baseline 10/100=10%, recent 10/50=20%, velocity=2.0x, |v-1|=1.0
    // Same deviation! Let me adjust.
    // 60 background, 35 "hot", 5 "mild" = 100
    // hot: baseline 35%, recent 35/50=70%, v=2.0x
    // mild: baseline 5%, recent 5/50=10%, v=2.0x — same again
    // The ratio-based velocity gives same result for proportional over-representation
    // To differentiate: 55 background, 40 "hot", 5 "mild" = 100
    // hot: baseline 40%, recent 40/50=80%, v=2.0x
    // background: baseline 55%, recent 10/50=20%, v=0.36x, |v-1|=0.64
    // hot |v-1| = 1.0, background |v-1| = 0.64 → hot sorts first

    createItems(content, 55, ["background"]);
    createItems(content, 40, ["hot"]);
    createItems(content, 5, ["mild"]);

    const velocities = briefing.computeTopicVelocity();

    // "hot" should be more deviated than "background"
    const hotIdx = velocities.findIndex((v) => v.slug === "hot");
    const bgIdx = velocities.findIndex((v) => v.slug === "background");
    expect(hotIdx).toBeLessThan(bgIdx);
  });

  it("includes hasSynthesis flag", async () => {
    const { content, topics, briefing } = await loadModules();

    const ids = createItems(content, 30, ["longevity"]);
    topics.updateTopicSynthesis("longevity", "Some synthesis", ids);

    const velocities = briefing.computeTopicVelocity();
    const longevity = velocities.find((v) => v.slug === "longevity")!;
    expect(longevity.hasSynthesis).toBe(true);
  });
});

describe("computePeopleVelocity", () => {
  it("returns empty when knowledge base has fewer than 30 items", async () => {
    const { content, briefing } = await loadModules();

    createItems(content, 10, ["topic"], ["Dr. Huberman"]);

    const velocities = briefing.computePeopleVelocity();
    expect(velocities).toEqual([]);
  });

  it("excludes people with fewer than 3 content items", async () => {
    const { content, briefing } = await loadModules();

    createItems(content, 28, ["topic"], ["Dr. Huberman"]);
    createItems(content, 2, ["topic"], ["Rare Guest"]);

    const velocities = briefing.computePeopleVelocity();
    const slugs = velocities.map((v) => v.slug);
    expect(slugs).toContain("dr-huberman");
    expect(slugs).not.toContain("rare-guest");
  });

  it("computes baseline and recent ratios correctly", async () => {
    const { content, briefing } = await loadModules();

    // 80 items with "Dr. A", then 20 with "Dr. B" = 100 total
    // Dr. B: baseline 20/100=20%, recent 20/50=40%, velocity=2.0x
    createItems(content, 80, ["topic"], ["Dr. A"]);
    createItems(content, 20, ["topic"], ["Dr. B"]);

    const velocities = briefing.computePeopleVelocity();
    const drB = velocities.find((v) => v.slug === "dr-b")!;

    expect(drB).toBeDefined();
    expect(drB.contentCount).toBe(20);
    expect(drB.baselineRatio).toBeCloseTo(0.2, 2);
    expect(drB.recentRatio).toBeCloseTo(0.4, 2);
    expect(drB.velocity).toBeCloseTo(2.0, 1);
  });

  it("detects over-represented people as rising", async () => {
    const { content, briefing } = await loadModules();

    createItems(content, 70, ["topic"], ["Background Host"]);
    createItems(content, 30, ["topic"], ["Hot Guest"]);

    const velocities = briefing.computePeopleVelocity();
    const hot = velocities.find((v) => v.slug === "hot-guest")!;

    expect(hot.velocity).toBeGreaterThan(1.5);
  });

  it("sorts by deviation from baseline", async () => {
    const { content, briefing } = await loadModules();

    createItems(content, 55, ["topic"], ["Background Host"]);
    createItems(content, 40, ["topic"], ["Hot Guest"]);
    createItems(content, 5, ["topic"], ["Mild Guest"]);

    const velocities = briefing.computePeopleVelocity();

    const hotIdx = velocities.findIndex((v) => v.slug === "hot-guest");
    const bgIdx = velocities.findIndex((v) => v.slug === "background-host");
    expect(hotIdx).toBeLessThan(bgIdx);
  });
});

describe("buildBriefingPrompt", () => {
  it("includes topic velocity data", async () => {
    const { briefing } = await loadModules();

    const prompt = briefing.buildBriefingPrompt(
      [{ slug: "longevity", name: "longevity", contentCount: 50, baselineRatio: 0.05, recentRatio: 0.20, velocity: 4.0, hasSynthesis: true }],
      [],
      []
    );
    expect(prompt).toContain("longevity");
    expect(prompt).toContain("50 items");
    expect(prompt).toContain("baseline 5%");
    expect(prompt).toContain("recent 20%");
    expect(prompt).toContain("4.0x");
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

  it("includes people velocity data", async () => {
    const { briefing } = await loadModules();

    const prompt = briefing.buildBriefingPrompt(
      [],
      [],
      [],
      undefined,
      [{ slug: "dr-huberman", name: "Dr. Huberman", contentCount: 20, baselineRatio: 0.10, recentRatio: 0.30, velocity: 3.0 }]
    );
    expect(prompt).toContain("PEOPLE VELOCITY");
    expect(prompt).toContain("Dr. Huberman");
    expect(prompt).toContain("3.0x");
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
      [{ slug: "longevity", name: "longevity", contentCount: 50, baselineRatio: 0.05, recentRatio: 0.20, velocity: 4.0, hasSynthesis: true }],
      ["id1", "id2"]
    );

    expect(saved.id).toBeTruthy();
    expect(saved.content).toBe("## Headline\nBig insight.");
    expect(saved.topicSnapshot).toEqual([
      { slug: "longevity", name: "longevity", contentCount: 50, baselineRatio: 0.05, recentRatio: 0.20, velocity: 4.0, hasSynthesis: true },
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

describe("listBriefings", () => {
  it("returns all briefings newest first", async () => {
    const { briefing } = await loadModules();

    const first = briefing.saveBriefing("First", [], ["id1"]);
    const second = briefing.saveBriefing("Second", [], ["id1", "id2"]);

    const all = briefing.listBriefings();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(second.id);
    expect(all[1].id).toBe(first.id);
  });

  it("returns empty array when no briefings exist", async () => {
    const { briefing } = await loadModules();
    expect(briefing.listBriefings()).toEqual([]);
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
    // With only 1 item, KB is below minimum for velocity — snapshot is empty
    expect(result.topicSnapshot).toEqual([]);
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
