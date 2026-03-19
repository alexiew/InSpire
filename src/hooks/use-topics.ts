// ABOUTME: SWR hooks for fetching topic data from the API.
// ABOUTME: Provides useTopics (list with 5s poll) and useTopic (single with 3s poll).

import useSWR from "swr";
import type { Topic, SynthesisRecord } from "@/lib/topics";
import type { ContentItem } from "@/lib/content";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTopics() {
  return useSWR<Topic[]>("/api/topics", fetcher, {
    refreshInterval: 5000,
  });
}

export interface TopicWithItems extends Topic {
  items: ContentItem[];
  synthesisHistory: SynthesisRecord[];
}

export function useTopic(slug: string) {
  return useSWR<TopicWithItems>(`/api/topics/${slug}`, fetcher, {
    refreshInterval: 3000,
  });
}
