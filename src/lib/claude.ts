// ABOUTME: Shared helper for calling the Claude CLI.
// ABOUTME: Spawns `claude --print` and pipes a prompt to stdin.

import { spawn } from "child_process";

interface ClaudeOptions {
  command?: string;
  args?: string[];
  timeoutMs?: number;
}

// A hung claude subprocess would hold a processing-queue slot indefinitely
// and stall the whole pipeline, so cap how long any single call may run.
export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

function cleanEnv(): NodeJS.ProcessEnv {
  const env: Record<string, string | undefined> = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      key.startsWith("CLAUDE_CODE_") ||
      key === "CLAUDE_ENTRY_POINT" ||
      key === "CLAUDECODE"
    ) {
      delete env[key];
    }
  }
  return env as NodeJS.ProcessEnv;
}

export function callClaude(prompt: string, options?: ClaudeOptions): Promise<string> {
  const command = options?.command ?? "claude";
  const args = options?.args ?? ["--print"];
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: cleanEnv(),
    });

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => {
        child.kill("SIGKILL");
        reject(new Error(`claude timed out after ${timeoutMs}ms`));
      });
    }, timeoutMs);

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout!.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr!.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    // Swallow EPIPE when the child dies before stdin is fully written.
    child.stdin!.on("error", () => {});
    child.stdin!.write(prompt);
    child.stdin!.end();

    child.on("error", (err) => finish(() => reject(err)));

    child.on("close", (code) => {
      finish(() => {
        if (code === 0) {
          resolve(Buffer.concat(stdoutChunks).toString().trim());
        } else {
          const stderr = Buffer.concat(stderrChunks).toString().trim();
          reject(new Error(stderr || `claude exited with code ${code}`));
        }
      });
    });
  });
}
