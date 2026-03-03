// ABOUTME: Orchestrates the full content processing pipeline.
// ABOUTME: Fetches metadata, transcript, extracts knowledge, and rebuilds topic index.

import { getContent, updateContent } from "./content";
import { fetchMetadata, fetchTranscript } from "./youtube";
import { fetchPodcastTranscript } from "./podcast";
import { extract, filterAuthor } from "./extract";
import { listTopics, rebuildTopicIndex } from "./topics";

export async function processContent(id: string): Promise<void> {
  try {
    const item = getContent(id);
    if (!item) {
      throw new Error(`Content ${id} not found`);
    }

    // Fetch metadata (YouTube only — podcast metadata is set at creation time)
    if (item.sourceType === "youtube") {
      const metadata = await fetchMetadata(item.sourceId);
      updateContent(id, {
        title: metadata.title,
        author: metadata.author,
        thumbnailUrl: metadata.thumbnailUrl,
      });
    }

    // Fetch transcript
    const transcript = item.sourceType === "podcast"
      ? await fetchPodcastTranscript(item.url)
      : await fetchTranscript(item.sourceId);
    updateContent(id, { transcript });

    // Extract structured knowledge, merging with any pre-assigned topics
    const current = getContent(id);
    const existingTopicNames = listTopics().map((t) => t.name);
    const hints = current!.extractionHints || undefined;
    const result = await extract(current!.title, transcript, existingTopicNames, hints);
    const mergedTopics = [...new Set([...(current?.topics || []), ...result.topics])];
    const people = filterAuthor(result.people, current!.author);
    updateContent(id, {
      summary: result.summary,
      topics: mergedTopics,
      claims: result.claims,
      people,
      status: "ready",
    });

    // Rebuild topic index
    rebuildTopicIndex();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateContent(id, { status: "error", error: message });
  }
}
