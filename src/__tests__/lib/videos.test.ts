// ABOUTME: Tests for video CRUD operations.
// ABOUTME: Uses a temp directory for test isolation.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "inspire-test-"));
  mkdirSync(path.join(tmpDir, "data"), { recursive: true });
  process.env.INSPIRE_DATA_DIR = tmpDir;
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.INSPIRE_DATA_DIR;
});

async function loadModule() {
  const mod = await import("@/lib/videos");
  return mod;
}

describe("listVideos", () => {
  it("returns empty array when data file does not exist", async () => {
    const { listVideos } = await loadModule();
    expect(listVideos()).toEqual([]);
  });

  it("returns videos sorted by createdAt descending", async () => {
    const { listVideos, createVideo } = await loadModule();
    const v1 = createVideo("https://youtube.com/watch?v=aaa", "aaa");
    // Ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));
    const v2 = createVideo("https://youtube.com/watch?v=bbb", "bbb");
    // v2 was created after v1, so should come first
    const videos = listVideos();
    expect(videos).toHaveLength(2);
    expect(videos[0].id).toBe(v2.id);
    expect(videos[1].id).toBe(v1.id);
  });
});

describe("createVideo", () => {
  it("creates a video with processing status", async () => {
    const { createVideo, getVideo } = await loadModule();
    const v = createVideo("https://youtube.com/watch?v=abc123", "abc123");
    expect(v.url).toBe("https://youtube.com/watch?v=abc123");
    expect(v.videoId).toBe("abc123");
    expect(v.status).toBe("processing");
    expect(v.title).toBe("");
    expect(v.author).toBe("");
    expect(v.thumbnailUrl).toBe("");
    expect(v.transcript).toBe("");
    expect(v.summary).toBe("");
    expect(v.id).toBeTruthy();
    expect(v.createdAt).toBeTruthy();

    const fetched = getVideo(v.id);
    expect(fetched).toEqual(v);
  });
});

describe("getVideo", () => {
  it("returns undefined for nonexistent id", async () => {
    const { getVideo } = await loadModule();
    expect(getVideo("nonexistent")).toBeUndefined();
  });
});

describe("updateVideo", () => {
  it("updates fields and bumps updatedAt", async () => {
    const { createVideo, updateVideo } = await loadModule();
    const v = createVideo("https://youtube.com/watch?v=abc", "abc");
    const originalUpdatedAt = v.updatedAt;

    // Small delay to ensure timestamp differs
    await new Promise((r) => setTimeout(r, 10));

    const updated = updateVideo(v.id, {
      title: "My Video",
      author: "Author",
      status: "ready",
    });
    expect(updated?.title).toBe("My Video");
    expect(updated?.author).toBe("Author");
    expect(updated?.status).toBe("ready");
    expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("returns undefined for nonexistent id", async () => {
    const { updateVideo } = await loadModule();
    expect(updateVideo("nope", { title: "x" })).toBeUndefined();
  });
});

describe("deleteVideo", () => {
  it("deletes a video and returns true", async () => {
    const { createVideo, deleteVideo, listVideos } = await loadModule();
    const v = createVideo("https://youtube.com/watch?v=del", "del");
    expect(deleteVideo(v.id)).toBe(true);
    expect(listVideos()).toHaveLength(0);
  });

  it("returns false for nonexistent id", async () => {
    const { deleteVideo } = await loadModule();
    expect(deleteVideo("nope")).toBe(false);
  });
});
