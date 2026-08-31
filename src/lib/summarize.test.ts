// ABOUTME: Tests for the summarize CLI helper, focused on timeout and error handling.
// ABOUTME: Uses real subprocesses (echo, sleep) so no behavior is mocked.

import { describe, it, expect } from "vitest";
import { runSummarize } from "./summarize";

describe("runSummarize", () => {
  it("resolves with trimmed stdout on success", async () => {
    const result = await runSummarize(["hello world"], { command: "echo" });
    expect(result).toBe("hello world");
  });

  it("rejects when the subprocess exceeds the timeout", async () => {
    const start = Date.now();
    await expect(
      runSummarize(["10"], { command: "sleep", timeoutMs: 150 })
    ).rejects.toThrow(/timed out/i);
    // Must reject near the timeout, not wait for the full sleep.
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it("rejects when the subprocess produces no output", async () => {
    await expect(
      runSummarize([""], { command: "echo", emptyMessage: "Empty transcript returned" })
    ).rejects.toThrow("Empty transcript returned");
  });

  it("rejects when the command cannot be spawned", async () => {
    await expect(
      runSummarize([], { command: "definitely-not-a-real-binary-xyz" })
    ).rejects.toThrow();
  });
});
