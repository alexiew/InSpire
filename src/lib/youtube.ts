// ABOUTME: YouTube video utilities for URL parsing, metadata, and transcript extraction.
// ABOUTME: Uses oEmbed API for metadata and youtube-transcript package for transcripts.

import { YoutubeTranscript } from "youtube-transcript";

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

export async function fetchTranscript(videoId: string): Promise<string> {
  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  return segments.map((s) => s.text).join(" ");
}
