// ABOUTME: Tests for podcast RSS feed parsing and URL detection.
// ABOUTME: Verifies parsePodcastFeed with various RSS formats and isYouTubeUrl.

import { describe, it, expect } from "vitest";
import { parsePodcastFeed } from "@/lib/podcast";
import { isYouTubeUrl } from "@/lib/youtube";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>The Test Podcast</title>
    <itunes:image href="https://example.com/artwork.jpg"/>
    <item>
      <title>Episode 3: Latest</title>
      <guid>ep-003</guid>
      <enclosure url="https://example.com/ep3.mp3" type="audio/mpeg" length="12345678"/>
      <pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Episode 2: Middle</title>
      <guid>ep-002</guid>
      <enclosure url="https://example.com/ep2.mp3" type="audio/mpeg" length="12345678"/>
      <pubDate>Mon, 25 Dec 2025 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Episode 1: First</title>
      <guid>ep-001</guid>
      <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg" length="12345678"/>
      <pubDate>Mon, 18 Dec 2025 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe("parsePodcastFeed", () => {
  it("parses a standard RSS feed with episodes", () => {
    const feed = parsePodcastFeed(SAMPLE_RSS);
    expect(feed.title).toBe("The Test Podcast");
    expect(feed.imageUrl).toBe("https://example.com/artwork.jpg");
    expect(feed.episodes).toHaveLength(3);
    expect(feed.episodes[0]).toEqual({
      guid: "ep-003",
      title: "Episode 3: Latest",
      enclosureUrl: "https://example.com/ep3.mp3",
    });
    expect(feed.episodes[2].guid).toBe("ep-001");
  });

  it("falls back to enclosure URL when guid is missing", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>No Guid Pod</title>
        <item>
          <title>Ep 1</title>
          <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg"/>
        </item>
      </channel>
    </rss>`;
    const feed = parsePodcastFeed(xml);
    expect(feed.episodes).toHaveLength(1);
    expect(feed.episodes[0].guid).toBe("https://example.com/ep1.mp3");
  });

  it("uses image/url fallback when itunes:image is missing", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>Fallback Image Pod</title>
        <image><url>https://example.com/fallback.jpg</url></image>
        <item>
          <title>Ep 1</title>
          <guid>ep-001</guid>
          <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg"/>
        </item>
      </channel>
    </rss>`;
    const feed = parsePodcastFeed(xml);
    expect(feed.imageUrl).toBe("https://example.com/fallback.jpg");
  });

  it("returns empty imageUrl when no image is present", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>No Image Pod</title>
        <item>
          <title>Ep 1</title>
          <guid>ep-001</guid>
          <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg"/>
        </item>
      </channel>
    </rss>`;
    const feed = parsePodcastFeed(xml);
    expect(feed.imageUrl).toBe("");
  });

  it("returns empty episodes for a feed with no items", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>Empty Pod</title>
      </channel>
    </rss>`;
    const feed = parsePodcastFeed(xml);
    expect(feed.title).toBe("Empty Pod");
    expect(feed.episodes).toEqual([]);
  });

  it("skips items without an enclosure", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>Mixed Pod</title>
        <item>
          <title>Has audio</title>
          <guid>ep-001</guid>
          <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg"/>
        </item>
        <item>
          <title>No audio</title>
          <guid>ep-002</guid>
        </item>
      </channel>
    </rss>`;
    const feed = parsePodcastFeed(xml);
    expect(feed.episodes).toHaveLength(1);
    expect(feed.episodes[0].title).toBe("Has audio");
  });
});

describe("isYouTubeUrl", () => {
  it("detects youtube.com URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/@hubermanlab")).toBe(true);
    expect(isYouTubeUrl("https://youtube.com/channel/UC1234567890abcdefghij")).toBe(true);
  });

  it("detects youtu.be URLs", () => {
    expect(isYouTubeUrl("https://youtu.be/abc123")).toBe(true);
  });

  it("returns false for podcast URLs", () => {
    expect(isYouTubeUrl("https://feeds.simplecast.com/abc123")).toBe(false);
    expect(isYouTubeUrl("https://example.com/feed.xml")).toBe(false);
  });
});
