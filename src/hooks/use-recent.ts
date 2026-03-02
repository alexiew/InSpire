// ABOUTME: SWR hook for fetching recent content items.
// ABOUTME: Polls every 3 seconds to catch processing state changes.

import useSWR from "swr";
import type { ContentItem } from "@/lib/content";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useRecent() {
  return useSWR<ContentItem[]>("/api/recent", fetcher, {
    refreshInterval: 3000,
  });
}
