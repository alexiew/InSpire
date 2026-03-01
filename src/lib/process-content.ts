// ABOUTME: Orchestrates the full content processing pipeline.
// ABOUTME: Fetches metadata, transcript, extracts knowledge, and rebuilds topic index.

import { getContent, updateContent } from "./content";
import { fetchMetadata, fetchTranscript } from "./youtube";
import { extract } from "./extract";
import { rebuildTopicIndex } from "./topics";

export async function processContent(id: string): Promise<void> {
  try {
    const item = getContent(id);
    if (!item) {
      throw new Error(`Content ${id} not found`);
    }

    // Fetch metadata
    const metadata = await fetchMetadata(item.sourceId);
    updateContent(id, {
      title: metadata.title,
      author: metadata.author,
      thumbnailUrl: metadata.thumbnailUrl,
    });

    // Fetch transcript
    const transcript = await fetchTranscript(item.sourceId);
    updateContent(id, { transcript });

    // Extract structured knowledge, merging with any pre-assigned topics
    const current = getContent(id);
    const result = await extract(metadata.title, transcript);
    const mergedTopics = [...new Set([...(current?.topics || []), ...result.topics])];
    updateContent(id, {
      summary: result.summary,
      topics: mergedTopics,
      claims: result.claims,
      people: result.people,
      status: "ready",
    });

    // Rebuild topic index
    rebuildTopicIndex();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateContent(id, { status: "error", error: message });
  }
}
