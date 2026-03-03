// ABOUTME: Tests for synthesis prompt construction and incremental synthesis logic.
// ABOUTME: Verifies prompt building, incremental updates, and up-to-date detection.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { buildSynthesisPrompt, buildIncrementalPrompt } from "@/lib/synthesize";
import { closeDb } from "@/lib/db";

describe("buildSynthesisPrompt", () => {
  const items = [
    {
      title: "Sleep and Recovery",
      author: "Dr. Smith",
      summary: "This episode covers how sleep affects muscle recovery and cognitive performance.",
      claims: ["Sleep deprivation reduces strength by 20%", "REM sleep is critical for memory"],
    },
    {
      title: "Optimizing Rest",
      author: "Dr. Jones",
      summary: "A deep dive into rest protocols including napping, meditation, and sleep hygiene.",
      claims: ["Napping for 20 minutes boosts alertness", "Blue light disrupts melatonin"],
    },
  ];

  it("includes topic name", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain('"Sleep"');
  });

  it("includes summaries for each content item", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain("how sleep affects muscle recovery");
    expect(prompt).toContain("rest protocols including napping");
  });

  it("includes claims for each content item", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain("Sleep deprivation reduces strength by 20%");
    expect(prompt).toContain("Blue light disrupts melatonin");
  });

  it("includes author and title for attribution", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain("Sleep and Recovery");
    expect(prompt).toContain("Dr. Smith");
    expect(prompt).toContain("Optimizing Rest");
    expect(prompt).toContain("Dr. Jones");
  });

  it("handles items with no claims", () => {
    const items2 = [
      { title: "A", author: "X", summary: "Summary A", claims: [] },
      { title: "B", author: "Y", summary: "Summary B", claims: ["One claim"] },
    ];
    const prompt = buildSynthesisPrompt("Topic", items2);
    expect(prompt).toContain("Summary A");
    expect(prompt).toContain("One claim");
  });

  it("includes the content count", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain("2 pieces of content");
  });
});

describe("buildIncrementalPrompt", () => {
  const previousSynthesis = "Sources agree that sleep is critical for recovery. Dr. Smith emphasizes strength impacts while Dr. Jones focuses on alertness.";

  const newItems = [
    {
      title: "Sleep and Hormones",
      author: "Dr. Lee",
      summary: "Explores how sleep regulates cortisol, testosterone, and growth hormone.",
      claims: ["Growth hormone peaks during deep sleep", "Cortisol spikes after sleep deprivation"],
    },
  ];

  it("includes the previous synthesis", () => {
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, newItems);
    expect(prompt).toContain(previousSynthesis);
  });

  it("includes only new items' summaries and claims", () => {
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, newItems);
    expect(prompt).toContain("sleep regulates cortisol");
    expect(prompt).toContain("Growth hormone peaks during deep sleep");
  });

  it("includes topic name", () => {
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, newItems);
    expect(prompt).toContain('"Sleep"');
  });

  it("includes new item count", () => {
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, newItems);
    expect(prompt).toContain("1 new source");
  });

  it("uses plural for multiple new items", () => {
    const twoItems = [
      ...newItems,
      { title: "B", author: "Y", summary: "Summary B", claims: [] },
    ];
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, twoItems);
    expect(prompt).toContain("2 new sources");
  });
});

vi.mock("@/lib/claude", () => ({
  callClaude: vi.fn(),
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "inspire-synth-test-"));
  process.env.INSPIRE_DATA_DIR = tmpDir;
  vi.clearAllMocks();
});

afterEach(() => {
  closeDb();
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.INSPIRE_DATA_DIR;
  vi.restoreAllMocks();
});

describe("synthesizeTopic", () => {
  async function setup() {
    const { callClaude } = await import("@/lib/claude");
    const { createContent, updateContent } = await import("@/lib/content");
    const { getLatestSynthesisRecord } = await import("@/lib/topics");
    const { synthesizeTopic } = await import("@/lib/synthesize");
    return { callClaude: callClaude as ReturnType<typeof vi.fn>, createContent, updateContent, synthesizeTopic, getLatestSynthesisRecord };
  }

  it("first synthesis uses full prompt with all items", async () => {
    const { callClaude, createContent, updateContent, synthesizeTopic } = await setup();
    callClaude.mockResolvedValue("Full synthesis result.");

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { title: "Video A", author: "Auth A", summary: "Summary A", topics: ["test-topic"], status: "accepted" });
    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { title: "Video B", author: "Auth B", summary: "Summary B", topics: ["test-topic"], status: "accepted" });

    await synthesizeTopic("test-topic");

    expect(callClaude).toHaveBeenCalledOnce();
    const prompt = callClaude.mock.calls[0][0];
    expect(prompt).toContain("2 pieces of content");
    expect(prompt).toContain("Summary A");
    expect(prompt).toContain("Summary B");
  });

  it("incremental synthesis uses previous synthesis + new items only", async () => {
    const { callClaude, createContent, updateContent, synthesizeTopic } = await setup();
    callClaude.mockResolvedValue("First synthesis.");

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { title: "Video A", author: "Auth A", summary: "Summary A", topics: ["test-topic"], status: "accepted" });
    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { title: "Video B", author: "Auth B", summary: "Summary B", topics: ["test-topic"], status: "accepted" });

    await synthesizeTopic("test-topic");

    // Add a third content item
    callClaude.mockResolvedValue("Updated synthesis.");
    const c3 = createContent("https://youtube.com/watch?v=c", "c", "youtube");
    updateContent(c3.id, { title: "Video C", author: "Auth C", summary: "Summary C", topics: ["test-topic"], status: "accepted" });

    await synthesizeTopic("test-topic");

    expect(callClaude).toHaveBeenCalledTimes(2);
    const prompt = callClaude.mock.calls[1][0];
    expect(prompt).toContain("First synthesis.");
    expect(prompt).toContain("1 new source");
    expect(prompt).toContain("Summary C");
    expect(prompt).not.toContain("Summary A");
    expect(prompt).not.toContain("Summary B");
  });

  it("throws when no new content since last synthesis", async () => {
    const { callClaude, createContent, updateContent, synthesizeTopic } = await setup();
    callClaude.mockResolvedValue("Synthesis result.");

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { title: "Video A", author: "Auth A", summary: "Summary A", topics: ["test-topic"], status: "accepted" });
    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { title: "Video B", author: "Auth B", summary: "Summary B", topics: ["test-topic"], status: "accepted" });

    await synthesizeTopic("test-topic");

    await expect(synthesizeTopic("test-topic")).rejects.toThrow("up to date");
    expect(callClaude).toHaveBeenCalledOnce();
  });

  it("stores all current content IDs after synthesis", async () => {
    const { callClaude, createContent, updateContent, synthesizeTopic, getLatestSynthesisRecord } = await setup();
    callClaude.mockResolvedValue("Synthesis.");

    const c1 = createContent("https://youtube.com/watch?v=a", "a", "youtube");
    updateContent(c1.id, { title: "A", author: "A", summary: "A", topics: ["test-topic"], status: "accepted" });
    const c2 = createContent("https://youtube.com/watch?v=b", "b", "youtube");
    updateContent(c2.id, { title: "B", author: "B", summary: "B", topics: ["test-topic"], status: "accepted" });

    await synthesizeTopic("test-topic");

    const record = getLatestSynthesisRecord("test-topic");
    expect(record!.contentIds).toHaveLength(2);
    expect(record!.contentIds).toContain(c1.id);
    expect(record!.contentIds).toContain(c2.id);
  });
});
