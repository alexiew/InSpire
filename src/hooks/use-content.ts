// ABOUTME: SWR hooks for fetching content data from the API.
// ABOUTME: Provides useContent (list with 5s poll) and useContentItem (single with 3s poll).

import useSWR from "swr";
import type { ContentItem } from "@/lib/content";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useContent() {
  return useSWR<ContentItem[]>("/api/content", fetcher, {
    refreshInterval: 5000,
  });
}

export function useContentItem(id: string) {
  return useSWR<ContentItem>(`/api/content/${id}`, fetcher, {
    refreshInterval: 3000,
  });
}
