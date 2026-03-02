// ABOUTME: SWR hook for fetching the library of accepted content.
// ABOUTME: Supports optional search query parameter.

import useSWR from "swr";
import type { ContentItem } from "@/lib/content";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useLibrary(search?: string) {
  const key = search ? `/api/library?q=${encodeURIComponent(search)}` : "/api/library";
  return useSWR<ContentItem[]>(key, fetcher);
}
