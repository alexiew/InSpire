// ABOUTME: Tests for the Claude CLI helper, focused on timeout and error handling.
// ABOUTME: Uses real subprocesses (sleep, cat) so no behavior is mocked.

import { describe, it, expect } from "vitest";
import { callClaude } from "./claude";

describe("callClaude", () => {
  it("resolves with trimmed stdout on success", async () => {
    const result = await callClaude("hello world", { command: "cat", args: [] });
    expect(result).toBe("hello world");
  });

  it("rejects when the subprocess exceeds the timeout", async () => {
    const start = Date.now();
    await expect(
      callClaude("ignored", { command: "sleep", args: ["10"], timeoutMs: 150 })
    ).rejects.toThrow(/timed out/i);
    // Must reject near the timeout, not wait for the full sleep.
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it("rejects when the command cannot be spawned", async () => {
    await expect(
      callClaude("ignored", { command: "definitely-not-a-real-binary-xyz", args: [] })
    ).rejects.toThrow();
  });
});
