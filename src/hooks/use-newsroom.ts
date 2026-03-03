// ABOUTME: SWR hook for fetching newsroom briefing data.
// ABOUTME: Returns the latest briefing and current topic velocities.

import useSWR from "swr";
import type { Briefing, TopicVelocity } from "@/lib/briefing";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface NewsroomData {
  briefing: Briefing | null;
  velocities: TopicVelocity[];
}

export function useNewsroom() {
  return useSWR<NewsroomData>("/api/newsroom", fetcher);
}
