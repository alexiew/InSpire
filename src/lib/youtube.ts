// ABOUTME: YouTube video utilities for URL parsing, metadata, and transcript extraction.
// ABOUTME: Uses oEmbed API for metadata and summarize CLI for transcripts.

import { execFile } from "child_process";

export function extractVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    // youtube.com/watch?v=ID
    /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
    // youtu.be/ID
    /(?:youtu\.be\/)([\w-]{11})/,
    // youtube.com/embed/ID
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    // youtube.com/shorts/ID
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export interface VideoMetadata {
  title: string;
  author: string;
  thumbnailUrl: string;
}

export async function fetchMetadata(videoId: string): Promise<VideoMetadata> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(oembedUrl);
  if (!res.ok) {
    throw new Error(`oEmbed request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return {
    title: data.title,
    author: data.author_name,
    thumbnailUrl: data.thumbnail_url,
  };
}

export function parseChannelId(text: string): string | null {
  // Match /channel/UC... in URLs or canonical links
  const channelUrlMatch = text.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (channelUrlMatch) return channelUrlMatch[1];

  // Match "channelId":"UC..." in JSON data embedded in page
  const jsonMatch = text.match(/"channelId":"(UC[\w-]{22})"/);
  if (jsonMatch) return jsonMatch[1];

  return null;
}

export interface ChannelVideo {
  videoId: string;
  title: string;
}

export function parseChannelFeed(xml: string): ChannelVideo[] {
  const videos: ChannelVideo[] = [];
  const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[0];
    const videoIdMatch = entry.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);

    if (videoIdMatch && titleMatch) {
      videos.push({
        videoId: videoIdMatch[1],
        title: titleMatch[1].trim(),
      });
    }
  }

  return videos;
}

export async function resolveChannelId(url: string): Promise<{ channelId: string; name: string }> {
  // Direct /channel/ URL — extract ID directly
  const directMatch = url.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (directMatch) {
    // Fetch page to get the channel name
    const res = await fetch(url);
    const html = await res.text();
    const nameMatch = html.match(/<title>([\s\S]*?)(?:\s*-\s*YouTube)?<\/title>/);
    return { channelId: directMatch[1], name: nameMatch?.[1]?.trim() || directMatch[1] };
  }

  // For @handle, /c/name, etc. — fetch the page and parse
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch channel page: ${res.status}`);
  const html = await res.text();

  const channelId = parseChannelId(html);
  if (!channelId) throw new Error("Could not find channel ID in page");

  const nameMatch = html.match(/<title>([\s\S]*?)(?:\s*-\s*YouTube)?<\/title>/);
  const name = nameMatch?.[1]?.trim() || channelId;

  return { channelId, name };
}

export async function fetchChannelVideos(channelId: string): Promise<ChannelVideo[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`Failed to fetch channel feed: ${res.status}`);
  const xml = await res.text();
  return parseChannelFeed(xml);
}

export function fetchTranscript(videoId: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  return new Promise((resolve, reject) => {
    execFile(
      "summarize",
      [url, "--youtube", "auto", "--extract"],
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
