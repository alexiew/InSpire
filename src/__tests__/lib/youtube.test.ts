// ABOUTME: Tests for YouTube URL parsing and channel feed parsing.
// ABOUTME: All tests use pure functions with known input strings.

import { describe, it, expect } from "vitest";
import { extractVideoId, parseChannelId, parseChannelFeed } from "@/lib/youtube";

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

describe("parseChannelId", () => {
  it("extracts channel ID from page HTML", () => {
    const html = `<link rel="canonical" href="https://www.youtube.com/channel/UCwL1s6JkE1PaqBhK2HEcfTQ">`;
    expect(parseChannelId(html)).toBe("UCwL1s6JkE1PaqBhK2HEcfTQ");
  });

  it("extracts channel ID from JSON-LD data", () => {
    const html = `"channelId":"UC2D2CMWXMOVWx7giW1n3LIg"`;
    expect(parseChannelId(html)).toBe("UC2D2CMWXMOVWx7giW1n3LIg");
  });

  it("extracts channel ID from /channel/ URL", () => {
    expect(parseChannelId("https://www.youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw")).toBe("UCXuqSBlHAE6Xw-yeJA0Tunw");
  });

  it("returns null for HTML without channel ID", () => {
    expect(parseChannelId("<html><body>No channel here</body></html>")).toBeNull();
  });
});

describe("parseChannelFeed", () => {
  const sampleFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/"
      xmlns="http://www.w3.org/2005/Atom">
  <title>Huberman Lab</title>
  <entry>
    <yt:videoId>abc123def45</yt:videoId>
    <title>Episode 1</title>
    <published>2025-01-15T00:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>xyz789ghi01</yt:videoId>
    <title>Episode 2</title>
    <published>2025-01-08T00:00:00+00:00</published>
  </entry>
</feed>`;

  it("parses video IDs and titles from RSS feed", () => {
    const videos = parseChannelFeed(sampleFeed);
    expect(videos).toHaveLength(2);
    expect(videos[0]).toEqual({ videoId: "abc123def45", title: "Episode 1" });
    expect(videos[1]).toEqual({ videoId: "xyz789ghi01", title: "Episode 2" });
  });

  it("returns empty array for empty feed", () => {
    const emptyFeed = `<?xml version="1.0"?><feed></feed>`;
    expect(parseChannelFeed(emptyFeed)).toEqual([]);
  });
});
