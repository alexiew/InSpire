// ABOUTME: Tests for topic filtering and sorting utility.
// ABOUTME: Covers search filtering, alphabetical sort, count sort, and combinations.

import { describe, it, expect } from "vitest";
import { filterAndSortTopics } from "@/lib/filter-topics";
import type { Topic } from "@/lib/topics";

function makeTopic(name: string, count: number): Topic {
  return {
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    contentIds: Array.from({ length: count }, (_, i) => `id-${i}`),
  };
}

const topics: Topic[] = [
  makeTopic("dopamine", 3),
  makeTopic("addiction", 2),
  makeTopic("cold exposure", 1),
  makeTopic("neuroplasticity", 3),
  makeTopic("willpower", 1),
];

describe("filterAndSortTopics", () => {
  it("returns all topics when search is empty", () => {
    const result = filterAndSortTopics(topics, "", "count");
    expect(result).toHaveLength(5);
  });

  it("filters by case-insensitive substring match", () => {
    const result = filterAndSortTopics(topics, "dop", "count");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("dopamine");
  });

  it("filters case-insensitively", () => {
    const result = filterAndSortTopics(topics, "COLD", "count");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("cold exposure");
  });

  it("sorts by content count descending", () => {
    const result = filterAndSortTopics(topics, "", "count");
    const counts = result.map((t) => t.contentIds.length);
    expect(counts).toEqual([3, 3, 2, 1, 1]);
  });

  it("sorts alphabetically", () => {
    const result = filterAndSortTopics(topics, "", "alpha");
    const names = result.map((t) => t.name);
    expect(names).toEqual([
      "addiction",
      "cold exposure",
      "dopamine",
      "neuroplasticity",
      "willpower",
    ]);
  });

  it("filters and sorts together", () => {
    const result = filterAndSortTopics(topics, "a", "alpha");
    const names = result.map((t) => t.name);
    expect(names).toEqual(["addiction", "dopamine", "neuroplasticity"]);
  });

  it("returns empty array when no matches", () => {
    const result = filterAndSortTopics(topics, "zzz", "count");
    expect(result).toEqual([]);
  });

  it("handles whitespace-only search as empty", () => {
    const result = filterAndSortTopics(topics, "   ", "count");
    expect(result).toHaveLength(5);
  });
});
