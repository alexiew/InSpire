// ABOUTME: Summarizes video transcripts using the Claude CLI.
// ABOUTME: Pipes prompts to stdin of `claude --print` to use the Max subscription.

import { spawn } from "child_process";

function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (
      value != null &&
      !key.startsWith("CLAUDE_CODE_") &&
      key !== "CLAUDE_ENTRY_POINT" &&
      key !== "CLAUDECODE"
    ) {
      env[key] = value;
    }
  }
  return env;
}

export function summarize(title: string, transcript: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["--print"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: cleanEnv(),
    });

    const prompt = `Summarize this video transcript titled "${title}". Include key points, main arguments, and notable insights. Be concise but comprehensive.\n\n${transcript}`;

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
