// ABOUTME: Podcast RSS feed parsing and transcript extraction.
// ABOUTME: Provides feed parsing, fetching, and audio transcription via summarize CLI.

import { execFile } from "child_process";

export interface PodcastEpisode {
  guid: string;
  title: string;
  enclosureUrl: string;
}

export interface PodcastFeed {
  title: string;
  imageUrl: string;
  episodes: PodcastEpisode[];
}

export function parsePodcastFeed(xml: string): PodcastFeed {
  // Extract feed title (first <title> in the channel, before any <item>)
  const channelContent = xml.replace(/<item>[\s\S]*$/m, "");
  const titleMatch = channelContent.match(/<title>([\s\S]*?)<\/title>/);
  const title = titleMatch?.[1]?.trim() || "";

  // Extract image: prefer itunes:image, fall back to <image><url>
  const itunesImageMatch = xml.match(/<itunes:image[^>]+href="([^"]+)"/);
  const imageUrlMatch = channelContent.match(/<image>\s*<url>([\s\S]*?)<\/url>/);
  const imageUrl = itunesImageMatch?.[1] || imageUrlMatch?.[1]?.trim() || "";

  // Parse episodes from <item> blocks
  const episodes: PodcastEpisode[] = [];
  const itemRegex = /<item>[\s\S]*?<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[0];

    const enclosureMatch = item.match(/<enclosure[^>]+url="([^"]+)"/);
    if (!enclosureMatch) continue;

    const itemTitleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
    const guidMatch = item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);

    episodes.push({
      guid: guidMatch?.[1]?.trim() || enclosureMatch[1],
      title: itemTitleMatch?.[1]?.trim() || "",
      enclosureUrl: enclosureMatch[1],
    });
  }

  return { title, imageUrl, episodes };
}

export async function fetchPodcastFeed(feedUrl: string): Promise<PodcastFeed> {
  const res = await fetch(feedUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch podcast feed: ${res.status}`);
  }
  const xml = await res.text();

  if (!/<rss|<feed/i.test(xml)) {
    throw new Error("URL does not appear to be a podcast RSS feed");
  }

  return parsePodcastFeed(xml);
}

export type FeedType = "podcast" | "blog";

export function detectFeedType(xml: string): FeedType {
  // Podcast feeds have <enclosure> elements with audio MIME types
  const hasAudioEnclosure = /<enclosure[^>]+type="audio\//i.test(xml);
  return hasAudioEnclosure ? "podcast" : "blog";
}

export function fetchPodcastTranscript(audioUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "summarize",
      [audioUrl, "--extract"],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        const transcript = stdout.trim();
        if (!transcript) {
          reject(new Error("Empty transcript returned"));
          return;
        }
        resolve(transcript);
      }
    );
  });
}
