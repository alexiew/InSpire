// ABOUTME: Filters and sorts topics for the home page topic browser.
// ABOUTME: Supports case-insensitive search and count vs alphabetical ordering.

import type { Topic } from "./topics";

export type TopicSortOrder = "count" | "alpha";

export function filterAndSortTopics(
  topics: Topic[],
  search: string,
  sort: TopicSortOrder
): Topic[] {
  const needle = search.toLowerCase().trim();
  const filtered = needle
    ? topics.filter((t) => t.name.toLowerCase().includes(needle))
    : topics;

  return [...filtered].sort((a, b) =>
    sort === "alpha"
      ? a.name.localeCompare(b.name)
      : b.contentIds.length - a.contentIds.length
  );
}
