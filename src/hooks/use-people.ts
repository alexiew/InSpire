// ABOUTME: SWR hooks for fetching people data from the API.
// ABOUTME: Provides usePeople (list with 5s poll) and usePerson (single with 3s poll).

import useSWR from "swr";
import type { Person } from "@/lib/people";
import type { ContentItem } from "@/lib/content";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePeople() {
  return useSWR<Person[]>("/api/people", fetcher, {
    refreshInterval: 5000,
  });
}

export interface PersonWithItems extends Person {
  items: ContentItem[];
}

export function usePerson(slug: string) {
  return useSWR<PersonWithItems>(`/api/people/${slug}`, fetcher, {
    refreshInterval: 3000,
  });
}
