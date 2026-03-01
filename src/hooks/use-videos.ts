// ABOUTME: SWR hooks for fetching video data from the API.
// ABOUTME: Provides useVideos (list with 5s poll) and useVideo (single with 3s poll).

import useSWR from "swr";
import type { Video } from "@/lib/videos";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useVideos() {
  return useSWR<Video[]>("/api/videos", fetcher, {
    refreshInterval: 5000,
  });
}

export function useVideo(id: string) {
  return useSWR<Video>(`/api/videos/${id}`, fetcher, {
    refreshInterval: 3000,
  });
}
