// ABOUTME: Tests for Claude CLI summarization.
// ABOUTME: Mocks child_process.spawn to verify correct invocation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";
import type { ChildProcess } from "child_process";

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "child_process";
import { summarize } from "@/lib/summarize";

const mockSpawn = vi.mocked(spawn);

function createMockProcess(
  stdout: string,
  exitCode: number,
  stderr = ""
): ChildProcess {
  const proc = new EventEmitter() as ChildProcess;
  const stdinStream = new EventEmitter() as NodeJS.WritableStream;
  const writtenChunks: string[] = [];
  stdinStream.write = vi.fn((chunk: unknown) => {
    writtenChunks.push(String(chunk));
    return true;
  }) as unknown as typeof stdinStream.write;
  stdinStream.end = vi.fn() as unknown as typeof stdinStream.end;

  const stdoutStream = new EventEmitter();
  const stderrStream = new EventEmitter();

  proc.stdin = stdinStream as unknown as ChildProcess["stdin"];
  proc.stdout = stdoutStream as unknown as ChildProcess["stdout"];
  proc.stderr = stderrStream as unknown as ChildProcess["stderr"];

  // Store for inspection
  (proc as unknown as { _writtenChunks: string[] })._writtenChunks =
    writtenChunks;

  // Emit data and close asynchronously
  setTimeout(() => {
    if (stdout) stdoutStream.emit("data", Buffer.from(stdout));
    if (stderr) stderrStream.emit("data", Buffer.from(stderr));
    proc.emit("close", exitCode);
  }, 0);

  return proc;
}

beforeEach(() => {
  mockSpawn.mockReset();
});

describe("summarize", () => {
  it("spawns claude --print and returns stdout", async () => {
    const proc = createMockProcess("This is the summary.", 0);
    mockSpawn.mockReturnValue(proc);

    const result = await summarize("My Video", "Full transcript text here.");
    expect(result).toBe("This is the summary.");
    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["--print"],
      expect.objectContaining({
        stdio: ["pipe", "pipe", "pipe"],
      })
    );
  });

  it("pipes prompt with title and transcript to stdin", async () => {
    const proc = createMockProcess("Summary.", 0);
    mockSpawn.mockReturnValue(proc);

    await summarize("Test Title", "Transcript content.");
    const written = (
      proc as unknown as { _writtenChunks: string[] }
    )._writtenChunks.join("");
    expect(written).toContain("Test Title");
    expect(written).toContain("Transcript content.");
  });

  it("strips CLAUDE_CODE_ env vars from spawned process", async () => {
    process.env.CLAUDE_CODE_TEST = "should-be-stripped";
    const proc = createMockProcess("Summary.", 0);
    mockSpawn.mockReturnValue(proc);

    await summarize("Title", "Text.");
    const envArg = mockSpawn.mock.calls[0][2]?.env as
      | Record<string, string>
      | undefined;
    expect(envArg).toBeDefined();
    expect(envArg!.CLAUDE_CODE_TEST).toBeUndefined();

    delete process.env.CLAUDE_CODE_TEST;
  });

  it("rejects on non-zero exit code with stderr", async () => {
    const proc = createMockProcess("", 1, "Error occurred");
    mockSpawn.mockReturnValue(proc);

    await expect(summarize("Title", "Text.")).rejects.toThrow(
      "Error occurred"
    );
  });
});
