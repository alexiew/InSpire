// ABOUTME: SWR hooks for QVC item data fetching.
// ABOUTME: Provides list and single-item hooks with auto-refresh.

import useSWR from "swr";
import type { QvcItem } from "@/lib/qvc";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useQvcItems() {
  return useSWR<QvcItem[]>("/api/qvc", fetcher);
}

export function useQvcItem(id: number) {
  return useSWR<QvcItem>(`/api/qvc/${id}`, fetcher, {
    refreshInterval: 3000,
  });
}
