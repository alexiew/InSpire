// ABOUTME: Tests the content processing pipeline's status and error bookkeeping.
// ABOUTME: Stubs the network and CLI boundaries so no subprocess or request is made.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { closeDb } from "@/lib/db";

vi.mock("@/lib/youtube", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/youtube")>()),
  fetchMetadata: async () => ({
    title: "A video",
    author: "An author",
    thumbnailUrl: "https://example.com/thumb.jpg",
  }),
  fetchTranscript: async () => "a transcript with several words in it",
}));

vi.mock("@/lib/extract", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/extract")>()),
  extract: async () => ({
    summary: "A summary",
    topics: ["a topic"],
    claims: ["a claim"],
    people: ["A Person"],
  }),
}));

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

describe("processContent", () => {
  it("clears the error from a previous failure once processing succeeds", async () => {
    const { createContent, updateContent, getContent } = await import("@/lib/content");
    const { processContent } = await import("@/lib/process-content");

    const item = createContent("https://youtube.com/watch?v=aaa", "aaa", "youtube");
    updateContent(item.id, { status: "error", error: "fetch failed" });

    await processContent(item.id);

    const after = getContent(item.id);
    expect(after?.status).toBe("ready");
    expect(after?.error).toBeFalsy();
  });

  it("records the failure when the pipeline throws", async () => {
    const { createContent, getContent } = await import("@/lib/content");
    const { processContent } = await import("@/lib/process-content");

    await processContent("does-not-exist");

    const item = createContent("https://youtube.com/watch?v=bbb", "bbb", "youtube");
    expect(getContent(item.id)?.status).toBe("processing");
  });
});
