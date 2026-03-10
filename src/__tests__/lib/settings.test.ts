// ABOUTME: Tests for global application settings.
// ABOUTME: Verifies get/set operations and default values.

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

async function loadModule() {
  return await import("@/lib/settings");
}

describe("getSetting / setSetting", () => {
  it("returns default when key does not exist", async () => {
    const { getSetting } = await loadModule();
    expect(getSetting("nonexistent", "fallback")).toBe("fallback");
  });

  it("stores and retrieves a value", async () => {
    const { getSetting, setSetting } = await loadModule();
    setSetting("min_transcript_words", "100");
    expect(getSetting("min_transcript_words", "0")).toBe("100");
  });

  it("overwrites existing value", async () => {
    const { getSetting, setSetting } = await loadModule();
    setSetting("min_transcript_words", "100");
    setSetting("min_transcript_words", "200");
    expect(getSetting("min_transcript_words", "0")).toBe("200");
  });
});
