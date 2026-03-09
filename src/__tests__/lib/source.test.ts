// ABOUTME: Tests for source attribution — identifying which content items a briefing passage comes from.
// ABOUTME: Verifies content loading by IDs and prompt construction.

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
  const source = await import("@/lib/source");
  return { content, source };
}

describe("loadSourceCandidates", () => {
  it("loads content items matching the given IDs", async () => {
    const { content, source } = await loadModules();

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, {
      title: "AI Safety Research",
      summary: "Overview of AI alignment approaches.",
      claims: ["RLHF has limitations"],
      status: "accepted",
    });

    const c2 = content.createContent("https://youtube.com/watch?v=b", "b", "youtube");
    content.updateContent(c2.id, {
      title: "Climate Policy",
      summary: "Carbon tax effectiveness analysis.",
      claims: ["Carbon pricing works"],
      status: "accepted",
    });

    const candidates = source.loadSourceCandidates([c1.id, c2.id]);

    expect(candidates).toHaveLength(2);
    expect(candidates[0].title).toBe("AI Safety Research");
    expect(candidates[1].title).toBe("Climate Policy");
  });

  it("skips content IDs that no longer exist", async () => {
    const { content, source } = await loadModules();

    const c1 = content.createContent("https://youtube.com/watch?v=a", "a", "youtube");
    content.updateContent(c1.id, {
      title: "AI Safety Research",
      summary: "Overview.",
      status: "accepted",
    });

    const candidates = source.loadSourceCandidates([c1.id, "nonexistent-id"]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].title).toBe("AI Safety Research");
  });

  it("returns empty array when no IDs match", async () => {
    const { source } = await loadModules();

    const candidates = source.loadSourceCandidates(["fake-1", "fake-2"]);

    expect(candidates).toHaveLength(0);
  });
});

describe("buildSourcePrompt", () => {
  it("includes the selected text and candidate content", async () => {
    const { source } = await loadModules();

    const prompt = source.buildSourcePrompt("RLHF has known limitations", [
      {
        id: "abc",
        title: "AI Safety Research",
        author: "Dr. Smith",
        summary: "Overview of AI alignment approaches including RLHF.",
        claims: ["RLHF has limitations"],
      },
      {
        id: "def",
        title: "Climate Policy",
        author: "Jane Doe",
        summary: "Carbon tax effectiveness.",
        claims: [],
      },
    ]);

    expect(prompt).toContain("RLHF has known limitations");
    expect(prompt).toContain("AI Safety Research");
    expect(prompt).toContain("Climate Policy");
    expect(prompt).toContain("[abc]");
    expect(prompt).toContain("[def]");
  });

  it("instructs Claude to return JSON with matching content IDs", async () => {
    const { source } = await loadModules();

    const prompt = source.buildSourcePrompt("some text", [
      { id: "abc", title: "Test", author: "Author", summary: "Summary", claims: [] },
    ]);

    expect(prompt).toContain("JSON");
    expect(prompt).toContain("id");
  });
});
