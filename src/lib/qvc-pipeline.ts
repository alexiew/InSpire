// ABOUTME: AI pipeline for advancing QVC items through stages.
// ABOUTME: Each stage builds on previous outputs and KB evidence to develop product opportunities.

import { callClaude } from "./claude";
import { getQvcItem, updateQvcItem, type QvcItem } from "./qvc";
import { listTopics } from "./topics";
import { getContent, listLibrary } from "./content";

function gatherKbContext(seedText: string): string {
  const items = listLibrary();
  const topics = listTopics();

  // Find content items with claims or summaries relevant to the seed
  const seedLower = seedText.toLowerCase();
  const seedWords = seedLower.split(/\s+/).filter((w) => w.length > 4);

  const relevant = items.filter((item) => {
    const text = `${item.title} ${item.summary} ${item.claims.join(" ")}`.toLowerCase();
    return seedWords.some((word) => text.includes(word));
  }).slice(0, 15);

  const topicSyntheses = topics
    .filter((t) => t.synthesis)
    .filter((t) => {
      const text = `${t.name} ${t.synthesis}`.toLowerCase();
      return seedWords.some((word) => text.includes(word));
    })
    .slice(0, 5);

  const parts: string[] = [];

  if (relevant.length > 0) {
    parts.push("## Relevant Content from Knowledge Base\n");
    for (const item of relevant) {
      parts.push(`### ${item.title}`);
      if (item.summary) parts.push(item.summary);
      if (item.claims.length > 0) {
        parts.push("Claims: " + item.claims.join("; "));
      }
      parts.push("");
    }
  }

  if (topicSyntheses.length > 0) {
    parts.push("## Topic Syntheses\n");
    for (const topic of topicSyntheses) {
      parts.push(`### ${topic.name}`);
      parts.push(topic.synthesis!);
      parts.push("");
    }
  }

  return parts.join("\n");
}

async function advanceToResearch(item: QvcItem): Promise<void> {
  const kbContext = gatherKbContext(item.seedText);

  const prompt = `You are a product research analyst. Given the following insight and supporting evidence from a knowledge base, compile a thorough research brief.

## Seed Insight
${item.seedText}

${kbContext}

Your task:
1. Identify the key claims and evidence that support this insight
2. Note any contradictions or caveats in the evidence
3. Identify the target audience who would care about this
4. List existing products or solutions in this space
5. Highlight what makes this angle unique or underserved

Write a structured research brief in markdown. Be specific and cite the evidence above.`;

  const research = await callClaude(prompt);
  updateQvcItem(item.id, { research, status: "researching" });
}

async function advanceToAngle(item: QvcItem): Promise<void> {
  const prompt = `You are a product strategist specializing in finding unique market angles. Based on the research below, develop a compelling product angle.

## Original Insight
${item.seedText}

## Research Brief
${item.research}

Your task:
1. Identify the unique angle — what's the non-obvious insight that gives a competitive edge?
2. Frame the problem this solves in a way that resonates emotionally
3. Define the core value proposition in one sentence
4. Identify 2-3 positioning options (premium, accessible, scientific authority, etc.)
5. Note timing advantages — why is NOW the right moment for this?

Write a clear, structured angle document in markdown. Be bold and specific — generic angles are worthless.`;

  const angle = await callClaude(prompt);
  updateQvcItem(item.id, { angle, status: "drafting" });
}

async function advanceToStrategy(item: QvcItem): Promise<void> {
  const prompt = `You are a marketing strategist. Based on the angle and research below, develop a go-to-market strategy.

## Original Insight
${item.seedText}

## Research Brief
${item.research}

## Product Angle
${item.angle}

Your task:
1. Define the target customer persona (demographics, psychographics, pain points)
2. Outline the marketing narrative — the story arc from problem to solution
3. Identify the top 3 channels to reach this audience
4. Suggest pricing positioning and model
5. Define key differentiators vs. existing alternatives
6. Outline a launch sequence (what happens first, second, third)

Write a structured strategy document in markdown. Be concrete — no hand-waving.`;

  const strategy = await callClaude(prompt);
  updateQvcItem(item.id, { strategy });
}

async function advanceToBrief(item: QvcItem): Promise<void> {
  const prompt = `You are a creative director preparing a product brief that will be used to generate landing pages, ad copy, and sales materials. Synthesize everything below into a final structured brief.

## Original Insight
${item.seedText}

## Research Brief
${item.research}

## Product Angle
${item.angle}

## Marketing Strategy
${item.strategy}

Create a comprehensive product brief in markdown with these sections:

1. **Product Name Suggestions** — 3-5 options with rationale
2. **One-Line Pitch** — the elevator pitch
3. **Problem Statement** — the pain point in the customer's own words
4. **Solution** — what the product does and why it works
5. **Key Claims** — 5-7 specific, evidence-backed claims to use in marketing
6. **Audience Profile** — who this is for, in vivid detail
7. **Tone & Voice** — how the brand should sound
8. **Landing Page Structure** — section-by-section outline with copy direction for each
9. **Objection Handling** — top 3-5 objections and how to address them
10. **Call to Action** — the primary CTA and supporting CTAs

This brief should be detailed enough that a designer or AI can produce a complete landing page from it.`;

  const brief = await callClaude(prompt);
  updateQvcItem(item.id, { brief, status: "complete" });
}

export async function advanceQvcItem(id: number): Promise<QvcItem> {
  const item = getQvcItem(id);
  if (!item) throw new Error(`QVC item ${id} not found`);

  if (item.status === "seed") {
    await advanceToResearch(item);
  } else if (item.status === "researching" && !item.angle) {
    await advanceToAngle(item);
  } else if (item.status === "drafting" && !item.strategy) {
    await advanceToStrategy(item);
  } else if (item.status === "drafting" && !item.brief) {
    await advanceToBrief(item);
  } else {
    throw new Error(`QVC item ${id} is already complete`);
  }

  return getQvcItem(id)!;
}

export async function generateTopicOpportunities(topicSlug: string): Promise<number> {
  const topics = listTopics();
  const topic = topics.find((t) => t.slug === topicSlug);
  if (!topic) throw new Error(`Topic ${topicSlug} not found`);
  if (!topic.synthesis) throw new Error(`Topic ${topic.name} has no synthesis`);

  const { createQvcItem } = await import("./qvc");

  const item = createQvcItem({
    seedText: topic.synthesis,
    sourceType: "topic",
    sourceId: topicSlug,
    title: topic.name,
  });

  return item.id;
}
