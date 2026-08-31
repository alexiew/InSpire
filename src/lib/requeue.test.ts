// ABOUTME: Tests that items stranded in the processing state are picked back up.
// ABOUTME: Stubs the pipeline so the fan-out is exercised without spawning subprocesses.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { closeDb } from "@/lib/db";

const processed: string[] = [];

vi.mock("@/lib/process-content", () => ({
  processContent: async (id: string) => {
    processed.push(id);
  },
}));

let tmpDir: string;

beforeEach(() => {
  processed.length = 0;
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "inspire-test-"));
  process.env.INSPIRE_DATA_DIR = tmpDir;
});

afterEach(() => {
  closeDb();
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.INSPIRE_DATA_DIR;
});

describe("requeueStuckProcessing", () => {
  it("requeues nothing when no item is stuck", async () => {
    const { requeueStuckProcessing } = await import("@/lib/process-queue");
    expect(requeueStuckProcessing()).toBe(0);
  });

  it("requeues every item left in the processing state", async () => {
    const { createContent, updateContent } = await import("@/lib/content");
    const { requeueStuckProcessing } = await import("@/lib/process-queue");

    const stuck = createContent("https://youtube.com/watch?v=aaa", "aaa", "youtube");
    const alsoStuck = createContent("https://youtube.com/watch?v=bbb", "bbb", "youtube");
    const done = createContent("https://youtube.com/watch?v=ccc", "ccc", "youtube");
    updateContent(done.id, { status: "ready" });

    expect(requeueStuckProcessing()).toBe(2);

    await vi.waitFor(() => expect(processed).toHaveLength(2));
    expect(processed.sort()).toEqual([stuck.id, alsoStuck.id].sort());
  });
});
