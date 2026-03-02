// ABOUTME: SWR hook for fetching journal entries from the API.
// ABOUTME: Provides useJournal for the journal page.

import useSWR from "swr";
import type { JournalEntry } from "@/lib/journal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useJournal() {
  return useSWR<JournalEntry[]>("/api/journal", fetcher);
}
