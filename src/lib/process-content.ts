// ABOUTME: Orchestrates the full content processing pipeline.
// ABOUTME: Fetches metadata, transcript, extracts knowledge, and rebuilds topic index.

import { getContent, updateContent } from "./content";
import { fetchMetadata, fetchTranscript } from "./youtube";
import { fetchPodcastTranscript } from "./podcast";
import { fetchArticleText, fetchPageTitle } from "./blog";
import { extract, filterAuthor } from "./extract";
import { listTopics, rebuildTopicIndex } from "./topics";

interface ProcessOptions {
  minTranscriptWords?: number;
}

export async function processContent(id: string, options?: ProcessOptions): Promise<void> {
  try {
    const item = getContent(id);
    if (!item) {
      throw new Error(`Content ${id} not found`);
    }

    // Fetch metadata (YouTube via oEmbed, blog via HTML title tag)
    // Podcast metadata is set at creation time from the RSS feed.
    if (item.sourceType === "youtube") {
      const metadata = await fetchMetadata(item.sourceId);
      updateContent(id, {
        title: metadata.title,
        author: metadata.author,
        thumbnailUrl: metadata.thumbnailUrl,
      });
    } else if (item.sourceType === "blog" && !item.title) {
      const title = await fetchPageTitle(item.url);
      if (title) {
        updateContent(id, { title });
      }
    }

    // Fetch transcript / article text (skip if already provided)
    let transcript = item.transcript;
    if (!transcript) {
      if (item.sourceType === "podcast") {
        transcript = await fetchPodcastTranscript(item.url);
      } else if (item.sourceType === "blog") {
        transcript = await fetchArticleText(item.url);
      } else {
        transcript = await fetchTranscript(item.sourceId);
      }
      updateContent(id, { transcript });
    }

    // Auto-discard if transcript is too short (subscription filter)
    const minWords = options?.minTranscriptWords ?? 0;
    if (minWords > 0) {
      const wordCount = transcript.split(/\s+/).filter(Boolean).length;
      if (wordCount < minWords) {
        updateContent(id, { status: "discarded" });
        return;
      }
    }

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
