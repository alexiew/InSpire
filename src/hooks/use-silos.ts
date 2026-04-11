// ABOUTME: SWR hooks for fetching silo data from the API.
// ABOUTME: Provides useSilos (list) and useSilo (detail with 3s poll for processing content).

import useSWR from "swr";
import type { SiloListItem, SiloWithItems, SiloSynthesisRecord } from "@/lib/silos";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSilos() {
  return useSWR<SiloListItem[]>("/api/silos", fetcher);
}

export interface SiloDetail extends SiloWithItems {
  synthesisHistory: SiloSynthesisRecord[];
}

export function useSilo(id: number) {
  return useSWR<SiloDetail>(`/api/silos/${id}`, fetcher, {
    refreshInterval: 3000,
  });
}
