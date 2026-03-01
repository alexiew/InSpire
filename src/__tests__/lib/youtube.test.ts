// ABOUTME: Tests for YouTube URL parsing and metadata/transcript extraction.
// ABOUTME: URL parsing tests are pure; metadata/transcript tests mock external calls.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractVideoId } from "@/lib/youtube";

describe("extractVideoId", () => {
  it("extracts from youtube.com/watch?v=ID", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts from youtu.be/ID", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts from youtube.com/embed/ID", () => {
    expect(extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts from youtube.com/shorts/ID", () => {
    expect(extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("handles extra query params", () => {
    expect(
      extractVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLxyz"
      )
    ).toBe("dQw4w9WgXcQ");
  });

  it("handles URLs without www", () => {
    expect(extractVideoId("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("handles http URLs", () => {
    expect(extractVideoId("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("returns null for invalid URLs", () => {
    expect(extractVideoId("")).toBeNull();
    expect(extractVideoId("https://example.com")).toBeNull();
    expect(extractVideoId("not a url")).toBeNull();
    expect(extractVideoId("https://youtube.com/")).toBeNull();
  });

  it("handles youtu.be with query params", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ?t=30")).toBe(
      "dQw4w9WgXcQ"
    );
  });
});
