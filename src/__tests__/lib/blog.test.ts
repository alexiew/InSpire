// ABOUTME: Tests for blog RSS feed parsing and feed type detection.
// ABOUTME: Verifies parseBlogFeed with RSS and Atom formats, and detectFeedType.

import { describe, it, expect } from "vitest";
import { parseBlogFeed, parsePageTitle } from "@/lib/blog";
import { detectFeedType } from "@/lib/podcast";

const SAMPLE_BLOG_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The Test Blog</title>
    <link>https://example.com</link>
    <item>
      <title>Third Post</title>
      <link>https://example.com/third-post</link>
      <guid>https://example.com/third-post</guid>
      <pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://example.com/second-post</link>
      <guid>https://example.com/second-post</guid>
      <pubDate>Mon, 25 Dec 2025 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>First Post</title>
      <link>https://example.com/first-post</link>
      <guid>https://example.com/first-post</guid>
      <pubDate>Mon, 18 Dec 2025 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const SAMPLE_ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Blog</title>
  <entry>
    <title>Atom Post</title>
    <link href="https://example.com/atom-post"/>
    <id>tag:example.com,2026:atom-post</id>
  </entry>
</feed>`;

describe("parseBlogFeed", () => {
  it("parses a standard RSS feed with articles", () => {
    const feed = parseBlogFeed(SAMPLE_BLOG_RSS);
    expect(feed.title).toBe("The Test Blog");
    expect(feed.articles).toHaveLength(3);
    expect(feed.articles[0]).toEqual({
      guid: "https://example.com/third-post",
      title: "Third Post",
      url: "https://example.com/third-post",
    });
    expect(feed.articles[2].title).toBe("First Post");
  });

  it("parses an Atom feed", () => {
    const feed = parseBlogFeed(SAMPLE_ATOM);
    expect(feed.title).toBe("Atom Blog");
    expect(feed.articles).toHaveLength(1);
    expect(feed.articles[0]).toEqual({
      guid: "tag:example.com,2026:atom-post",
      title: "Atom Post",
      url: "https://example.com/atom-post",
    });
  });

  it("uses link as guid fallback when guid is missing", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>No Guid Blog</title>
        <item>
          <title>Post</title>
          <link>https://example.com/post</link>
        </item>
      </channel>
    </rss>`;
    const feed = parseBlogFeed(xml);
    expect(feed.articles).toHaveLength(1);
    expect(feed.articles[0].guid).toBe("https://example.com/post");
  });

  it("returns empty articles for a feed with no items", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>Empty Blog</title>
      </channel>
    </rss>`;
    const feed = parseBlogFeed(xml);
    expect(feed.title).toBe("Empty Blog");
    expect(feed.articles).toEqual([]);
  });

  it("skips items without a link", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>Mixed Blog</title>
        <item>
          <title>Has link</title>
          <link>https://example.com/post</link>
          <guid>post-1</guid>
        </item>
        <item>
          <title>No link</title>
          <guid>post-2</guid>
        </item>
      </channel>
    </rss>`;
    const feed = parseBlogFeed(xml);
    expect(feed.articles).toHaveLength(1);
    expect(feed.articles[0].title).toBe("Has link");
  });
});

describe("parsePageTitle", () => {
  it("extracts title from standard HTML", () => {
    const html = `<html><head><title>Getting Started - OpenClaw</title></head><body></body></html>`;
    expect(parsePageTitle(html)).toBe("Getting Started - OpenClaw");
  });

  it("handles title with surrounding whitespace", () => {
    const html = `<html><head><title>  My Page  </title></head></html>`;
    expect(parsePageTitle(html)).toBe("My Page");
  });

  it("handles title spanning multiple lines", () => {
    const html = `<html><head><title>
      Multi Line Title
    </title></head></html>`;
    expect(parsePageTitle(html)).toBe("Multi Line Title");
  });

  it("returns empty string when no title tag", () => {
    const html = `<html><head></head><body>No title here</body></html>`;
    expect(parsePageTitle(html)).toBe("");
  });

  it("returns empty string for empty title tag", () => {
    const html = `<html><head><title></title></head></html>`;
    expect(parsePageTitle(html)).toBe("");
  });
});

describe("detectFeedType", () => {
  it("identifies podcast feeds (has audio enclosures)", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>Podcast</title>
        <item>
          <title>Episode 1</title>
          <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg"/>
        </item>
      </channel>
    </rss>`;
    expect(detectFeedType(xml)).toBe("podcast");
  });

  it("identifies blog feeds (no audio enclosures)", () => {
    expect(detectFeedType(SAMPLE_BLOG_RSS)).toBe("blog");
  });

  it("identifies blog feeds from Atom format", () => {
    expect(detectFeedType(SAMPLE_ATOM)).toBe("blog");
  });

  it("treats feeds with non-audio enclosures as blog", () => {
    const xml = `<rss version="2.0">
      <channel>
        <title>Blog with PDF</title>
        <item>
          <title>Report</title>
          <link>https://example.com/report</link>
          <enclosure url="https://example.com/report.pdf" type="application/pdf"/>
        </item>
      </channel>
    </rss>`;
    expect(detectFeedType(xml)).toBe("blog");
  });
});
