// ABOUTME: Shared helper for calling the Claude CLI.
// ABOUTME: Spawns `claude --print` and pipes a prompt to stdin.

import { spawn } from "child_process";

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

export function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["--print"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: cleanEnv(),
    });

    child.stdin!.write(prompt);
    child.stdin!.end();

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout!.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr!.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdoutChunks).toString().trim());
      } else {
        const stderr = Buffer.concat(stderrChunks).toString().trim();
        reject(new Error(stderr || `claude exited with code ${code}`));
      }
    });
  });
}
