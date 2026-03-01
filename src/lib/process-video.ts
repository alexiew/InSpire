// ABOUTME: Orchestrates the full video processing pipeline.
// ABOUTME: Fetches metadata, transcript, and AI summary for a video.

import { getVideo, updateVideo } from "./videos";
import { fetchMetadata, fetchTranscript } from "./youtube";
import { summarize } from "./summarize";

export async function processVideo(id: string): Promise<void> {
  try {
    const video = getVideo(id);
    if (!video) {
      throw new Error(`Video ${id} not found`);
    }

    // Fetch metadata
    const metadata = await fetchMetadata(video.videoId);
    updateVideo(id, {
      title: metadata.title,
      author: metadata.author,
      thumbnailUrl: metadata.thumbnailUrl,
    });

    // Fetch transcript
    const transcript = await fetchTranscript(video.videoId);
    updateVideo(id, { transcript });

    // Summarize
    const summary = await summarize(metadata.title, transcript);
    updateVideo(id, { summary, status: "ready" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateVideo(id, { status: "error", error: message });
  }
}
