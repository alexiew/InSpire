// ABOUTME: Shared helper for calling the summarize CLI to extract text from a source.
// ABOUTME: Runs the subprocess under a timeout and rejects when it produces no output.

import { execFile } from "child_process";

interface SummarizeOptions {
  command?: string;
  timeoutMs?: number;
  emptyMessage?: string;
}

// A hung summarize subprocess would hold a processing-queue slot indefinitely
// and stall the whole pipeline, so cap how long any single call may run.
export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

// Audio transcription runs far longer than caption or article extraction.
export const AUDIO_TIMEOUT_MS = 30 * 60 * 1000;

export function runSummarize(args: string[], options?: SummarizeOptions): Promise<string> {
  const command = options?.command ?? "summarize";
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const emptyMessage = options?.emptyMessage ?? "Empty output returned";

  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { maxBuffer: 10 * 1024 * 1024, timeout: timeoutMs },
      (error, stdout, stderr) => {
        if (error) {
          const killedByTimeout = (error as { killed?: boolean }).killed;
          reject(
            killedByTimeout
              ? new Error(`${command} timed out after ${timeoutMs}ms`)
              : new Error(stderr || error.message)
          );
          return;
        }
        const output = stdout.trim();
        if (!output) {
          reject(new Error(emptyMessage));
          return;
        }
        resolve(output);
      }
    );
  });
}
