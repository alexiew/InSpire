// ABOUTME: Tests for synthesis prompt construction.
// ABOUTME: Verifies that summaries and claims are included in synthesis prompts.

import { describe, it, expect } from "vitest";
import { buildSynthesisPrompt, buildIncrementalPrompt } from "@/lib/synthesize";

describe("buildSynthesisPrompt", () => {
  const items = [
    {
      title: "Sleep and Recovery",
      author: "Dr. Smith",
      summary: "This episode covers how sleep affects muscle recovery and cognitive performance.",
      claims: ["Sleep deprivation reduces strength by 20%", "REM sleep is critical for memory"],
    },
    {
      title: "Optimizing Rest",
      author: "Dr. Jones",
      summary: "A deep dive into rest protocols including napping, meditation, and sleep hygiene.",
      claims: ["Napping for 20 minutes boosts alertness", "Blue light disrupts melatonin"],
    },
  ];

  it("includes topic name", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain('"Sleep"');
  });

  it("includes summaries for each content item", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain("how sleep affects muscle recovery");
    expect(prompt).toContain("rest protocols including napping");
  });

  it("includes claims for each content item", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain("Sleep deprivation reduces strength by 20%");
    expect(prompt).toContain("Blue light disrupts melatonin");
  });

  it("includes author and title for attribution", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain("Sleep and Recovery");
    expect(prompt).toContain("Dr. Smith");
    expect(prompt).toContain("Optimizing Rest");
    expect(prompt).toContain("Dr. Jones");
  });

  it("handles items with no claims", () => {
    const items2 = [
      { title: "A", author: "X", summary: "Summary A", claims: [] },
      { title: "B", author: "Y", summary: "Summary B", claims: ["One claim"] },
    ];
    const prompt = buildSynthesisPrompt("Topic", items2);
    expect(prompt).toContain("Summary A");
    expect(prompt).toContain("One claim");
  });

  it("includes the content count", () => {
    const prompt = buildSynthesisPrompt("Sleep", items);
    expect(prompt).toContain("2 pieces of content");
  });
});

describe("buildIncrementalPrompt", () => {
  const previousSynthesis = "Sources agree that sleep is critical for recovery. Dr. Smith emphasizes strength impacts while Dr. Jones focuses on alertness.";

  const newItems = [
    {
      title: "Sleep and Hormones",
      author: "Dr. Lee",
      summary: "Explores how sleep regulates cortisol, testosterone, and growth hormone.",
      claims: ["Growth hormone peaks during deep sleep", "Cortisol spikes after sleep deprivation"],
    },
  ];

  it("includes the previous synthesis", () => {
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, newItems);
    expect(prompt).toContain(previousSynthesis);
  });

  it("includes only new items' summaries and claims", () => {
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, newItems);
    expect(prompt).toContain("sleep regulates cortisol");
    expect(prompt).toContain("Growth hormone peaks during deep sleep");
  });

  it("includes topic name", () => {
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, newItems);
    expect(prompt).toContain('"Sleep"');
  });

  it("includes new item count", () => {
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, newItems);
    expect(prompt).toContain("1 new source");
  });

  it("uses plural for multiple new items", () => {
    const twoItems = [
      ...newItems,
      { title: "B", author: "Y", summary: "Summary B", claims: [] },
    ];
    const prompt = buildIncrementalPrompt("Sleep", previousSynthesis, twoItems);
    expect(prompt).toContain("2 new sources");
  });
});
